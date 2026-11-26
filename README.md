# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/leopad12121/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/leopad12121/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Sky Courier is a side-view airmail flight game: take off from runway 27 in a red-and-cream courier plane, thread the golden mail rings, dodge storm clouds, hot-air balloons and birds, collect stars and mailbags, and keep an eye on the fuel gauge — run dry and the engine quits. Patchwork fields, a river and two mountain ridges scroll below; the HUD carries score, distance and rings on the top bar with altitude, speed and heading beside them, plus an attitude ball, a compass strip and a fuel gauge. Difficulty rises every 18 seconds. Three lives, best score kept in the browser.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Build the hand-in (writes game/, screenshots/ and dossier.json to out/):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Controls: ↑ / W or hold the mouse to climb, ↓ / S to dive, ← → for throttle, P to pause, Space to take off and restart. `?seed=N` fixes the route; `?shot=start|play|ring|end&seed=N` stages a screenshot scene.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
