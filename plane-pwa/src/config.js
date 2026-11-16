/*
 * Plane Shooter — tuning and content tables.
 *
 * Everything a designer might want to touch lives here. The simulation and
 * renderer both read from this file; nothing else should hard-code a number
 * that belongs to the game's feel.
 */

export const WIDTH = 400;
export const HEIGHT = 600;
export const STEP = 1 / 60;

export const SLUG = "plane-pwa/";
export const STORAGE_KEY = "plane-pwa";
export const STORAGE_VERSION = 2;

export const MAX_PARTICLES = 180;

export const THEMES = {
    neon: {
        label: "Neon",
        themeColor: "#ffaa00",
        bg: "#0a0a1a",
        bg2: "#05050d",
        grid: "#1a1a2a",
        plane: "#ffaa00",
        planeGrad: "#cc7700",
        bullet: "#fff6cc",
        enemy: "#ff4d4d",
        enemyAlt: "#ff8a3d",
        enemyBullet: "#ff9f43",
        powerup: "#00ffff",
        shield: "#66e0ff",
        text: "#f0f0f0",
        accent: "#ffaa00",
        danger: "#ff3355"
    },
    retro: {
        label: "Retro",
        themeColor: "#00ffff",
        bg: "#000000",
        bg2: "#050505",
        grid: "#151515",
        plane: "#00ffff",
        planeGrad: "#0088aa",
        bullet: "#ffff00",
        enemy: "#ff00ff",
        enemyAlt: "#ff66ff",
        enemyBullet: "#ff77ff",
        powerup: "#ff6600",
        shield: "#00ffff",
        text: "#f0f0f0",
        accent: "#00ffff",
        danger: "#ff3355"
    },
    forest: {
        label: "Forest",
        themeColor: "#9dff5a",
        bg: "#06140a",
        bg2: "#020a05",
        grid: "#0f2414",
        plane: "#9dff5a",
        planeGrad: "#3faa2a",
        bullet: "#eaffd0",
        enemy: "#ffaa00",
        enemyAlt: "#ffd166",
        enemyBullet: "#ffd166",
        powerup: "#ff4fd8",
        shield: "#b6ff7a",
        text: "#f0f0f0",
        accent: "#9dff5a",
        danger: "#ff4d4d"
    },
    ocean: {
        label: "Ocean",
        themeColor: "#4fd1ff",
        bg: "#05101f",
        bg2: "#020812",
        grid: "#0d2035",
        plane: "#4fd1ff",
        planeGrad: "#0a7fb5",
        bullet: "#d8f6ff",
        enemy: "#ff5c8a",
        enemyAlt: "#ff9bb5",
        enemyBullet: "#ff9bb5",
        powerup: "#00ffcc",
        shield: "#6ff7ff",
        text: "#f0f0f0",
        accent: "#4fd1ff",
        danger: "#ff3355"
    }
};

export const PLAYER = {
    w: 20,
    h: 14,
    r: 4,
    speed: 280,
    startX: WIDTH / 2,
    startY: HEIGHT - 64,
    margin: 16,
    minY: 48,
    maxY: HEIGHT - 24
};

export const BULLET = {
    speed: 560,
    r: 3,
    interval: 0.16,
    rapidInterval: 0.1,
    life: 1.6,
    max: 42,
    offsetY: 14,
    spread: 0.14
};

export const ENEMY_BULLET = {
    r: 3,
    speed: 170,
    max: 60,
    life: 7
};

export const ENEMY_TYPES = {
    drifter: {
        r: 10,
        hp: 1,
        value: 10,
        speed: 80,
        fireInterval: 0
    },
    weaver: {
        r: 9,
        hp: 1,
        value: 20,
        speed: 90,
        amp: 48,
        freq: 2.2,
        fireInterval: 0
    },
    diver: {
        r: 9,
        hp: 1,
        value: 30,
        speed: 95,
        track: 120,
        fireInterval: 0
    },
    gunner: {
        r: 12,
        hp: 2,
        value: 40,
        speed: 62,
        stopY: 165,
        hold: 7,
        fireInterval: 1.5,
        bulletSpeed: 175
    },
    tank: {
        r: 16,
        hp: 4,
        value: 70,
        speed: 46,
        fireInterval: 2.8,
        bulletSpeed: 150,
        spread: 0.2
    }
};

export const POWERUPS = {
    rapid: {
        label: "RAPID",
        short: "R",
        weight: 30,
        duration: 10
    },
    spread: {
        label: "SPREAD",
        short: "S",
        weight: 30,
        duration: 10
    },
    shield: {
        label: "SHIELD",
        short: "H",
        weight: 25,
        duration: 0
    },
    repair: {
        label: "REPAIR",
        short: "+",
        weight: 15,
        duration: 0
    }
};

export const WAVE = {
    duration: 20,
    scoreBonus: 100,
    maxEnemies: 12,
    spawnBase: 1.25,
    spawnMin: 0.45,
    speedCap: 2.2,
    bulletSpeedCap: 1.8,
    maxMultiplier: 10
};

export const HIT = {
    lives: 3,
    maxLives: 5,
    invuln: 1.8,
    shieldInvuln: 1.2,
    clearRadius: 110
};
