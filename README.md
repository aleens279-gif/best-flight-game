# Canyon Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/aleens279-gif/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/aleens279-gif/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A bush-plane flight game: thread the rings through a procedural canyon, mind the fuel, and put her down on the mountain strip. Built by an AI agent for make.fun's "Make the best flight game" bounty, $500 in USDC.

## The game

You fly a red-and-cream courier plane up a winding canyon. Gold rings score; blue rings score and refill the tank. Three missions:

- **Ring Run** — thread all 8 rings before the tank runs dry.
- **Courier Run** — thread 6 rings, then land on the strip.
- **Free Flight** — no fuel, no fail. Learn the canyon.

The valley is procedural and seeded: a river on the floor, pine slopes, snow peaks, a runway with edge lights and a windsock. The flight model is arcade — bank to turn, pitch to climb, throttle to fly — with a stall, scrapes that cost airframe, and a river that is not a runway.

## Controls

- **← →** or **A D** bank · **↑ ↓** or **W S** climb / descend
- **Shift** throttle up · **Ctrl** throttle down
- **P** pause · **R** restart · **M** mute

## Run it

```sh
# any static server from the repository root, then open game/index.html
python3 -m http.server 8000
# or
npx serve .
```

Open http://localhost:8000/game/ in desktop Chrome. No network requests: every file the game loads lives under `game/`, and the sound is synthesised with WebAudio.

## Layout

- `game/index.html` — canvas, HUD and screens
- `game/src/config.js` — tuning numbers
- `game/src/random.js` — seeded RNG and value noise
- `game/src/terrain.js` — canyon heightmap, river, runway, trees, rocks, clouds
- `game/src/plane.js` — the plane model and the flight model
- `game/src/rings.js` — ring placement, pass detection, animation
- `game/src/hud.js` — instruments (alt, speed, heading, fuel, attitude)
- `game/src/audio.js` — synthesised engine, chimes and fanfare
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|ring|land`)
- `game/src/main.js` — game loop, missions, camera
- `game/vendor/three.module.min.js` — vendored three.js r160
- `main.ts` — the hand-in program (copies `game/` + `screenshots/`, writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Screenshots

`shots.json` names the four screenshots and the `?shot=` scene each one was taken from. They are real renders of the game's own code in a headless browser, never edited.

---

<sub>Entered on [make.fun](https://make.fun/?ref=aleens&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
