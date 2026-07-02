# Lobby Settings And Lobby View Guide

Last Updated: 2026-05-24 (Asia/Jakarta)
Owner: Product / Engineering FOM Play
UI Language: English
Status: Production behavior guide

## 1. Purpose

This document explains how FOM Play lobby creation, lobby settings, lobby detail view, participant management, and host finance tracking work after the Host Finance update.

In the codebase, the product-facing term is `Room`, but the user-facing concept can be understood as a match lobby.

Primary files:
- `src/features/rooms/RoomEditorScreen.tsx`
- `src/features/rooms/RoomDetailScreen.tsx`
- `src/features/rooms/RoomMatchSetupScreen.tsx`
- `src/features/rooms/RoomListScreen.tsx`
- `src/features/rooms/roomFinance.ts`
- `src/features/rooms/roomFinanceRepository.ts`
- `src/features/rooms/roomRepository.ts`
- `firestore.rules`

## 2. Lobby Creation Flow

Lobby creation uses a four-step wizard.

### Step 1: Room Details

Host configures the public identity and access model.

Fields:
- Room Name
- Description
- Who Can Join
- Player Slots

Visibility options:
- Private: hidden from discovery, join by direct share only.
- Friends: visible to FOM friends.
- Public: listed in public room discovery.

Player Slots controls the maximum number of joined participants. The host is included in the joined count.

Validation:
- Room Name is required.
- Player Slots must be at least the minimum lobby requirement, currently 4.

### Step 2: Time And Venue

Host configures when and where the match will happen.

Fields:
- Date
- Time
- Venue / Court Name
- City / Area

Validation:
- Date is required.
- Time is required.
- Venue / Court Name is required.
- City / Area is optional but recommended because it improves room cards and share copy.

### Step 3: Pricing

Host configures public pricing and private cost tracking.

Fields:
- Pricing toggle
- Number of Courts
- Court Cost / Court
- Ball Cost
- Public Price / External Player
- Include Host in Friend Split toggle

Money inputs use Indonesian Rupiah-style grouping while typing. Example: `300000` becomes `300.000`.

When pricing is disabled:
- Room list shows `No fee`.
- Room detail shows `No fee`.
- Host sees a Payment Tracking prompt that can reopen pricing settings.

When pricing is enabled:
- Public players see only the external public price.
- Host gets private finance tracking.
- Joined players can see only their own amount due.

Validation:
- Number of Courts must be at least 1.
- Court Cost / Court must be greater than 0.
- Public Price / External Player must be greater than 0.
- Ball Cost can be 0.

### Step 4: Invite Friends

Host can optionally add players before creating the lobby.

Options:
- Choose from friend list.
- Add manual participant.
- Skip invites and share the lobby link after creation.

Creating the room saves:
- public room document
- public pricing metadata
- private host finance document if pricing is enabled
- participant finance rows if pricing is enabled

## 3. Public Lobby List

The lobby list has two surfaces:
- Hosted by you
- Public rooms

Room cards show:
- title
- schedule
- venue / area
- public price or `No fee`
- joined player count
- open slot count

Important visibility rule:
- The card shows only the external public price.
- Friend price, host cost, profit/loss, and payment status are never shown in the list.

## 4. Lobby Detail View

Lobby detail is role-aware. The same screen changes behavior depending on whether the viewer is host, joined player, or non-joined viewer.

### 4.1 Header

The header shows:
- room status
- title
- description
- date
- time
- venue / area
- public fee label
- joined count
- open slots
- minimum player requirement

The status badge can show:
- Scheduled
- Open
- In Progress
- Completed
- Cancelled

### 4.2 Main CTA

For host:
- If match setup is missing, CTA is `Configure Match Setup`.
- If setup is configured and minimum players have joined, CTA starts the match setup.
- If minimum players are missing, CTA shows how many more players are needed.

For non-host:
- If not logged in, CTA is `Login to Join`.
- If eligible, CTA is `Join Room`.
- If joined before match starts, CTA is `Leave Room`.
- If full or unavailable, CTA is disabled.

### 4.3 Room Access Panel

Shows the selected visibility:
- Private
- Friends
- Public

This panel is informational for players. Host can edit access from Host Tools.

### 4.4 Match Setup Panel

Shows whether match setup has been configured.

If setup exists, the panel shows:
- match format
- number of rounds
- number of courts

Host can open setup while the lobby is still scheduled.

## 5. Host Tools In Lobby Detail

Host sees a `Host Tools` panel.

Actions:
- Edit Room
- Add Player
- Add From Friends

### 5.1 Edit Room

Host can edit:
- Room Name
- Description
- Visibility
- Date
- Time
- Venue
- Area
- Player Slots
- Pricing toggle
- Number of Courts
- Court Cost / Court
- Ball Cost
- Public Price / External Player
- Include Host in Friend Split

Saving room edits updates the selected room in UI and persists changes to Firestore.

If pricing is enabled during edit:
- private finance settings are created or updated
- participant finance rows are recalculated
- host finance summary updates immediately

If pricing is disabled during edit:
- public price is removed
- host finance panel and payment tracking controls are hidden
- old private finance docs may remain for historical safety, but UI no longer uses them while pricing is off

### 5.2 Add Player

Host can add a manual player from lobby detail.

Default behavior:
- player is added as `joined`
- lobby capacity updates
- if pricing is enabled, participant finance is recalculated
- if the player is not the host, host can remove them later

### 5.3 Add From Friends

Host can add a FOM friend from lobby detail.

Friend picker hides friends who are already in the lobby.

Default behavior:
- selected friend is added as `joined`
- if pricing is enabled, finance recalculates
- default finance type is External unless host changes it to Friend

### 5.4 Remove Player

Host can remove joined players from the participants list.

Rules:
- host cannot remove themself
- removed player is deleted from the room participants array
- if pricing is enabled, participant finance recalculates
- capacity and open slot counts update immediately

## 6. Payment Tracking

Payment tracking appears only when pricing is enabled.

### 6.1 Host View

Host sees:
- Host Finance panel
- Payment Tracking list

Each player row includes:
- player name
- amount due
- row index
- External / Friend selector
- Unpaid / Paid selector

Host can update player type and payment status during:
- scheduled lobby
- active match
- completed match

### 6.2 Player View

Joined non-host player sees only their own payment panel.

Fields:
- amount due
- payment status

The player does not see:
- other players' amounts
- player type mapping
- host total cost
- host profit or loss

### 6.3 Pricing Off State

If pricing is off, host sees:
- `Payment Tracking`
- `Pricing is off`
- `Edit Pricing`

This gives the host a direct way to turn pricing on after the lobby was created.

## 7. Finance Calculation Rules

### 7.1 Total Cost

```text
totalCourtCost = courtCostPerCourt x courtCount
totalCost = totalCourtCost + ballCost
```

Example:

```text
Court Cost / Court = Rp300.000
Number of Courts   = 2
Ball Cost          = Rp90.000

totalCourtCost = Rp300.000 x 2
               = Rp600.000

totalCost      = Rp600.000 + Rp90.000
               = Rp690.000
```

### 7.2 External Player Amount

External players pay the public price.

```text
externalAmountDue = publicPrice
```

Example:

```text
publicPrice = Rp100.000
externalAmountDue = Rp100.000
```

### 7.3 Friend Player Amount

Friend players pay a cost-share amount.

```text
friendAmountDue = ceil(totalCost / friendSplitParticipantCount)
```

`friendSplitParticipantCount` depends on the host split toggle.

If `Include Host in Friend Split` is on:
- host is included in the denominator
- host still does not count as host revenue

If `Include Host in Friend Split` is off:
- host is excluded from the denominator
- host amount due is 0

### 7.4 Host Share And Revenue

Host payment is never counted as revenue.

That means:
- if host is included in friend split, friend amounts may go down
- projected and realized revenue still exclude the host
- profit/loss is based on non-host money collected or expected

### 7.5 Projected P/L

Projected P/L means expected result if all current non-host participants pay their current amount due.

```text
projectedRevenue = sum(amountDue for non-host participants)
projectedPL      = projectedRevenue - totalCost
```

Positive value is profit. Negative value is loss.

### 7.6 Realized P/L

Realized P/L means current result based only on paid non-host participants.

```text
realizedRevenue = sum(amountDue for non-host participants where status == Paid)
realizedPL      = realizedRevenue - totalCost
```

Positive value is profit. Negative value is loss.

## 8. Active And Completed Match Behavior

Host can still add players while the match is active through the active match flow.

When an active match player is added:
- they are synced into room participants
- finance rows are recalculated
- new player defaults to External
- host can later switch them to Friend

When a player is switched to Friend:
- Friend Amount Due recalculates for all Friend players
- External player amounts remain fixed
- Paid/Unpaid statuses are preserved

After match completion:
- host can still update External/Friend
- host can still update Paid/Unpaid
- finance summary can still refresh
- snapshot data remains ready for weekly, monthly, and per-match reporting

## 9. Data Model

### 9.1 Public Room Document

Path:

```text
rooms/{roomId}
```

Contains public-safe fields:
- title
- description
- hostUid
- hostDisplayName
- status
- visibility
- scheduledFor
- settings
- participants
- minPlayers
- maxPlayers
- pricing
- legacy `feeEnabled`
- legacy `feeAmount`

`pricing` is public-safe:

```ts
{
  enabled: boolean;
  publicPrice: number;
  currency: 'IDR';
  version: 1;
}
```

Do not store private host cost or profit/loss directly in this document.

### 9.2 Private Finance Document

Path:

```text
rooms/{roomId}/finance/private
```

Host-only document:

```ts
{
  roomId: string;
  hostUid: string;
  enabled: boolean;
  currency: 'IDR';
  courtCostPerCourt: number;
  courtCount: number;
  ballCost: number;
  totalCourtCost: number;
  totalCost: number;
  publicPrice: number;
  includeHostInFriendSplit: boolean;
  lastCalculatedAt?: number;
}
```

### 9.3 Participant Finance Documents

Path:

```text
rooms/{roomId}/participant_finance/{participantId}
```

Host can read/write all participant finance docs.

Participant can read only their own doc.

```ts
{
  roomId: string;
  participantId: string;
  uid?: string;
  displayName: string;
  playerType: 'external' | 'friend';
  paymentStatus: 'unpaid' | 'paid';
  amountDue: number;
  paidAt?: number;
  markedPaidBy?: string;
  lastCalculatedAt?: number;
}
```

### 9.4 Host Finance Snapshot

Path:

```text
users/{hostUid}/finance_match_snapshots/{roomId}
```

This host-owned snapshot supports future reports:
- per match
- weekly
- monthly
- custom date range

## 10. Security Rules

Security boundaries:
- Public room document can expose only public-safe room and pricing fields.
- Private finance document is host-only.
- Participant finance docs are host-write.
- Participants can read only their own finance doc.
- Host snapshots are readable and writable only by that host.

Important rule intent:
- players should never read another player's friend price or paid status
- public viewers should never read host cost or profit/loss
- host can continue managing finance after match completion

## 11. Current Limitations

Current MVP does not include:
- payment gateway
- automatic payment verification
- refund handling
- discount or voucher handling
- hourly court duration pricing
- finance dashboard UI for weekly/monthly reports

The data model already prepares for weekly, monthly, and per-match reporting through host finance snapshots.

## 12. QA Checklist

Before release, verify:
- Host can create room with pricing off.
- Host can create room with pricing on.
- Public lobby list shows only external public price.
- Public lobby list shows `No fee` when pricing is off.
- Host can edit room detail after creation.
- Host can enable pricing from a no-fee lobby.
- Host can change Court Cost / Court, Number of Courts, Ball Cost, Public Price.
- Host can toggle Include Host in Friend Split.
- Host can add a manual player from lobby detail.
- Host can add a friend from lobby detail.
- Host can remove non-host players.
- Host cannot remove themself.
- Host can mark a player External or Friend.
- Host can mark a player Paid or Unpaid.
- Friend amount recalculates when roster changes.
- Projected P/L excludes host revenue.
- Realized P/L only counts paid non-host participants.
- Non-host joined player sees only their own amount due.
- Non-host player cannot see host finance.

