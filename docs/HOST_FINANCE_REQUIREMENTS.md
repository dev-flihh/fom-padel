# Host Finance Requirements

Last Updated: 2026-05-24 (Asia/Jakarta)
Owner: Product / Engineering FOM Play
Status: Proposal for approval before development
UI Language: English

## 1. Purpose

This document defines the product requirements, UX flow, data model proposal, security boundary, and implementation phases for Host Finance in FOM Play Rooms.

The feature helps a room host:
- set court and ball costs before a match
- set a public price for external players
- mark joined players as External or Friend
- track who has paid
- understand whether a room or match is currently at a loss, break-even, or profit
- support future weekly, monthly, and per-match finance reporting

## 2. Product Goals

Host Finance should feel like lightweight payment tracking, not accounting software.

Goals:
- Make the public room price clear before a player joins.
- Keep host profit/loss private.
- Let each player see only their own amount due.
- Let host change a player type from External to Friend.
- Let host mark players as Paid or Unpaid.
- Preserve an updatable finance snapshot for reporting after the match is active or completed.
- Keep the data model ready for weekly, monthly, and per-match reports.

## 3. Non Goals For MVP

The first version does not need:
- payment gateway integration
- automatic bank transfer verification
- split payment links
- refunds
- discount codes
- multi-currency support
- tax or invoice handling
- player-side self-marking as paid
- financial-grade audit guarantees

## 4. Core Terms

UI labels must use English.

- Public Price: the price shown to external players in room discovery and room detail.
- External Player: a player charged the public price.
- Friend Player: a player charged a cost-share price without host margin.
- Total Cost: court cost plus ball cost.
- Amount Due: the amount a specific player should pay.
- Paid: host has confirmed the player has transferred or covered their amount.
- Unpaid: player still owes their amount.
- Projected P/L: expected profit or loss if all current players pay.
- Realized P/L: current profit or loss based on paid or covered amounts.
- Finance Snapshot: host-owned reporting summary saved after the match is active or completed, and refreshed when host edits finance details.

## 5. Roles And Visibility

### 5.1 Public Viewer

Can see:
- room title
- schedule
- venue
- joined capacity
- Public Price

Cannot see:
- court cost
- ball cost
- player type mapping
- paid or unpaid status
- host profit/loss
- finance snapshot

### 5.2 Joined Player

Can see:
- room public information
- their own Amount Due
- their own payment status

Cannot see:
- another player's Amount Due if that player has a Friend price
- host profit/loss
- full payment checklist
- court and ball cost, unless we later decide to make costs transparent

### 5.3 Host

Can see and manage:
- court cost
- ball cost
- Public Price
- every player's type
- every player's Amount Due
- every player's payment status
- Projected P/L
- Realized P/L
- finance snapshots and future reports

## 6. Recommended User Flow

### 6.1 Create Room

Use four room creation steps:
- Room Details
- Time & Venue
- Pricing
- Invite Friends

Pricing should be a dedicated step after Time & Venue and before Invite Friends. Keeping Pricing separate makes the cost breakdown easier to read and keeps Invite Friends focused on roster setup.

Fields:
- Pricing enabled toggle
- Number of Courts
- Court Cost / Court
- Ball Cost
- Public Price / External Player
- Include Host in Friend Split toggle
- Calculation Detail using skimmable equation rows

Derived preview:
- Courts: read from room setup estimate
- Total Court Cost = Court Cost / Court x Courts
- Total Cost = Total Court Cost + Ball Cost
- Friend Estimate = Total Cost / expected player count
- Public Price = fixed external price
- Projected P/L if full = estimated non-host revenue minus Total Cost

Notes:
- Public Price is fixed for External players unless the host edits pricing.
- Friend Estimate is dynamic and recalculates when roster, host split setting, or player types change.
- Host share is not counted as host revenue. When `Include Host in Friend Split` is on, projected revenue excludes the host slot.
- Current simple `feeEnabled` and `feeAmount` should be treated as legacy fields and mapped to the new Public Price model.

### 6.2 Room List

Room cards should show only the public external price.

Example UI:
- `Rp75,000 / player`
- `No fee` if pricing is disabled

Do not show Friend price in the room list.

### 6.3 Room Detail For Non-Host Player

Show a compact `Your Payment` section only when pricing is enabled and the player has joined.

Fields:
- Amount Due
- Payment Status

Example UI:
- `Amount Due`
- `Rp75,000`
- `Unpaid`

If host later marks the player as Friend, this section changes to the Friend amount.

### 6.4 Room Detail For Host

Add a host-only `Payment Tracking` section.

Each participant row should show:
- player name
- player type selector: External or Friend
- Amount Due
- payment status: Paid or Unpaid

Host can:
- switch player type between External and Friend
- mark payment as Paid
- mark payment as Unpaid
- update player type and payment status during scheduled, active, and completed states

### 6.5 Host Finance Panel

Add a host-only `Host Finance` panel in Room Detail.

Fields:
- Total Cost
- Total Charged
- Collected
- Unpaid
- Projected P/L
- Realized P/L

Recommended copy:
- Positive: `Profit`
- Zero: `Break-even`
- Negative: `Loss`

### 6.6 Active Match Roster Changes

Active Match already supports adding players while the match is running. Host Finance must follow that roster lifecycle.

When a player is added during an active match:
- create or update that player's participant finance row
- default new player type to External unless host changes it
- recalculate Friend Amount Due for Friend players
- reduce Friend Amount Due when the friend split participant count increases
- refresh the host finance summary and snapshot

If the added player is later marked as Friend:
- recalculate Friend Amount Due for all Friend players
- keep External player amounts fixed at Public Price
- keep Paid/Unpaid statuses unchanged unless host changes them

If the host waits until after the match to classify a mid-match added player:
- the player remains editable in the completed match finance UI
- switching the player to Friend after completion still recalculates Friend Amount Due
- the completed match snapshot is refreshed with the latest finance state

### 6.7 Completed Match Finance Edits

Host can still manage finance after a match is completed.

After completion, host can:
- change a player type between External and Friend
- mark a player as Paid or Unpaid
- update the finance summary
- refresh the match finance snapshot used by reports

The MVP should not hard-lock pricing when the room starts. If we introduce a lock later, it should be a reporting checkpoint, not a blocker for post-match payment management.

### 6.8 Match Completion

When the room or launched match is completed, save or refresh a Finance Snapshot for the host.

Snapshot should power future:
- per-match reporting
- weekly reporting
- monthly reporting
- custom date range reporting

## 7. Calculation Rules

### 7.1 Total Cost

```text
totalCourtCost = courtCostPerCourt * courtCount
totalCost = totalCourtCost + ballCost
```

Court Cost / Court is treated as the cost for one court for the whole room session.

Future enhancement:
- add duration support if hosts need hourly court pricing.

### 7.2 External Player Amount

```text
externalAmountDue = publicPrice
```

Public Price is fixed per external player.

### 7.3 Friend Player Amount

Recommended MVP rule:

```text
friendAmountDue = ceil(totalCost / friendSplitParticipantCount)
```

`friendSplitParticipantCount` is the joined player count, with the host included or excluded based on the host's `Include Host in Friend Split` setting.

If the host is excluded from the friend split:
- host Amount Due should be `0`
- the host is still visible in host finance controls
- Friend price denominator excludes the host but still counts other joined players in the session
- External players still pay Public Price

Open approval point:
- If we want exact no-margin friend sharing, we can track a small rounding adjustment instead of treating the `ceil` remainder as profit.

### 7.4 Projected P/L

```text
projectedProfit = sum(amountDue for all joined players) - totalCost
```

This answers:
- If every current player pays, are we profit, break-even, or loss?

### 7.5 Realized P/L

```text
realizedProfit = sum(amountDue for players marked Paid) - totalCost
```

This answers:
- Based on paid or covered amounts right now, are we profit, break-even, or loss?

Open approval point:
- Host participation should be represented carefully. Recommended: host has an Amount Due like any other player, but their payment status can be treated as Covered instead of transferred. In UI, we can keep the MVP label as Paid while the code keeps the door open for `covered`.

## 8. Data Model Proposal

The current room document is public-readable when `visibility == public`, so private finance data should not live directly in the public room document.

### 8.1 Public Room Document

Path:

```text
rooms/{roomId}
```

Public-safe fields:

```ts
pricing?: {
  enabled: boolean;
  publicPrice: number;
  currency: 'IDR';
  version: 1;
}
```

Purpose:
- room list price
- public room detail price
- compatibility with public discovery

Legacy mapping:
- `feeEnabled` maps to `pricing.enabled`
- `feeAmount` maps to `pricing.publicPrice`

### 8.2 Private Room Finance Settings

Path:

```text
rooms/{roomId}/finance/private
```

Host-only fields:

```ts
interface RoomFinancePrivate {
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
  updatedAt: unknown;
  createdAt: unknown;
}
```

### 8.3 Participant Finance

Path:

```text
rooms/{roomId}/participant_finance/{participantId}
```

Access:
- host can read and write all participant finance docs for the room
- joined player can read only their own participant finance doc
- joined player cannot mark themselves as Paid in MVP

Fields:

```ts
type FinancePlayerType = 'external' | 'friend';
type FinancePaymentStatus = 'unpaid' | 'paid';

interface RoomParticipantFinance {
  roomId: string;
  participantId: string;
  uid?: string;
  displayName: string;
  playerType: FinancePlayerType;
  paymentStatus: FinancePaymentStatus;
  amountDue: number;
  paidAt?: number;
  markedPaidBy?: string;
  lastCalculatedAt?: number;
  updatedAt: unknown;
  createdAt: unknown;
}
```

### 8.4 Host Finance Snapshot

Path:

```text
users/{hostUid}/finance_match_snapshots/{roomId}
```

Host-only fields:

```ts
interface HostFinanceMatchSnapshot {
  id: string;
  hostUid: string;
  roomId: string;
  launchedTournamentId?: string;
  title: string;
  venueName?: string;
  location?: string;
  scheduledFor: number;
  completedAt?: number;
  currency: 'IDR';
  totalCost: number;
  totalCharged: number;
  totalPaid: number;
  totalUnpaid: number;
  projectedProfit: number;
  realizedProfit: number;
  externalPlayerCount: number;
  friendPlayerCount: number;
  paidPlayerCount: number;
  unpaidPlayerCount: number;
  periodDay: string;
  periodWeek: string;
  periodMonth: string;
  participants: Array<{
    participantId: string;
    uid?: string;
    displayName: string;
    playerType: FinancePlayerType;
    paymentStatus: FinancePaymentStatus;
    amountDue: number;
  }>;
  createdAt: unknown;
  updatedAt: unknown;
}
```

Purpose:
- future Host Finance dashboard
- weekly filter
- monthly filter
- per-match detail
- custom date range filter

## 9. Firestore Rules Requirements

Rules must enforce:

- Public room docs can expose only public-safe pricing fields.
- Only room host can read or write `rooms/{roomId}/finance/private`.
- Only room host can read or write all docs in `rooms/{roomId}/participant_finance`.
- A joined authenticated player can read their own participant finance doc.
- A joined authenticated player cannot write their own payment status in MVP.
- Only `{hostUid}` can read and write `users/{hostUid}/finance_match_snapshots`.

Important security note:
- Do not store `totalCost`, `ballCost`, `courtCostPerCourt`, `projectedProfit`, `realizedProfit`, or all-player payment statuses directly in `rooms/{roomId}`, because public rooms are readable by unauthenticated or non-host users depending on current rules.

## 10. Future Host Finance Dashboard

Add a `Host Finance` surface after the room payment flow is stable.

Recommended entry points:
- Dashboard card
- Profile menu item
- Rooms screen secondary action

Filters:
- This Week
- This Month
- Custom Range
- Per Match

Cards:
- Revenue
- Cost
- Profit / Loss
- Unpaid
- Matches
- Average P/L per Match

Per-match list:
- match title
- date
- venue
- revenue
- cost
- profit/loss
- unpaid amount
- status

## 11. Implementation Phases

### Phase 0: Approval

Deliverables:
- approve this requirement doc
- confirm open approval points
- confirm data model direction

### Phase 1: Domain And Persistence Foundation

Deliverables:
- TypeScript finance types
- calculation utilities
- repository functions for finance settings, participant finance, and snapshots
- Firestore collection constants
- Firestore rules for private finance paths
- compatibility mapper from `feeEnabled` and `feeAmount`

### Phase 2: Create Room Pricing UI

Deliverables:
- replace simple fee input with Pricing UI
- add Court Cost / Court
- add Ball Cost
- add Public Price
- add derived preview
- persist public pricing and private finance settings

### Phase 3: Room Detail Payment Management

Deliverables:
- show Public Price in room detail
- show `Your Payment` for joined player
- show host-only `Payment Tracking`
- allow host to switch External/Friend
- allow host to mark Paid/Unpaid
- show host-only finance summary

### Phase 4: Active/Completed Recalculation And Snapshot

Deliverables:
- recalculate Friend Amount Due when active match roster changes
- support External/Friend changes after match completion
- support Paid/Unpaid changes after match completion
- save or refresh host finance snapshot when finance data changes
- save or refresh final snapshot on match completion

### Phase 5: Reporting Dashboard

Deliverables:
- Host Finance screen
- weekly/monthly/custom filters
- per-match list
- per-match detail

## 12. Acceptance Criteria For MVP

- Host can create a room with court cost, ball cost, and Public Price.
- Host can choose whether the host is included in the Friend split.
- Public room list shows Public Price only.
- External player sees Public Price before joining.
- Joined player sees their own Amount Due.
- Host can mark a player as Friend and that player's Amount Due updates.
- Host can mark a player as Paid or Unpaid.
- Host can add a player during active match and Friend Amount Due recalculates.
- Host can classify a mid-match added player as External or Friend after the match is completed.
- Host can edit External/Friend and Paid/Unpaid after the match is completed.
- Host can see Total Cost, Collected, Unpaid, Projected P/L, and Realized P/L.
- Non-host users cannot see host profit/loss.
- Non-host users cannot see all-player payment statuses.
- A finance snapshot is saved and refreshed for future reporting.
- Existing rooms using `feeEnabled` and `feeAmount` still render a sensible Public Price.

## 13. Approval Points

Please approve or adjust these before development:

1. Friend price denominator: controlled by `Include Host in Friend Split`.
2. Friend price rounding: use `ceil(totalCost / friendSplitParticipantCount)` for MVP.
3. Private data location: use room subcollections plus host snapshot under `users/{hostUid}`.
4. Active/completed edits: finance remains editable after match start and after match completion.
5. MVP payment status: only host can mark Paid or Unpaid.
