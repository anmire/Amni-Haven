# Checklist: Stream Close + ROM Loading Fix (v1.3.9)

## Bug 1: Stream Close
- [x] Diagnosed: tile closeBtn only toggles `.collapsed` class, never stops stream
- [x] Diagnosed: `screen-share-close` only toggles `.screen-collapsed`, never stops stream
- [x] Fix: tile closeBtn → own tile: stop sharing; other tile: dismiss from view
- [x] Fix: add visual "×" close button distinct from collapse

## Bug 2: ROM Loading
- [x] Diagnosed: `game-active-session` has `display:none` when EmulatorJS bootstraps into `#game-container`
- [x] Diagnosed: canvas initializes at 0×0 because parent hidden
- [x] Fix: show `game-active-session` BEFORE `await startGame()`
- [x] Fix: expand `accept` filter on `game-rom-input` to cover all 32 console formats
- [x] Fix: add error recovery if startGame fails (re-show host controls)

## Validation
- [x] Lint check
- [x] Update CHANGELOG.md
- [ ] Commit as v1.3.9
