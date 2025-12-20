// ============================================
// GAME CONFIGURATION
// ============================================
// Centralized constants for easy game balancing and tuning
// Similar to SCSS variables pattern for maintainability

// ============================================
// CANVAS & LAYOUT
// ============================================

export const CANVAS_WIDTH = 3000;
export const CANVAS_HEIGHT = 3000;
export const BASE_CAMERA_HEIGHT = 800; // Reference height for fog density scaling

// ============================================
// GAME RULES
// ============================================

export const GAME_DURATION = 600; // seconds (10 minutes)
export const MAX_LEVEL = 100;

// ============================================
// WAVE & SPAWN SYSTEM
// ============================================

export const WAVE_DURATION = 900; // frames (15 seconds at 60fps)
export const INITIAL_SPAWN_RATE = 90; // frames between spawns
export const MIN_SPAWN_RATE = 20; // minimum frames between spawns
export const SPAWN_RATE_DECREASE = 2; // frames decreased per wave

// Wave thresholds for enemy unlocks
export const WAVE_UNLOCK_FAST = 3;
export const WAVE_UNLOCK_SHOOTER = 5;
export const WAVE_UNLOCK_TANK = 7;
export const WAVE_UNLOCK_ICE = 8;

// Late game scaling thresholds
export const WAVE_SCALING_BOOST_1 = 15;
export const WAVE_SCALING_BOOST_2 = 25;

// ============================================
// ENEMY SPRITE COLORS
// ============================================
// Main colors and shading for enemy sprites
// UI indicator colors are in styles/_variables.scss

export const ENEMY_SPRITE_COLORS = {
    basic: {
        main: '#ff0000',
        dark: '#660000'
    },
    fast: {
        main: '#ff3399',
        dark: '#990055'
    },
    tank: {
        main: '#ff00ff',
        dark: '#660066'
    },
    shooter: {
        main: '#ff8800',
        dark: '#664400'
    },
    ice: {
        main: '#66ccff',
        medium: '#004488',
        light: '#aaddff'
    }
};

// ============================================
// PROGRESSION & XP
// ============================================

export const XP_LEVEL_MULTIPLIER = 1.5; // XP required increases by this factor per level
export const INITIAL_XP_REQUIRED = 10; // XP needed for level 2

// ============================================
// SKILL SYSTEM
// ============================================

export const SKILL_CHOICES_BASE = 3; // Default number of skill options
export const SKILL_CHOICES_WITH_EXTRA = 4; // With "Extra Choice" skill
export const MAX_SKILL_LEVEL = 3; // Maximum level for most skills
export const EXTRA_CHOICE_MAX_LEVEL = 1; // Extra Choice is unique

// ============================================
// PLAYER DEFAULTS
// ============================================

export const PLAYER_BASE_HEALTH = 100;
export const PLAYER_BASE_SPEED = 3;
export const PLAYER_BASE_DAMAGE = 10;
export const PLAYER_BASE_FIRE_RATE = 18; // frames between shots
export const PLAYER_SIZE = 12; // radius
export const PLAYER_BASE_LIGHT_RADIUS = 500;

// ============================================
// ITEM & PICKUP SYSTEM
// ============================================

export const ITEM_MAGNET_BASE_RANGE = 80; // pixels
export const ITEM_MOVE_SPEED = 4;
export const HEALTH_DROP_BASE_RATE = 0.05; // 5% base chance
export const HEALTH_RESTORE_AMOUNT = 20;
export const XP_ITEM_BASE_VALUE = 5;

// ============================================
// BULLET SYSTEM
// ============================================

export const BULLET_BASE_SPEED = 8;
export const BULLET_BASE_RANGE = 500;
export const BULLET_SIZE = 4;
export const BULLET_COLOR = '#00ffff';

// ============================================
// VISUAL EFFECTS
// ============================================

export const PARTICLE_LIFETIME = 30; // frames
export const PARTICLE_COUNT_HIT = 5;
export const PARTICLE_COUNT_DEATH = 10;

// ============================================
// BALANCE MODIFIERS
// ============================================

// Enemy scaling per wave
export const ENEMY_SCALING_PER_WAVE = 0.1; // 10% increase per wave

// Note: Skill-specific balance values (damage bonus, fire rate, etc.)
// are defined directly in skills.js alongside their implementation.

// ============================================
// WEATHER SYSTEM
// ============================================

export const WEATHER_DURATION = 1200; // 20 seconds at 60fps
export const WEATHER_WARNING_TIME = 300; // 5 seconds warning
export const WEATHER_FADE_TIME = 120; // 2 seconds fade in/out

export const WEATHER_INTERVAL_MIN = 3600; // 60 seconds
export const WEATHER_INTERVAL_MAX = 7200; // 120 seconds
export const WEATHER_SLOW_AMOUNT = 0.15; // 15% slow

