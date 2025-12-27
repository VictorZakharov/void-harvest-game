import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    WAVE_UNLOCK_FAST, WAVE_UNLOCK_SHOOTER, WAVE_UNLOCK_TANK, WAVE_UNLOCK_ICE,
    WAVE_SCALING_BOOST_1, WAVE_SCALING_BOOST_2, ENEMY_SCALING_PER_WAVE
} from '../constants.js';

/**
 * Handles the spawning logic for enemies.
 * Manages spawn locations using a smart radial system to ensure enemies
 * spawn off-screen but within a reasonable distance, avoiding valid play areas.
 */
export class EnemySpawner {
    /**
     * @param {THREE.Scene} scene - The Three.js scene to add enemy meshes to.
     * @param {Enemy[]} enemiesList - The reference to the game's enemy list to populate.
     * @param {HealthBarSystem} healthBarSystem - Use for registering enemy health bars at creation.
     */
    constructor(scene, enemiesList, healthBarSystem) {
        this.scene = scene;
        this.enemies = enemiesList;
        this.healthBarSystem = healthBarSystem;
    }

    /**
     * Spawns an enemy based on the current wave difficulty and player position.
     * @param {number} wave - The current game wave number.
     * @param {Player} player - The player entity to spawn around.
     * @param {Object} [customEnemies=null] - Optional configuration for allowed enemy types.
     */
    spawn(wave, player, customEnemies = null) {
        // Radial spawning with "Smart Bounds"
        // Calculate valid angular intervals where the spawn circle lies within map bounds

        const originX = player.x + (player.width / 2);
        const originY = player.y + (player.height / 2);
        const lightRadius = player.getLightRadius();
        const R = lightRadius * 1.5; // Spawn radius

        // 1. Find Valid Intervals
        // We need an angle theta such that:
        // originX + R*cos(theta) is in [-50, W+50]
        // originY + R*sin(theta) is in [-50, H+50]

        const minCos = (-50 - originX) / R;
        const maxCos = (CANVAS_WIDTH + 50 - originX) / R;
        const minSin = (-50 - originY) / R;
        const maxSin = (CANVAS_HEIGHT + 50 - originY) / R;

        // Subtraction list
        const badRanges = []; // {start, end}

        // Left Wall (PI)
        if (minCos > -1) {
            const span = Math.acos(Math.max(-1, Math.min(1, minCos))); // Half-width of bad cone
            badRanges.push({ start: Math.PI - span, end: Math.PI + span });
        }
        // Right Wall (0)
        if (maxCos < 1) {
            const span = Math.acos(Math.max(-1, Math.min(1, maxCos)));
            badRanges.push({ start: 2 * Math.PI - span, end: span });
        }
        // Top Wall (3PI/2)
        if (minSin > -1) {
            const ang1 = Math.asin(Math.max(-1, Math.min(1, minSin)));
            badRanges.push({ start: Math.PI - ang1, end: (2 * Math.PI + ang1) });
        }
        // Bottom Wall (PI/2)
        if (maxSin < 1) {
            const ang1 = Math.asin(Math.max(-1, Math.min(1, maxSin)));
            badRanges.push({ start: ang1, end: Math.PI - ang1 });
        }

        const bad = this.flatten(badRanges);

        // Invert to find Good Intervals
        const good = [];
        let cursor = 0;
        bad.forEach(b => {
            if (b.s > cursor) good.push({ s: cursor, e: b.s });
            cursor = Math.max(cursor, b.e);
        });
        if (cursor < 2 * Math.PI) good.push({ s: cursor, e: 2 * Math.PI });

        if (good.length === 0) return; // No valid spawn

        // Pick Random Angle
        const totalLen = good.reduce((sum, g) => sum + (g.e - g.s), 0);
        let pick = Math.random() * totalLen;
        let angle = 0;
        for (let g of good) {
            const len = g.e - g.s;
            if (pick <= len) {
                angle = g.s + pick;
                break;
            }
            pick -= len;
        }

        let x = originX + Math.cos(angle) * R;
        let y = originY + Math.sin(angle) * R;

        const type = this.getEnemyType(wave, customEnemies);
        this.createEnemy(x, y, type, wave);
    }

    /**
     * Internal method to instantiate and configure a new enemy.
     * @private
     * @param {number} x - Spawn X coordinate.
     * @param {number} y - Spawn Y coordinate.
     * @param {string} type - The type of enemy (e.g., 'basic', 'tank', 'shooter').
     * @param {number} wave - The current wave for scaling stats.
     * @returns {Enemy} The created enemy instance.
     */
    createEnemy(x, y, type, wave) {
        const enemy = new Enemy(x, y, type);

        // Scale enemy stats based on wave (10% HP and damage increase per wave after wave 1)
        let scaleFactor = 1 + ((wave - 1) * ENEMY_SCALING_PER_WAVE);

        // Extra scaling for extreme late game
        if (wave >= WAVE_SCALING_BOOST_1) {
            scaleFactor += (wave - WAVE_SCALING_BOOST_1) * 0.05;
        }
        if (wave >= WAVE_SCALING_BOOST_2) {
            scaleFactor += (wave - WAVE_SCALING_BOOST_2) * 0.1;
        }

        enemy.maxHealth = Math.floor(enemy.maxHealth * scaleFactor);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.floor(enemy.damage * scaleFactor);

        // Speed increases in late game
        if (wave >= 12) {
            enemy.speed *= 1 + ((wave - 12) * 0.04);
        }

        this.enemies.push(enemy);
        if (this.healthBarSystem) this.healthBarSystem.register(enemy);
        // this.scene.add(enemy.mesh); // Legacy: Mesh is now instanced or managed by HealthBarSystem
        return enemy;
    }

    /**
     * Determines the type of enemy to spawn based on wave progression and probabilities.
     * @private
     * @param {number} wave - The current wave number.
     * @param {Object} customEnemies - Custom enemy configuration filter.
     * @returns {string} The enemy type identifier.
     */
    getEnemyType(wave, customEnemies) {
        let type = 'basic';
        const rand = Math.random();

        if (wave >= 20) {
            if (rand < 0.35) type = 'tank';
            else if (rand < 0.6) type = 'shooter';
            else if (rand < 0.8) type = 'ice';
            else if (rand < 0.95) type = 'fast';
            else type = 'basic';
        } else if (wave >= WAVE_SCALING_BOOST_1) {
            if (rand < 0.3) type = 'tank';
            else if (rand < 0.55) type = 'shooter';
            else if (rand < 0.75) type = 'ice';
            else if (rand < 0.9) type = 'fast';
            else type = 'basic';
        } else if (wave >= 10) {
            if (rand < 0.2) type = 'tank';
            else if (rand < 0.45) type = 'shooter';
            else if (rand < 0.65) type = 'ice';
            else if (rand < 0.85) type = 'fast';
            else type = 'basic';
        } else if (wave >= WAVE_UNLOCK_ICE) {
            if (rand < 0.1) type = 'tank';
            else if (rand < 0.3) type = 'shooter';
            else if (rand < 0.45) type = 'ice';
            else if (rand < 0.7) type = 'fast';
            else type = 'basic';
        } else if (wave >= WAVE_UNLOCK_TANK) {
            if (rand < 0.1) type = 'tank';
            else if (rand < 0.35) type = 'shooter';
            else if (rand < 0.65) type = 'fast';
            else type = 'basic';
        } else if (wave >= WAVE_UNLOCK_SHOOTER) {
            if (rand < 0.25) type = 'shooter';
            else if (rand < 0.55) type = 'fast';
            else type = 'basic';
        } else if (wave >= WAVE_UNLOCK_FAST) {
            if (rand < 0.35) type = 'fast';
            else type = 'basic';
        }

        // Custom game mode: filter by enabled enemy types
        if (customEnemies) {
            if (!customEnemies[type]) {
                const enabledTypes = Object.keys(customEnemies).filter(t => customEnemies[t]);
                if (enabledTypes.length > 0) {
                    type = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
                } else {
                    type = 'basic';
                }
            }
        }
        return type;
    }

    flatten(ranges) {
        // Sort by start
        const clean = [];
        ranges.forEach(r => {
            let s = r.start % (2 * Math.PI);
            let e = r.end % (2 * Math.PI);
            if (s < 0) s += 2 * Math.PI;
            if (e < 0) e += 2 * Math.PI;
            if (e < s) {
                clean.push({ s: s, e: 2 * Math.PI });
                clean.push({ s: 0, e: e });
            } else {
                clean.push({ s, e });
            }
        });
        clean.sort((a, b) => a.s - b.s);

        if (clean.length === 0) return [];

        const union = [clean[0]];
        for (let i = 1; i < clean.length; i++) {
            let last = union[union.length - 1];
            if (clean[i].s < last.e) {
                last.e = Math.max(last.e, clean[i].e);
            } else {
                union.push(clean[i]);
            }
        }
        return union;
    }

    /**
     * Manages spawning for Training Dummy Mode.
     * Ensures 5 dummies of each type are present within player's light radius.
     * @param {Player} player 
     */
    updateTrainingMode(player) {
        const types = ['basic', 'fast', 'tank', 'shooter', 'ice'];
        const TARGET_COUNT = 5;

        // Count existing dummies by type
        const counts = {};
        types.forEach(t => counts[t] = 0);

        let activeDummies = 0;
        this.enemies.forEach(e => {
            if (e.isDummy && counts[e.type] !== undefined) {
                counts[e.type]++;
                activeDummies++;
            }
        });

        // Respawn check
        // We iterate types so we don't spawn too many at once if we wanted to throttle, 
        // but here we just fill voids immediately.
        types.forEach(type => {
            if (counts[type] < TARGET_COUNT) {
                this.spawnDummy(type, player);
            }
        });
    }

    spawnDummy(type, player) {
        const lightRadius = player.getLightRadius();

        // Spawn inside visible area (0.4 to 0.8 of radius)
        // so player sees them appear or they are ready nearby
        // User request: "respawn somewhere else in the visible radius"
        const r = lightRadius * (0.4 + Math.random() * 0.4);
        const theta = Math.random() * Math.PI * 2;

        const x = player.x + Math.cos(theta) * r;
        const y = player.y + Math.sin(theta) * r;

        // Create with Wave 1 stats
        const enemy = this.createEnemy(x, y, type, 1);
        enemy.isDummy = true;
        // Face outward from player center
        enemy.angle = Math.atan2(y - player.y, x - player.x);
    }
}
