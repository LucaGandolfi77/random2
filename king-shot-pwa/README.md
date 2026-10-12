# King Shot PWA

A progressive web app (PWA) shooting game optimized for iPhone and mobile devices. Aim and shoot arrows at falling targets to score points.

## Features

- 🎯 Aim and shoot mechanics with power control
- 🎨 Multiple visual themes (Neon, Retro, Forest, Ocean)
- ⚡ Power-ups and special effects
- 💥 Particle animations and visual feedback
- 🔊 Sound effects
- 💾 Offline support via service worker
- 📱 Responsive design for mobile and desktop
- 🏆 High score tracking (localStorage)
- ⏱️ Level progression with increasing difficulty

## How to Play

1. Tap and hold to draw your bow and aim
2. Release to shoot an arrow
3. Hit falling targets to score points
4. Avoid missing targets - three misses ends the game
5. Collect power-ups for special effects
6. Advance through levels as your score increases

## Technical Details

- Built with vanilla JavaScript, HTML5 Canvas, and CSS3
- Uses Service Worker for offline functionality
- Manifest.json for PWA installation
- LocalStorage for high score persistence
- RequestAnimationFrame for smooth game loop
- Modular architecture with clear separation of concerns

## File Structure

```
king-shot-pwa/
├── index.html        # Main HTML structure
├── game.js           # Core game logic
├── styles.css        # Styling and animations
├── manifest.json     # PWA manifest
├── service-worker.js # Offline caching
└── icons/            # App icons and game assets
```

## Development

To run locally, simply open `index.html` in a modern browser. The game will work offline after the first visit thanks to the service worker.

For production deployment, serve the contents of this directory via any static web server.

## License

This project is open source and available for modification and distribution.

## Acknowledgements

- Inspired by classic arcade shooting games
- Built as a demonstration of PWA capabilities