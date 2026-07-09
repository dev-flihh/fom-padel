# PRD — Match Creation Improvements (v2)

| | |
|---|---|
| **Status** | v2 — implemented on branch `release-hardening` (2026-07-09); quick start uses pattern A4 |
| **Author** | Product (Falih) — analysis assisted by codebase audit |
| **Date** | 2026-07-09 (v2, same day as v1 review) |
| **Audience** | Design team (UI/UX), then Engineering |
| **Scope** | **Targeted improvements on top of the current wizard** — not a flow restructure (see Revision history) |

## Revision history

- **v1 (2026-07-09)**: proposed a full flow restructure (entry fast-path screen, players-first step order, format cards with collapsed Advanced section).
- **Design review (2026-07-09)**: mockups of the v1 restructure were built and reviewed. **Verdict: the current in-app wizard is clearer and more to-the-point than the restructured flow.** The restructure added indirection without adding clarity.
- **v2 (this document)**: pivots to *keep the current wizard as the baseline* and ship four targeted improvements: (1) match templates + repeat last match, (2) a redesigned add-players surface with global FOM player search, (3) removal of the color/background appearance settings, (4) dead-simple partner picking for both Rotating and Fix Partner. Everything else in the current flow stays as-is unless listed under "secondary polish" (§5.5).

---

## 1. Background

Creating a match is the single most important action in FOM Play. Today it is a **5-step wizard**: Match Info → Format → Players → Appearance → Review. A codebase audit plus a design-mockup round established that the wizard's *structure* is good — but it has four concrete gaps: no way to reuse a previous setup, a fragmented add-players experience (three separate mechanisms, friends-only), an Appearance step for a feature being deprecated, and a Fix Partner pairing panel that feels bolted-on.

This PRD defines those four improvements. Design owns the final UI; a reference mockup for the Players step accompanies this document.

---

## 2. Personas

| Persona | Description | What they need |
|---|---|---|
| **Casual organizer** ("Rara") | Sets up a social weekly session ("mabar"). Doesn't know the difference between Americano and Mexicano. On mobile, often standing at the court with players waiting. | Finish setup fast with safe defaults. Adding players must be one obvious motion, not a choice between three buttons. |
| **Experienced organizer** ("Bang Doni") | Runs the same Friday-night session every week. Knows exactly what format, points, and courts he wants. Same venue, mostly the same players. | One-tap repeat of last week's setup, or a saved template. Full control stays where it already is. |

---

## 3. Current Flow (As-Is)

### 3.1 Step map

| Step | Title | Inputs |
|---|---|---|
| 0 — Match Info | "Name your match" | Match name (optional), Venue (optional), City/Area (optional, Google Places autocomplete) |
| 1 — Format | "Choose a format" | Format (Match Play / Americano / Mexicano), Partner mode (Rotating / Fix Partner), Ranking criteria (Matches Won / Points Won), Deuce method (Match Play only), Courts (1–12), Rounds (1–30), Duration (30–360 min), Points per game (1–99, hidden for Match Play) |
| 2 — Players | "Add players" | Choose Friends (separate screen, friends only), Add New Player (modal, manual name), Quick-add chips (max 8 shown), Fixed Teams pairing panel (Fix Partner mode only) |
| 3 — Appearance | "Choose appearance" | Hall of Shame toggle + intensity, Theme color, Background image |
| 4 — Review | "Review setup" | Summary with edit links, Hall of Shame toggle (duplicated), blocking warning if not enough players |

After "Generate Match", a **separate background picker screen** appears again before the live match screen.

### 3.2 Validation rules (must be preserved)

- Minimum players = `courts × 4`.
- Fix Partner mode requires an **even** player count and every player paired.
- The current user is always in the roster and cannot be removed.
- Format defaults: Americano → Points Won / 5 rounds / 21 pts; Mexicano → Matches Won / 8 rounds / 21 pts; Match Play → Matches Won / 3 rounds, tennis scoring, deuce method applies.

### 3.3 Audit findings and their v2 status

| # | Finding | v2 status |
|---|---|---|
| P1 | Venue and City/Area are two separate free-text fields with unclear distinction. | Secondary polish (§5.5) — optional. |
| P2 | Choosing a format silently rewrites rounds/points/criteria. | Secondary polish (§5.5) — optional. |
| P3 | Fix Partner constraints revealed too late; pairing panel feels bolted-on. | **Addressed** by §5.4 (inline team cards, live even-count status). |
| P4 | Background chosen twice (Appearance step + post-generate screen). | **Resolved by removal** — feature deprecated (§5.3). |
| P5 | Hall of Shame appears in two steps under two names. | **Addressed**: single home on Review, single name (§5.3). |
| P6 | Quick-add silently truncates at 8 friends; add-players is split across three mechanisms, friends-only. | **Addressed** by the new Players surface (§5.2). |
| P7 | Format step mixes "how we play" and "session logistics". | **Accepted as-is** — the v1 restructure of this step tested less clear than the current layout. No change. |
| P8 | No memory between sessions; every match starts blank. | **Addressed** by templates + repeat last match (§5.1). |
| P9 | Duration input drives nothing. | Accepted as-is for now; revisit separately. |
| P10 | Match name is asked first despite being least important. | **Accepted as-is** — step order stays; the Quick start strip (§5.1) makes Step 0 more valuable instead. |

---

## 4. Goals & Non-Goals

### Goals

1. **G1 — Repeatability.** An organizer can save a match setup as a **template** and can **repeat the last match**; a repeat session starts pre-filled in ≤ 2 taps plus roster confirmation.
2. **G2 — One simple add-players surface.** Adding a player is a single motion from a single input — whether they are a friend, **any FOM user (no friendship required)**, or a guest without an account. No separate screens, no modal, no hidden caps.
3. **G3 — Partner picking that explains itself.** Rotating mode needs zero extra UI. Fix Partner mode shows teams directly in the roster with one obvious interaction; the even-count rule is visible the moment it matters.
4. **G4 — Remove appearance settings.** Theme color and background selection disappear from the flow entirely (deprecated feature).
5. **G5 — One visual language.** Everything new must look native to the current Homepage and Match Settings screens (token set in §6.7).

### Non-Goals

- **No flow restructure.** Step order stays Match Info → Format → Players → Review. No new entry screen, no players-first reorder, no collapsing the Format step into cards+Advanced. (Tried in v1 mockups; rejected as more confusing.)
- Changing round-generation algorithms, scoring logic, or the live match screen.
- Player invitations, scheduling (date/time), RSVP, or friend-system changes (adding a non-friend FOM player to a match must **not** create a friendship or send a request).
- Changing the data model beyond what templates/duplication and roster entries require.
- **Theme color and background selection** — removed, not redesigned or relocated. Remaining `themeColorId`/`backgroundId` fields become unused (cleanup is an engineering call).
- Inventing a new visual design language.

---

## 5. What Changes (To-Be)

The wizard keeps its current shell, stepper, and step order — minus the Appearance step, so it becomes **4 steps: Match Info → Format → Players → Review**.

### 5.1 Templates & Repeat last match

Placement went through three design rounds: a horizontal swipe strip (A1) was rejected as ambiguous; an entry bottom sheet (A2) and fork-first radio cards (A3) were mocked as alternatives. **Decision (Falih, 2026-07-09): pattern A4 — a one-line banner on Step 1.**

- Step 1 (Match Info) keeps its exact current form. Above the form sits **one compact banner**: "Repeat last match?" with a one-line summary ("Americano · 8 players · Star Padel · Fri, Jul 3") and a single **Use** action.
- Directly under the banner, a small text link — **"Start from a template instead ›"** — opens the saved-template list (simple sheet/list; tap a template = same behavior as Use).
- Tapping **Use** (or a template) pre-fills the entire draft from that match/template and **stays on Step 1** — a toast confirms "Setup applied", and the organizer walks the steps normally to verify what was filled (decision v2.1: no auto-jump; checking each step matters more than saving two taps). The banner's summary spans two short lines (setup line + venue/date line) so nothing truncates.
- The banner renders only when the user has at least one previous match; the template link only when templates exist. First-time users see today's Step 1 completely unchanged.
- The form stays the obvious default path: one banner, one action, no carousel, no competing section (satisfies R1.5).

**Saving**: a **"Save as template"** row on the Review step (name field, off by default). Saving must not delay match generation.

### 5.2 Players step — redesigned add surface (reference mockup provided)

Replaces the current trio (Choose Friends screen + Add New Player modal + Quick-add chips) with **one surface on the step itself**:

1. **One search field** at the top ("Search name or add a guest"). Typing shows a single result list with three groups, in this order:
   - **Friends** — matching friends, one-tap add.
   - **FOM players** — matching registered users who are *not* friends, searched globally. One-tap add directly to the match. A small caption makes the semantics unmistakable: *"Added to this match only — no friend request sent."* (Backend already exists: `searchUsers` cloud function used by the add-friend flow.)
   - **Add "«query»" as guest** — always the last row, one tap creates a guest (no account needed). This replaces the modal.
2. **Recent players** — when not searching, a chip grid of people from the organizer's recent matches (friends *and* past guests), one-tap re-add. This is the fast path for weekly groups and replaces Quick-add without the hidden 8-player cap (grid + "show all").
3. **Roster list** ("In this match — N players") with the status pill logic kept from today ("Add 1 more for 2 courts" / "Ready"), avatar rows, a `guest` tag for guests, remove ×, and the "You" row locked (no remove affordance).

Design freedom note: layout, ordering, and microcopy of this step are design's to refine — the mockup is a reference for intent, not a pixel spec. The hard requirements are in §6.2.

### 5.3 Removals & consolidation

- **Appearance step deleted** (theme color + background pickers) and the **post-generate background picker screen deleted**. The live match screen uses one fixed default look (a global style owned by engineering/design, not a per-match input).
- **Hall of Shame** moves to a single home: the **Review** step (where it already exists today). One canonical name everywhere: "Hall of Shame". Toggle + intensity behavior unchanged.

### 5.4 Partner picking — simple for both modes

- **Rotating (default)**: the roster is a flat list. No pairing UI exists at all — the only signal is the ready/needed count pill. (Zero change from today; this is already right.)
- **Fix Partner**: the roster area itself becomes **team cards** (Team 1, Team 2, …), auto-paired in the order players were added:
  - One instruction line: *"Tap two players to swap partners."* Tap player A (highlights) → tap player B → they swap. This reuses the existing swap interaction from `FixedTeamsPanel` — but rendered as the roster itself, not a separate panel below it.
  - **Odd count**: the last card shows an empty slot with an inline notice — *"1 player needs a partner — add 1 more or remove someone"* — and the footer CTA stays disabled with the same message. The rule is therefore visible in-place, not discovered at Review.
  - Removing a paired player dissolves that pair with a visible notice, never silently.

### 5.5 Secondary polish (optional — ship only if cheap, none blocks the above)

- Merge Venue + City/Area into one Google Places autocomplete field writing both values (P1).
- When switching format, show a one-line "Auto-set: 5 rounds · 21 points" notice instead of silently rewriting values; add undo if the user had edited them (P2).
- Auto-generated default match name ("Friday Americano — Jul 9") when left blank.

---

## 6. Detailed Requirements

### 6.1 Templates & repeat

- **R1.1** "Repeat last match" clones the most recent match's settings and roster into a fresh draft (new ID; no scores/rounds carried over). The wizard stays on Step 1 with a visible "Setup applied" confirmation; every step is pre-filled and the organizer advances through them normally — never straight to Review.
- **R1.2** Templates store: format, partner mode, courts, rounds, points, criteria, deuce method, Hall of Shame config, venue/location, and the roster. Roster members who are no longer resolvable (deleted account) degrade gracefully to guest entries.
- **R1.3** Users can save (from Review), rename, and delete templates. Design should assume ~5 visible templates; storage location (local vs Firestore) is an engineering decision — product leans Firestore so templates follow the account.
- **R1.4** The shortcut is the A4 banner (see §5.1): shown only when the user has at least one previous match; the template link shown only when templates exist. With neither, Step 1 renders exactly as today.
- **R1.5** The fork and the Match Info form must never compete as parallel inputs (the rejected A1 strip). A4 satisfies this by being a single line with a single action; the form remains the screen's default path.

### 6.2 Players step

- **R2.1** One search input handles all three sources — friends, global FOM users, guests — in a single ranked result list (friends first, then FOM players, then the guest-add row). No separate picker screen, no modal.
- **R2.2** **Global FOM player search requires no friendship.** Adding a result adds them to this match's roster only: no friend request, no notification to them beyond normal match participation, no change to either user's friend list. Reuse the existing `searchUsers` cloud function (`src/services/friendsRepository.ts:104`).
- **R2.3** FOM player results show enough identity to avoid wrong-person adds: display name, avatar/initials, and a stable discriminator (username/handle or MMR). Friends are visually distinguished from non-friend FOM players.
- **R2.4** The guest-add row is always present while typing, pre-filled with the typed name; one tap creates the guest. Guests keep today's data shape (`source: 'manual'`).
- **R2.5** Recent players (from the organizer's match history, including past guests) are available one-tap without typing; the full list must be reachable (no silent 8-item cap).
- **R2.6** Roster keeps today's rules: current user auto-included and non-removable ("You" chip, no delete affordance); duplicate adds are no-ops; count pill always states the implication ("Add N more for X courts" / "Ready").
- **R2.7** Search must degrade gracefully offline / on error: friends cache and guest-add keep working even if global search fails.

### 6.3 Partner picking

- **R3.1** Rotating mode introduces no pairing UI whatsoever.
- **R3.2** In Fix Partner mode the roster renders as numbered team cards, auto-paired on entry; pairing state is never a separate panel duplicating the roster.
- **R3.3** Swap interaction: tap-two-to-swap, with a persistent one-line hint and a visible selected state on the first tap. (Reuse the proven interaction from `FixedTeamsPanel` / `SwapPlayerModal`.)
- **R3.4** Even-count rule surfaces inline at the moment of violation (empty slot in the last team card + disabled CTA with the same message). Never only at Review.
- **R3.5** Switching partner mode after pairing preserves the roster; switching back to Fix Partner re-auto-pairs.

### 6.4 Removals

- **R4.1** The Appearance step is removed; the wizard is 4 steps. The stepper, progress bars, and step labels update accordingly.
- **R4.2** The post-generate background picker screen is removed; Generate goes straight to the live match screen.
- **R4.3** Theme color / background pickers do not reappear anywhere else in the flow. The live match screen uses one fixed default appearance.
- **R4.4** "Hall of Shame" is the only user-facing name for that feature, and Review is its only home. Toggle default off; intensity default Savage; intensity selector visible only when toggled on (all unchanged).

### 6.5 Review & generate

- **R5.1** Review keeps the current summary-with-edit-links pattern; rows for Color/Background are removed.
- **R5.2** Generate stays disabled until: `players ≥ courts × 4`; and, if Fix Partner, even count and all paired. Error copy points to the exact fix.
- **R5.3** "Save as template" row on Review (see R1.3); saving is fire-and-forget.

### 6.6 Cross-cutting

- **R6.1** Draft persistence: an in-progress setup survives app close/refresh (persist draft locally; today it is React-state only).
- **R6.2** All copy in English, consistent vocabulary: *match*, *round*, *court*, *format*, *guest* (manual player), *Hall of Shame*. No "tournament" or "toxic mode" in UI.
- **R6.3** Mobile-first: every surface usable one-handed; numeric steppers keep direct typing.
- **R6.4** Data-model changes are additive only (template entity, roster entry source flags).

### 6.7 Visual design system — one theme with Homepage and Match Settings

**Requirement:** everything new must read as the same app as the Homepage/Dashboard (`src/features/dashboard/DashboardScreen.tsx`) and the current Match Settings wizard (`src/features/matches/*Step.tsx`, shared styles in `matchSettingsStyles.ts`). Pull tokens from these screens; do not start from a blank canvas. The two screens share one token set but have drifted in places — the table below is the reconciled source of truth; **use it as the baseline, not either screen verbatim.**

**Colors** (source: `src/index.css` `@theme` block):

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#E65E14` | CTAs, active states, selected chips, badges, focus rings |
| `--color-surface` | `#F7F7FA` | Page background |
| `--color-surface-container` | `#FFFFFF` | Cards, inputs, sheets |
| `--color-on-surface` | `#111827` | Headings, primary text |
| `--color-outline-variant` | `#ECECF2` | Hairline borders/dividers |
| `--color-ios-gray` | `#8E8E93` | Secondary text, disabled state, soft panel fill |
| `--color-ios-blue` | `#007AFF` | Rare — links only |
| `--color-error` | `#FF3B30` | Validation errors only |

No other brand colors. (Per-match theme colors belonged to the removed Appearance step.)

**Typography** (Inter, loaded app-wide; see `index.html`):

| Role | Style |
|---|---|
| Page title | 34px, extrabold–bold, leading 1.02–1.08, tracking −0.02 to −0.04em |
| Section heading | 22px, bold |
| Body / subtitle | 15px, medium, leading 1.42, tracking −0.01em |
| Label / eyebrow | 11px, bold, uppercase, tracking 0.12em |
| Helper / fine print | 12–13px, medium–semibold |

Instrument Serif stays reserved for ceremonial moments (Rewind); never in the setup flow. No new font families.

**Shape:** buttons & standard cards 18–20px; grouping/soft panels 26px; compact chips & icon boxes 12–16px; inputs, avatars, pills full-round. The current wizard mixes 16/20/24px against the dashboard's 18–20px — new work picks **one value per element type** from this scale; don't add a fourth.

**Spacing:** horizontal content padding **24px** (dashboard `px-6`; wizard's current 28px standardizes down); section gap 24–28px; card inner padding 16–20px.

**Elevation:** soft grouping panels stay flat (tinted fill `ios-gray/[0.035]`, no shadow); a subtle shadow is reserved for the primary CTA and floating/sticky surfaces (`0 6px 18px rgba(17,19,23,0.035)` for cards; primary-tinted shadow for the main CTA). Don't shadow every card.

**Icons:** Lucide, stroke ~1.8–2.2, 13–22px. **Mode:** light-only (`color-scheme: only light`, see commit `92f273f`); no dark-mode deliverables.

- **R7.1** All colors from the token table; no new hex values.
- **R7.2** All type is Inter at the documented scale; no ad-hoc sizes/weights.
- **R7.3** Corner radius per the reconciled scale; the wizard's 16/20/24px inconsistency is resolved, not preserved.
- **R7.4** Horizontal content padding standardized to 24px across every step.
- **R7.5** Shadows follow the flat-panel / shadowed-CTA pattern; no per-step improvisation.
- **R7.6** New components (search input + result list, quick-start cards, team cards) are assembled from existing primitives/tokens — e.g. a template card should look like the dashboard's Active Match / Upcoming Room cards, not a new card style.

---

## 7. Success Metrics

| Metric | Baseline | Target |
|---|---|---|
| Median time from "Start Match" tap to Generate | unknown — instrument first | ≤ 20s via Repeat/Template; new-match time not worse than today |
| % of matches created via Repeat/Template (after 4 weeks) | 0% (feature doesn't exist) | ≥ 40% for organizers with ≥ 2 prior matches |
| Taps to add one player (friend case) | ~4–5 (open picker screen → find → select → back) | ≤ 2 (type/tap chip → added) |
| Matches including a non-friend FOM player | 0% (impossible today) | > 0 and growing — validates G2 |
| Fix Partner setups abandoned before Generate | unknown | −50% |

Instrumentation for baselines ships before or with the redesign.

---

## 8. Open Questions

1. **Template storage**: ~~local-only or Firestore-synced?~~ **Implemented as localStorage per account** (`matchTemplatesRepository.ts`, cap 10); Firestore sync can be added later behind the same repository interface without UI changes.
2. **Global search privacy**: is any opt-out needed for users who don't want to be findable by name? Current add-friend search already exposes this — confirm the same policy covers match adds.
3. **Non-friend FOM player consent**: adding someone to a match affects their stats/MMR history. Confirm this is acceptable without an accept step (today, friends can be added the same way without consent — presumably yes).
4. **Recent players source**: derive from match history on the fly, or maintain a lightweight "recent co-players" list per user? Engineering call.

---

## 9. Appendix

### 9.1 Design references

- **v1 restructure mockups (rejected)**: `~/Downloads/Design dari PRD/Match Creation Redesign.dc.html` — kept for the record of what tested as *less* clear.
- **v2 reference mockups**: delivered alongside this PRD (artifact "FOM Play — Players Step Mockups"). Board 1 compares four Quick start placements — **A4 one-line banner (chosen)**; A1 swipe strip (rejected), A2 entry sheet and A3 fork-first cards (considered, not chosen). Board 2 covers the Players step: unified search (friends / FOM players / guest), recent players, roster, Fix Partner team cards, and Review with Save as template.

### 9.2 Key source files

| Area | Files |
|---|---|
| Wizard shell & steps | `src/features/matches/MatchSettingsScreen.tsx`, `MatchInfoStep.tsx`, `FormatStep.tsx`, `PlayersStep.tsx`, `ReviewStep.tsx` |
| To be removed (appearance deprecated) | `AppearanceStep.tsx`, `matchTheme.ts`, `matchBackgrounds.ts`, post-generate background screen in `src/App.tsx` (~lines 2968–3011) |
| Players & pairing | `useMatchSettingsPlayers.ts`, `AddPlayerModal.tsx`, `FixedTeamsPanel.tsx`, `SwapPlayerModal.tsx`, `partnerMode.ts` |
| **Global user search (reuse for R2.2)** | `src/services/friendsRepository.ts:104` (`searchFriendUsers` → `searchUsers` cloud function) |
| State & validation | `useMatchSettingsDraft.ts`, `matchSettingsSummary.ts` |
| Generation | `src/features/tournaments/generateTournament.ts`, `americanoScheduler.ts`, `fixedTeamScheduler.ts` |
| Design tokens (§6.7 source of truth) | `src/index.css` (`@theme` block), `index.html` (font link), `src/features/matches/matchSettingsStyles.ts` |
| Homepage visual reference | `src/features/dashboard/DashboardScreen.tsx` |
