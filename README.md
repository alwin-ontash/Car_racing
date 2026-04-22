# 🏎️ Highway Dash — Car Racing Game

A browser-based top-down car racing game built with HTML5 Canvas and vanilla JavaScript.

## 🎮 How to Play

- Press **START** to begin
- Use **Arrow Keys** or **A / D** to steer left and right
- Dodge traffic cars and obstacles
- Speed increases over time — survive as long as possible
- Your score is the distance driven in metres

## 🔊 Sounds

The game includes synthesized sounds by default:
- **Engine** — F1-style engine roar that pitches up with speed
- **Crash** — Impact sound on collision
- **BGM** — Music that plays on the game-over screen

### Adding Real Sound Files

Place MP3 files in the `sounds/` folder to replace the synthesized sounds:

| File | Description |
|------|-------------|
| `sounds/engine.mp3` | Looping F1 engine sound |
| `sounds/crash.mp3` | Crash / impact sound (1–3 sec) |
| `sounds/bgm.mp3` | Game-over background music (loops) |

Free sounds: [freesound.org](https://freesound.org) · [pixabay.com/sound-effects](https://pixabay.com/sound-effects/)

## 🚀 Running Locally

Open `index.html` directly in a browser, or run a local server:

```bash
python -m http.server 5500
```

Then visit `http://localhost:5500`

## 🗂️ Project Structure

```
Car_Race/
├── index.html      # Main HTML entry point
├── style.css       # Styles and overlay UI
├── game.js         # Main game loop and logic
├── car.js          # Player car
├── aiCar.js        # Traffic / AI cars
├── track.js        # Road, lanes, obstacles
├── input.js        # Keyboard input handler
├── utils.js        # Helper functions
├── sound.js        # Sound manager (real files + fallback synthesis)
└── sounds/         # Place your MP3 files here
```

## 🛠️ Built With

- HTML5 Canvas
- Vanilla JavaScript (no frameworks)
- Web Audio API (synthesized sounds)
