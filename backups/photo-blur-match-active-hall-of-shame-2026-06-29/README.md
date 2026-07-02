# Photo Blur Baseline Backup - Match Active and Hall of Shame

Created: 2026-06-29

Purpose:
- Preserve the current photo-blur based Match Active and Klasemen/Hall of Shame implementation before the Court Editorial redesign.
- Keep a restorable reference if the old visual direction needs to be reused, compared, or partially reintroduced.
- Capture the relevant Playwright regression specs that describe current behavior.

Important note:
- This backup was copied from the current working tree, not from a clean git commit.
- The repository already had many unrelated modified/untracked files when this backup was created.
- Treat this folder as a reference snapshot, not as an authoritative release tag.

Included code:
- `src/features/matches/MatchActiveScreen.tsx`
- `src/features/matches/ActiveMatchBackdrop.tsx`
- `src/features/matches/ActiveMatchHeader.tsx`
- `src/features/matches/ActiveMatchSummaryPanel.tsx`
- `src/features/matches/ActiveMatchRoundCard.tsx`
- `src/features/matches/ActiveMatchNextRoundCta.tsx`
- `src/features/matches/KlasemenScreen.tsx`
- `src/features/matches/toxicStandings.ts`
- `src/features/matches/matchBackgrounds.ts`
- `src/features/tournaments/matchTheme.ts`
- `src/index.css`

Included regression references:
- `tests/e2e/toxic-standings.spec.ts`
- `tests/e2e/share-flow.spec.ts`
- `tests/e2e/start-match-flow.spec.ts`
- `tests/e2e/finished-flow.spec.ts`

Restore guidance:
1. Compare the target file against this backup first.
2. Restore only the specific file or section needed.
3. Do not blindly copy the whole folder back into `src`; later phases may intentionally change shared types, persistence, or tests.
4. After restoring any old surface, run the relevant e2e specs for active match, standings, share, and toxic behavior.
