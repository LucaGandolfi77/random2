# PWA Copy Guide - Best Practices from SECTOR 7

This guide shows you how to copy and adapt the best PWA patterns from the SECTOR 7 game in this repository.

## Quick Start: Copy SECTOR 7 Structure

### Step 1: Create Your PWA Directory
```bash
cd /workspaces/random2
mkdir your-pwa-pwa
cd your-pwa-pwa
```

### Step 2: Copy SECTOR 7's Core Files

#### A. Copy index.html (with SEO and Accessibility)
```bash
cp ../sector7-pwa/index.html .
# Or manually create with this template:
```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <!-- ===== SEO ===== -->
    <title>Your Game Title — free browser game</title>
    <meta name="description" content="Your game description with keywords.">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="Your Name">
    <meta name="copyright" content="© 2024 Your Name">
    
    <!-- Absolute URL for canonical -->
    <link rel="canonical" href="https://yourusername.github.io/your-repo/your-pwa-pwa/">
    
    <!-- ===== Web App Manifest ===== -->
    <link rel="manifest" href="manifest.json">
    
    <!-- ===== Icons ===== -->
    <link rel="icon" href="icons/icon-192.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="icons/icon-192.png">
    
    <!-- ===== Meta Tags ===== -->
    <meta name="theme-color" content="#your-theme-color">
    <meta name="color-scheme" content="dark">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Your Game">
    
    <!-- ===== Social Cards ===== -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Your Game">
    <meta property="og:title" content="Your Game Title">
    <meta property="og:description" content="Your game description...">
    <meta property="og:url" content="https://yourusername.github.io/your-repo/your-pwa-pwa/">
    <meta property="og:image" content="https://yourusername.github.io/your-repo/your-pwa-pwa/og-cover.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- ===== Structured Data ===== -->
    <script type="application/ld+json">{
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": "Your Game Title",
      "alternateName": "Alternative Name",
      "url": "https://yourusername.github.io/your-repo/your-pwa-pwa/",
      "image": "https://yourusername.github.io/your-repo/your-pwa-pwa/og-cover.png",
      "description": "Your game description...",
      "genre": ["Genre1", "Genre2", "Genre3"],
      "gamePlatform": "Web browser",
      "playMode": "SinglePlayer",
      "applicationCategory": "GameApplication",
      "operatingSystem": "Any modern browser",
      "inLanguage": "en",
      "isAccessibleForFree": true,
      "datePublished": "2024-01-01",
      "dateModified": "2024-01-02",
      "author": {
        "@type": "Person",
        "name": "Your Name",
        "url": "https://github.com/yourusername"
      },
      "publisher": { "@type": "Person", "name": "Your Name" },
      "sameAs": [
        "https://github.com/yourusername/your-repo/tree/main/your-pwa-pwa"
      ],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    }</script>
</head>
<body class="in-menu">

    <!-- Main game container -->
    <main id="app">
        <canvas id="game-canvas"></canvas>
        <!-- Your game UI goes here -->
    </main>

    <!-- Scripts -->
    <script src="../shared/arcade.js"></script>
    <!-- Your game scripts -->
</body>
</html>
```

#### B. Copy manifest.json (Most Complete)
```bash
cp ../sector7-pwa/manifest.json .
# Customize this template:
```
{
    "background_color": "#05070f",
    "categories": ["games", "entertainment"],
    "description": "Your game description.",
    "display": "standalone",
    "display_override": ["standalone", "fullscreen"],
    "icons": [
        {"purpose": "any", "sizes": "192x192", "src": "icons/icon-192.svg", "type": "image/svg+xml"},
        {"purpose": "any", "sizes": "512x512", "src": "icons/icon-512.svg", "type": "image/svg+xml"},
        {"purpose": "any", "sizes": "192x192", "src": "icons/icon-192.png", "type": "image/png"},
        {"purpose": "any", "sizes": "512x512", "src": "icons/icon-512.png", "type": "image/png"},
        {"purpose": "maskable", "sizes": "512x512", "src": "icons/icon-512-maskable.png", "type": "image/png"}
    ],
    "lang": "en",
    "name": "Your Game Title",
    "orientation": "any",
    "scope": "./",
    "short_name": "Your Game",
    "start_url": "./",
    "theme_color": "#05070f"
}
```

#### C. Copy service-worker.js (Robust Error Handling)
```bash
cp ../sector7-pwa/service-worker.js .
# Customize this template:
```
/* ===== Your Game PWA Service Worker =====
 * Cache-first so the game is fully playable offline once installed.
 */
const CACHE_NAME = "your-pwa-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    // Add your game files here
    "./src/config.js",
    "./src/storage.js",
    "./src/world.js",
    "./src/render.js",
    "./src/stations.js",
    "./src/input.js",
    "./src/player.js",
    "./src/npcs.js",
    "./src/audio.js",
    "./src/ui.js",
    "./src/main.js",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    // addAll rejects the whole batch if any single file 404s, so add them
    // individually and let the cache fill in as far as it can.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(
                ASSETS.map((url) =>
                    cache.add(new Request(url, { cache: "reload" })).catch((err) => {
                        console.warn("SW: skipped", url, err);
                    })
                )
            )
        )
    );
});

self.addEventListener("activate", (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;
            return fetch(event.request)
                .then((res) => {
                    // Cache same-origin successes so the next load is offline.
                    if (res && res.ok && res.type === "basic") {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match("./index.html"));
        })
    );
});
```

### Step 3: Create Essential Game Files

#### Create styles.css
```bash
cat > styles.css << 'EOF'
/* Your game styles */
body { margin: 0; padding: 0; background: #05070f; color: #fff; }
#game-canvas { display: block; width: 100%; height: 100vh; }

/* Responsive design */
@media (max-width: 768px) {
    #game-canvas { height: 100dvh; }
}
EOF
```

#### Create README.md (Documentation)
```bash
cat > README.md << 'EOF'
# Your Game Title

Your game description.

## Playing

[Describe how to play your game]

## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Technical Details

- Plain static files, no build step, no dependencies
- Fully offline-capable
- Installable as PWA

## Files

index.html          shell + HUD markup
styles.css          game UI styles
manifest.json       PWA manifest
service-worker.js   offline shell
EOF
```

### Step 4: Create Source Structure (Like SECTOR 7)

Create the modular source structure:
```bash
mkdir -p src

cat > src/config.js << 'EOF'
// All tunable numbers for your game
const CONFIG = {
    // Game settings
    canvas: {
        width: 800,
        height: 600
    },
    
    // Game mechanics
    physics: {
        gravity: 0.5,
        friction: 0.1
    },
    
    // Scoring
    scores: {
        win: 100,
        lose: -50
    }
};

export default CONFIG;
EOF

cat > src/storage.js << 'EOF'
// Game state management
import CONFIG from './config.js';

const STORAGE_KEY = 'your-game-state';

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : getDefaultState();
    } catch (e) {
        return getDefaultState();
    }
}

function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
}

function getDefaultState() {
    return {
        score: 0,
        level: 1,
        unlocked: false,
        settings: {
            sound: true,
            haptics: true
        }
    };
}

export { loadState, saveState };
EOF

# Create other source files...
cat > src/main.js << 'EOF'
// Game initialization
import CONFIG from './config.js';
import { loadState, saveState } from './storage.js';

const state = loadState();

function init() {
    // Initialize your game here
    console.log('Game initialized with config:', CONFIG);
    console.log('Current state:', state);
}

export default { init };
EOF
```

### Step 5: Create Icons

Create minimal icons (you can generate these with online tools or copy from Sector 7):
```bash
mkdir -p icons

# Create placeholder icon files (replace with actual icons)
# You can generate these using:
# https://favicon.io/favicon-generator/ or similar tools
```

### Step 6: Create Hub Entry

Update the hub `index.html` to include your new game:
```bash
cat >> index.html << 'EOF'

<!-- Add to the hub's game grid -->
<div class="card" data-playable="your-pwa-pwa/" data-tags="games,arcade">
    <div class="tile">
        <canvas width="200" height="200" data-game="your-pwa-pwa"></canvas>
    </div>
    <h3>Your Game Title</h3>
    <p>Game description...</p>
    <div class="meta">
        <span class="tag">games</span>
        <span class="tag">arcade</span>
    </div>
</div>
EOF
```

### Step 7: Update README.md

Update the main README to include your new game in the table:
```bash
cat >> README.md << 'EOF'

### Your Game Title

[Your game description and technical details]

**Files:** `index.html`, `styles.css`, `src/`, `manifest.json`,
`service-worker.js`, `icons/`.
EOF
```

## Advanced Features to Add

### Install Prompt

Add to your index.html:
```html
<div id="install-prompt" class="install hidden">
    <p>Install Your Game to play offline, fullscreen.</p>
    <div class="row-actions">
        <button id="btn-install" class="btn primary small">Install</button>
        <button id="btn-install-later" class="btn ghost small">Later</button>
    </div>
</div>

<script>
// Install prompt logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-prompt').classList.remove('hidden');
});

// Install button handler
document.getElementById('btn-install').addEventListener('click', () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('App installed');
            }
            deferredPrompt = null;
        });
    }
});
</script>
```

### Testing

Create a test suite like SECTOR 7:
```bash
cat > tests/sim.test.js << 'EOF'
// Headless simulation tests
import CONFIG from '../src/config.js';
import { loadState, saveState } from '../src/storage.js';

describe('Game Logic', () => {
    test('initial state is valid', () => {
        const state = loadState();
        expect(state.score).toBe(0);
        expect(state.level).toBe(1);
    });
    
    test('config has all required properties', () => {
        expect(CONFIG.canvas.width).toBeGreaterThan(0);
        expect(CONFIG.canvas.height).toBeGreaterThan(0);
    });
});
EOF
```

## Deployment

Your PWA is ready! Deploy to GitHub Pages:

1. Push to your repository
2. GitHub Actions will automatically build and deploy
3. Your game will be available at `https://yourusername.github.io/your-repo/your-pwa-pwa/`

## Troubleshooting

### Service Worker Not Updating
```bash
# Force update by changing cache name in service-worker.js
const CACHE_NAME = "your-pwa-v2"; // Bump version
```

### Game Not Loading Offline
```bash
# Check service worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(registration => console.log('Service Worker registered'))
        .catch(error => console.log('Service Worker registration failed:', error));
}
```

This guide provides everything you need to create a professional PWA following the best practices from SECTOR 7 in this repository!