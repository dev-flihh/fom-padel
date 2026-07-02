# Toxic Hall of Shame v2 Implementation Plan

Last Updated: 2026-06-29
Status: Implementation in progress
Scope: Match Active, Klasemen Official, Klasemen Shame/Hall of Shame, toxic share cards without photos
Out of Scope: Global MMR Leaderboard

## Product Decisions Locked

- Toxic rank is reverse official standings. Toxic #1 is the last player in Official Klasemen.
- Toxic sorting label should not claim a separate formula like `L > -DIFF > PTS`.
- Chosen label in UI: `OFFICIAL UPSIDE DOWN`.
- Tie at the bottom becomes `Co-King of Cupu`.
- Default toxic intensity is `savage`.
- Toxic intensity can be changed while the match is active.
- Toxic mode can be turned off while the match is active, with a warning that Shame surfaces and Shame share options will disappear.
- After match finish, toxic mode and toxic intensity are locked in history and shared view.
- Pair award `Duo Petaka` is included in v2 and requires the pair to play together at least 2 times.
- My Match Card is only available for logged-in FOM players.
- Manual and non-login players can view standings but should see a soft upsell like `Login to get your Match Card`.
- Share cards in the current phase use a dark editorial gradient fallback, not match photos.
- Vote, H2H, photo gallery, and photo-based recap are parked and must not leak into the current implementation scope.

## Phase 0 - Backup Current Photo Blur Baseline

Goal:
- Preserve the current photo-blur implementation before replacing it with Court Editorial.

Backup folder:
- `backups/photo-blur-match-active-hall-of-shame-2026-06-29/`

Covered surfaces:
- Match Active photo background surface.
- Klasemen photo background surface.
- Hall of Shame current dark/gold treatment.
- Existing story export and share behavior references.
- Relevant e2e specs.

Rules:
- Create this backup before any large redesign patch.
- Restore selectively only when the old surface is intentionally reused.
- Do not restore the entire folder over current code after later phases have introduced new data fields or persistence behavior.

## Phase 1 - Foundation Refactor

Goal:
- Make Klasemen safe to redesign by separating data, official view, shame view, and story/share export concerns.

Primary files:
- `src/features/matches/KlasemenScreen.tsx`
- `src/features/matches/toxicStandings.ts`

Work:
- Extract official standings calculation into a utility or hook.
- Split Klasemen UI into smaller components.
- Keep behavior unchanged.
- Keep existing Playwright toxic/share/finished flow specs passing.

Implemented on 2026-06-29:
- Official standings calculation extracted to `src/features/matches/standingsUtils.ts`.
- Hall of Shame sort label changed to `OFFICIAL UPSIDE DOWN`.

## Phase 2 - Toxic Settings and Persistence

Goal:
- Support editable active-match toxic settings and locked final toxic settings.

Data:
- `toxicModeEnabled?: boolean`
- `toxicIntensity?: 'mild' | 'medium' | 'savage'`

Work:
- Default intensity to `savage` when Hall of Shame is enabled.
- Add match setting control for Hall of Shame on/off and intensity while active.
- Persist toxic fields to active tournament, shared snapshot, and history.
- Lock toxic fields after finish.

Implemented on 2026-06-29:
- Added `toxicIntensity` type and helpers.
- Setup wizard and active match action menu can edit Hall of Shame intensity.
- Active setting changes persist to active draft and synced shared snapshots.
- History/detail snapshots keep toxic intensity locked after finish.

## Phase 3 - Court Editorial Reskin

Goal:
- Replace the noisy photo-blur base UI with the new clean editorial system.

Work:
- White base background for Match Active and Klasemen.
- Header ringkas with progress.
- Stat strip editorial.
- Round stepper.
- Official ranking row with rank `01`, full player name, PTS and DIFF emphasis, and expandable detail.
- Shame tab with amber/gold accents.

Implemented on 2026-06-29:
- Match Active and Klasemen visible pages moved from photo-blur background to off-white court-editorial surface.
- Match Active header, summary panel, round card shell, and sticky next-round CTA moved to solid editorial cards.
- Match Active has a compact round stepper with generated and queued rounds.
- Klasemen header, summary panel, and ranking table moved to light editorial surface.
- Official ranking now uses two-digit rank display.
- Long player names can wrap instead of being hard-truncated.
- Official ranking rows can expand to show record, match count, rank, and the official sort rule.

Still pending in this phase:
- Final polish pass for all nested cards and radius consistency.

## Phase 4 - Hall of Shame v2 Engine

Goal:
- Make the toxic layer sharper while keeping Official Klasemen as the source of truth.

Work:
- Toxic rows derive from reverse official standings.
- Support anti-duplicate roast selection in one match.
- Add intensity-aware roast banks.
- Add context-aware roast slots when valid data exists.
- Add `Duo Petaka` pair award with minimum 2 matches together.
- Keep Co-King behavior for bottom ties.
- Keep peaceful tie and empty state safe.

Required tests:
- Toxic #1 equals official last player.
- Bottom tie creates Co-King.
- Default intensity is `savage`.
- No duplicate roast lines in a single Hall of Shame.
- Duo Petaka does not appear for pairs that played together only once.

Implemented on 2026-06-29:
- Toxic row sorting remains reverse official standings via `OFFICIAL UPSIDE DOWN`.
- `mild`, `medium`, and `savage` now have separate deterministic row and hero copy banks.
- Row roasts avoid duplicate lines within the same Hall of Shame until a bank is exhausted.
- Empty, peaceful tie, and Co-King hero copy respect the selected toxic intensity.
- `Duo Petaka` award is generated for the worst eligible pair with at least 2 countable matches together.
- Toxic award cards can render one-player and two-player awards.
- E2E coverage now checks default `Savage`, reverse-official sort label, and Duo Petaka visibility in the toxic fixture.

Still pending / parked:
- Dedicated unit coverage for Co-King and one-match-only Duo Petaka suppression.
- Vote/H2H prototype remains parked.
- Photo gallery and photo-backed share cards remain parked.

## Phase 4.5 - Toxic Copy Config

Goal:
- Let roast and award copy change without touching ranking logic.

Implemented on 2026-06-29:
- Default toxic copy moved to `src/features/matches/toxicCopyConfig.ts`.
- Toxic ranking engine accepts a `toxicCopyConfig` override instead of owning copy banks.
- Firebase Remote Config adapter reads JSON from key `toxic_copy_v1`.
- QA/dev local override is available through localStorage key `fom_toxic_copy_config_v1`.
- Invalid or partial config safely falls back to default copy.
- E2E coverage proves JSON override can change sort label, award label, hero roast, and row roast.

Example payload:

```json
{
  "version": 1,
  "sortLabel": "OFFICIAL UPSIDE DOWN",
  "awards": {
    "king-of-cupu": { "label": "King of Cupu", "emoji": "👑", "isGold": true }
  },
  "heroRoasts": {
    "savage": ["Remote hero roast active."]
  },
  "rowRoasts": {
    "savage": {
      "last-place": ["Remote row roast active."]
    }
  },
  "emptyRoasts": {
    "savage": "Main dulu, baru Hall of Shame jalan."
  },
  "peacefulRoasts": {
    "savage": "Belum ada yang bisa di-roast."
  },
  "coKingRoasts": {
    "savage": "Dua orang, satu takhta."
  }
}
```

## Phase 5 - Share Cards Without Photos

Goal:
- Ship shareable cards before the photo/gallery system exists.

Work:
- Build share sheet for current phase.
- My Match Card for logged-in players only.
- Standings Card.
- Shame Card.
- Dark editorial gradient fallback background.
- Keep 9:16 card format as the first stable format.

Implemented on 2026-06-29:
- Share menu now exposes `Share Link`, `Standings Card`, `Shame Card`, and `My Match Card`.
- `Shame Card` appears when Hall of Shame is enabled.
- `My Match Card` is only actionable when the logged-in user is an actual non-manual player in the match.
- Non-login/manual-player state shows the disabled upsell `Login to get your Match Card`.
- Share card export keeps the stable 9:16 output, but the user-facing surface is now a card flow rather than a photo story flow.
- Share cards use a dark editorial gradient/court-line fallback background and do not include match photos.
- Story/share style e2e coverage was updated to assert the new card background and translucent summary treatment.

Parked:
- Photo gallery.
- Cover photo.
- FOM Rewind photo recap.
- Vote.
- H2H.
