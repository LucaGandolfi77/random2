# Star Explorer

A free browser space adventure game.

> **Pilot through the cosmic void, collect crystals, and survive the asteroids!**

You are a starship captain in the vastness of space. Navigate through asteroid fields, collect energy crystals, and avoid incoming debris. Every flight is dangerous, but the reward is worth the risk.

## Playing

| Input | Action |
|---|---|
| Mouse drag | Fly — tap anywhere to steer |
| Click | Shoot lasers |
| ESC | Pause menu |

## Features

- **Procedural Asteroids**: Every run generates new asteroid fields
- **Crystal Economy**: Collect crystals to upgrade your ship
- **Progressive Difficulty**: Levels get harder as you advance
- **Offline Play**: Works completely offline once installed
- **Persistent Progress**: Save your high scores and unlocks
- **Responsive Design**: Plays perfectly on desktop and mobile

## Technical Details

- **Platform**: Canvas 2D + WebAudio
- **Architecture**: Modular source structure (9 JS modules)
- **Storage**: Device-local state with localStorage
- **PWA Features**: Service worker, web manifest, install prompt
- **Performance**: Optimized for smooth 60fps gameplay

## Files

index.html          shell + HUD markup
styles.css          game UI and visual styles
manifest.json       PWA manifest
`service-worker.js   offline shell with robust error handling
src/
  config.js         all tunable numbers
  storage.js        save/load game state
  world.js          physics and asteroid movement
  render.js         canvas rendering and visual effects
  player.js         player movement and input
  npcs.js           enemy AI and behavior
  audio.js          synthesized sound effects
  ui.js             user interface and game screens
  main.js           game loop and initialization
icons/              app icons (SVG)

## Controls

- **Mouse**: Click and drag to steer (thumb-point aiming)
- **Space**: Activate shield (temporary invincibility)
- **ESC**: Open pause menu
- **R**: Reset progress (warning: permanent!)

## Installation

Add Star Explorer to your home screen for:
- ✅ Offline play
- ✅ Fullscreen experience  
- ✅ Native app feel
- ✅ Push notifications (future feature)

## Development

This project follows the same architecture as SECTOR 7 but with:
- Different game mechanics (space exploration vs space combat)
- Simpler codebase (fewer dependencies)
- Focus on procedural content generation
- Enhanced visual effects

## License

All games in this repository are under the MIT License.

## Credits

- Concept and development: Luca Gandolfi
- PWA optimization: Based on SECTOR 7 patterns
- Audio synthesis: WebAudio API
- UI design: Responsive and accessible

## Testing

This PWA follows the same quality standards as the other games in the random2 repository:
- ✅ Service worker offline functionality
- ✅ Web App Manifest compliance
- ✅ Accessibility compliance
- ✅ SEO optimization
- ✅ Responsive design testing

Star Explorer is built with modern web technologies and designed to work everywhere, on any device, with or without an internet connection.