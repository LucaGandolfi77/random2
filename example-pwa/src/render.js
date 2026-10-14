// Star Explorer Game Render
// Canvas rendering and visual effects

import CONFIG from './config.js';

let canvas = null;
let ctx = null;
let camera = { x: 0, y: 0, zoom: 1 };

function initializeRender() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas resolution
    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;
    
    // Enable image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

function clearScreen() {
    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add star field effect
    drawStarField();
}

function drawStarField() {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function updateCamera(target) {
    // Camera follows player with smoothing
    const targetX = target.x - canvas.width / 2;
    const targetY = target.y - canvas.height / 2;
    
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
    
    // Apply zoom effect
    camera.zoom = 1 + Math.sin(Date.now() * 0.001) * 0.05;
}

function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - canvas.width / 2) / camera.zoom + camera.x,
        y: (screenY - canvas.height / 2) / camera.zoom + camera.y
    };
}

function worldToScreen(worldX, worldY) {
    return {
        x: (worldX - camera.x) * camera.zoom + canvas.width / 2,
        y: (worldY - camera.y) * camera.zoom + canvas.height / 2
    };
}

function render(player, asteroids, particles) {
    ctx.save();
    
    // Apply camera transform
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    // Draw star field
    drawStarField();
    
    // Draw asteroids
    asteroids.forEach(asteroid => {
        renderAsteroid(asteroid);
    });
    
    // Draw particles
    particles.forEach(particle => {
        renderParticle(particle);
    });
    
    // Draw player
    renderPlayer(player);
    
    ctx.restore();
    
    // Draw UI elements (screen space)
    drawUIElements(player);
}

function renderPlayer(player) {
    ctx.save();
    
    // Shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.fillStyle = '#64748b';
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
    
    // Main ship body
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
    
    // Shield effect
    if (player.shieldActive) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width * 1.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Cockpit
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(player.x - 4, player.y - 8, 8, 15);
    
    ctx.restore();
}

function renderAsteroid(asteroid) {
    ctx.save();
    
    // Shadow
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(asteroid.x, asteroid.y, asteroid.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Asteroid body
    ctx.shadowBlur = 0;
    const gradient = ctx.createRadialGradient(asteroid.x, asteroid.y, 0, asteroid.x, asteroid.y, asteroid.size);
    gradient.addColorStop(0, '#94a3b8');
    gradient.addColorStop(1, '#64748b');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(asteroid.x, asteroid.y, asteroid.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Surface detail
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(asteroid.x + asteroid.size * 0.3, asteroid.y - asteroid.size * 0.3, asteroid.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function renderParticle(particle) {
    const age = 1.0 - particle.lifetime;
    
    ctx.save();
    ctx.globalAlpha = particle.lifetime;
    
    // Different particle types
    if (particle.damage) {
        // Bullet
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Explosion
        const size = 2 + age * 8;
        ctx.fillStyle = age > 0.5 ? '#fbbf24' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawUIElements(player) {
    // Draw minimap
    drawMinimap(player, asteroids);
    
    // Draw crosshair
    drawCrosshair(player);
}

function drawMinimap(player, asteroids) {
    const minimap = document.getElementById('minimap');
    if (!minimap) return;
    
    const ctx = minimap.getContext('2d');
    ctx.clearRect(0, 0, minimap.width, minimap.height);
    
    // Mini-map background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, minimap.width, minimap.height);
    
    // Player position
    const playerX = player.x / CONFIG.canvas.width * minimap.width;
    const playerY = player.y / CONFIG.canvas.height * minimap.height;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Asteroids
    asteroids.forEach(asteroid => {
        const ax = asteroid.x / CONFIG.canvas.width * minimap.width;
        const ay = asteroid.y / CONFIG.canvas.height * minimap.height;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(ax, ay, asteroid.size / 20, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawCrosshair(player) {
    if (!player.isAlive) return;
    
    const mousePos = { x: player.x + 100, y: player.y }; // Simulated mouse position
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(mousePos.x, mousePos.y);
    ctx.lineTo(mousePos.x + 20, mousePos.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(mousePos.x, mousePos.y);
    ctx.lineTo(mousePos.x, mousePos.y + 20);
    ctx.stroke();
    
    ctx.restore();
}

export {
    initializeRender,
    clearScreen,
    updateCamera,
    screenToWorld,
    worldToScreen,
    render
};