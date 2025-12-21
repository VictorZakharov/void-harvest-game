// ==================== GAME CLASS ====================
import {
    CANVAS_WIDTH, CANVAS_HEIGHT, GAME_DURATION, BASE_CAMERA_HEIGHT,
    WAVE_DURATION, INITIAL_SPAWN_RATE, MIN_SPAWN_RATE, SPAWN_RATE_DECREASE,
    PARTICLE_COUNT_HIT, PARTICLE_COUNT_DEATH,
    WEATHER_DURATION, WEATHER_FADE_TIME, WEATHER_WARNING_TIME,
    WEATHER_INTERVAL_MIN, WEATHER_INTERVAL_MAX, WEATHER_SLOW_AMOUNT,
    HEALTH_DROP_BASE_RATE, HEALTH_RESTORE_AMOUNT
} from './constants.js';
import { BIOMES, WEATHER_TYPES, DEFAULT_FOG_DENSITY } from './biomes.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { EnemySpawner } from './entities/enemy-spawner.js';
import { BulletManager } from './entities/bullet-manager.js';
import { ItemManager } from './entities/item-manager.js';
import { ParticleManager } from './entities/particle-manager.js';
import { Item } from './entities/Item.js';
import { Particle } from './particles.js';
import { TextureGenerator } from './texture-generator.js';
import { WeatherSystem } from './weather-system.js';
import { InputHandler } from './input.js';
import { META_UPGRADES, SKILLS } from './skills.js';
import { UIManager } from './ui.js';
import { StatsManager } from './stats.js';
import * as THREE from 'three';

import { RenderingManager } from './RenderingManager.js';
import { LightingManager } from './LightingManager.js';
import { PersistenceManager } from './PersistenceManager.js';
import { WeatherManager } from './WeatherManager.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.input = new InputHandler(this.canvas);
        this.state = 'start'; // start, playing, paused, gameover
        this.gameLoopRunning = false;

        this.persistence = new PersistenceManager();
        this.metaProgress = this.persistence.loadMetaProgress();
        this.totalSouls = this.metaProgress.souls || 0;

        this.ui = new UIManager(this);

        // Initialize stats early for managers
        this.stats = this.persistence.stats;

        // Initialize Managers
        this.rendering = new RenderingManager(this.canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.scene = this.rendering.scene; // Helper reference

        this.lighting = new LightingManager(this.scene);

        this.init3D();

        this.reset();
    }

    init3D() {
        // Create Ground
        const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
        this.groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x224422,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Initialize Weather System
        this.weatherSystem = new WeatherSystem(this.scene);
        this.weather = new WeatherManager(this.weatherSystem);

        // Field Boundaries
        const boundaryGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 2, 0),
            new THREE.Vector3(CANVAS_WIDTH, 2, 0),
            new THREE.Vector3(CANVAS_WIDTH, 2, CANVAS_HEIGHT),
            new THREE.Vector3(0, 2, CANVAS_HEIGHT),
            new THREE.Vector3(0, 2, 0)
        ]);
        const boundaryMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
        const boundaryLine = new THREE.Line(boundaryGeo, boundaryMat);
        this.scene.add(boundaryLine);

        // Initialize lists
        this.enemies = [];

        // MANAGERS
        this.particleManager = new ParticleManager(this.scene);
        this.enemySpawner = new EnemySpawner(this.scene, this.enemies);
        this.bulletManager = new BulletManager(this.scene, this.stats, {
            createParticles: (x, y, c, count) => this.particleManager.create(x, y, c, count),
            onGameOver: () => this.gameOver(),
            onCameraShake: (amount) => { this.camera.shake = amount; },
            onEnemyDeath: (enemy) => this.onEnemyDeath(enemy),
            onEnemyHit: (enemy, damage) => { /* Optional hook */ }
        });

        this.itemManager = new ItemManager(this.scene, this.player, this.metaProgress, {
            onLevelUp: () => this.ui.showLevelUpScreen()
        });
    }

    reset(commitHistory = false) {
        // Clear existing objects
        if (this.enemies) {
            this.enemies.forEach(e => this.scene.remove(e.mesh));
            this.enemies.length = 0;
        }
        if (this.bulletManager) this.bulletManager.clear();
        if (this.itemManager) this.itemManager.clear();
        if (this.particleManager) this.particleManager.clear();

        // Select Biome
        if (this.customBiome) {
            this.currentBiome = BIOMES[this.customBiome.toUpperCase()] || BIOMES.NEUTRAL;
        } else {
            let keys = Object.keys(BIOMES);
            const lastId = this.metaProgress.lastBiomeId;
            if (lastId) {
                const filtered = keys.filter(k => BIOMES[k].id !== lastId);
                if (filtered.length > 0) keys = filtered;
            }
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            this.currentBiome = BIOMES[randomKey];
        }

        // Only save history if this is a REAL game start
        if (commitHistory && !this.customBiome) {
            this.metaProgress.lastBiomeId = this.currentBiome.id;
            this.persistence.saveMeta(this.metaProgress);
        }

        this.applyBiomeVisuals();

        // Weather System
        if (this.weather) {
            this.weather.weatherState = 'none';
            this.weather.weatherTimer = 0;
            this.weather.nextWeatherTimer = Math.random() * (WEATHER_INTERVAL_MAX - WEATHER_INTERVAL_MIN) + WEATHER_INTERVAL_MIN;
        }
        this.baseFogDensity = DEFAULT_FOG_DENSITY;

        if (this.weatherSystem) {
            this.weatherSystem.stopWeather();
        }

        // Create fresh player
        this.player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        if (this.scene && this.player.mesh) this.scene.add(this.player.mesh);
        if (this.scene && this.player.vortexMesh) this.scene.add(this.player.vortexMesh);

        // Update managers with new player instance
        if (this.itemManager) this.itemManager.player = this.player;

        this.applyMetaUpgrades();

        // Reset all game timers and counters
        this.spawnTimer = 0;
        this.spawnRate = INITIAL_SPAWN_RATE;
        this.difficultyTimer = 0;
        this.gameTime = 0;
        this.kills = 0;
        this.wave = 1;

        // Reset camera
        this.camera = { shake: 0 };

        // Reset input state
        if (this.input) {
            this.input.mouseDown = false;
        }

        // Initialize stats
        this.persistence.resetRunStats();
        this.stats = this.persistence.stats;
        if (this.bulletManager) this.bulletManager.stats = this.stats;

        // Trigger debug weather
        if (this.debugWeather && this.weather) {
            this.weather.triggerWeather(this.currentBiome);
        }
    }

    applyMetaUpgrades() {
        for (let upgrade of META_UPGRADES) {
            const level = this.metaProgress.upgrades[upgrade.id] || 0;
            if (level > 0) {
                upgrade.apply(this.player, level);
            }
        }
    }

    applyCustomSkills() {
        if (!this.customSkills) return;
        this.customSkillIds = new Set();
        for (let skillId in this.customSkills) {
            const level = this.customSkills[skillId];
            if (level > 0) {
                const skill = SKILLS.find(s => s.id === skillId);
                if (skill) {
                    this.customSkillIds.add(skillId);
                    for (let i = 0; i < level; i++) {
                        skill.apply(this.player);
                    }
                }
            }
        }
    }

    applyBiomeVisuals() {
        if (!this.currentBiome) return;
        const texture = TextureGenerator.generateGround(this.currentBiome.id);
        if (this.groundMaterial) {
            this.groundMaterial.map = texture;
            this.groundMaterial.color.setHex(0xffffff);
            this.groundMaterial.roughness = 1.0;
            this.groundMaterial.metalness = 0.0;
            this.groundMaterial.needsUpdate = true;
        }
        if (this.scene && this.scene.fog) {
            this.scene.fog.color.setHex(this.currentBiome.fogColor);
            this.baseFogDensity = this.currentBiome.fogDensity || DEFAULT_FOG_DENSITY;
        }
        if (this.scene) {
            this.scene.background.setHex(this.currentBiome.fogColor);
        }
        if (this.weather && this.weather.weatherState === 'active' && this.weatherSystem) {
            this.weatherSystem.startWeather(this.currentBiome.weather);
        }
    }

    start() {
        const savedCustomEnemies = this.customEnemies;
        const savedCustomSkills = this.customSkills;
        const savedCustomBiome = this.customBiome;
        const savedDebugWeather = this.debugWeather;

        this.reset(true);

        this.customEnemies = savedCustomEnemies;
        this.customSkills = savedCustomSkills;
        this.customBiome = savedCustomBiome;
        this.debugWeather = savedDebugWeather;

        if (this.customBiome) {
            this.currentBiome = BIOMES[this.customBiome.toUpperCase()] || BIOMES.NEUTRAL;
        }

        this.applyBiomeVisuals();
        this.state = 'playing';
        this.lastTime = performance.now();
        this.applyCustomSkills();

        if (!this.gameLoopRunning) {
            this.gameLoopRunning = true;
            this.gameLoop();
        }
    }

    gameLoop() {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        if (this.input.escapePressed) {
            this.input.escapePressed = false;
            this.togglePause();
        }

        if (this.input.spacePressed) {
            this.input.spacePressed = false;
            this.toggleFreeze();
        }

        if (this.state === 'frozen') {
            this.handleFrozenState();
        }

        if (this.state === 'playing') {
            this.update(dt);
        }

        if (this.state !== 'start') {
            this.render3D();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    handleFrozenState() {
        let hasResumeInput = false;
        ['w', 'a', 's', 'd'].forEach(k => {
            if (this.input.keys[k]) {
                const ignored = this.manualFreeze && this.ignoreKeys && this.ignoreKeys.has(k);
                if (!ignored) hasResumeInput = true;
            } else {
                if (this.manualFreeze && this.ignoreKeys) this.ignoreKeys.delete(k);
            }
        });

        if (this.input.mouseDown) {
            const ignored = this.manualFreeze && this.ignoreMouse;
            if (!ignored) hasResumeInput = true;
        } else {
            if (this.manualFreeze) this.ignoreMouse = false;
        }

        if (hasResumeInput) {
            this.unfreeze();
        } else {
            if (this.ui) this.ui.showFrozenMessage(true);
        }
    }

    /**
     * Updates game state, including player, enemies, spawning, and weather.
     * @param {number} dt - Time since last frame in milliseconds.
     */
    update(dt) {
        this.gameTime++;

        if (this.weather) {
            const newFog = this.weather.update(this.player, this.currentBiome, DEFAULT_FOG_DENSITY);
            if (newFog !== null) this.baseFogDensity = newFog;
        }

        if (this.gameTime >= GAME_DURATION * 60) {
            this.win();
            return;
        }

        const target = this.rendering.getMouseWorldPosition(this.input.mouseX, this.input.mouseY);
        this.lighting.update(target, this.player);

        this.player.update(this.input, target.x, target.z, this.rendering.camYaw || 0);

        if (this.player.shoot(this.input.mouseDown)) {
            this.bulletManager.createPlayerBullets(this.player);
        }

        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnRate) {
            this.spawnTimer = 0;
            this.enemySpawner.spawn(this.wave, this.player, this.customEnemies);
        }

        this.difficultyTimer++;
        if (this.difficultyTimer >= WAVE_DURATION) {
            this.difficultyTimer = 0;
            this.spawnRate = Math.max(MIN_SPAWN_RATE, this.spawnRate - SPAWN_RATE_DECREASE);
            this.wave++;
        }

        const playerBounds = this.player.getBounds();
        let speedMod = (this.weather && this.weather.weatherState === 'active') ? (1 - WEATHER_SLOW_AMOUNT) : 1;

        if (this.player.triggerShockwave) {
            this.handleShockwave();
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            let currentSpeedMod = speedMod;

            if (this.player.stasisUnlocked) {
                const dx = (enemy.x + enemy.width / 2) - (this.player.x + this.player.width / 2);
                const dy = (enemy.y + enemy.height / 2) - (this.player.y + this.player.height / 2);
                if (Math.sqrt(dx * dx + dy * dy) < this.player.stasisRadius) {
                    currentSpeedMod *= (1 - this.player.stasisSlow);
                }
            }

            enemy.update(playerBounds.centerX, playerBounds.centerY, currentSpeedMod);

            if (enemy.canShoot()) {
                this.bulletManager.createEnemyBullet(enemy, playerBounds.centerX, playerBounds.centerY);
            }

            if (enemy.collidesWith(this.player)) {
                this.handlePlayerCollision(enemy, i);
            }
        }

        this.bulletManager.update(this.player, this.enemies);
        this.itemManager.update();
        this.particleManager.update();

        if (this.camera.shake > 0) this.camera.shake--;

        this.ui.updateHUD();
    }

    handleShockwave() {
        this.player.triggerShockwave = false;
        this.particleManager.create(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#00ffff', 50);

        const shockwaveRadius = (this.player.shockwaveForce || 10) * 10;
        const affectedEnemies = [];
        let totalResistance = 0;

        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            const dx = (enemy.x + enemy.width / 2) - (this.player.x + this.player.width / 2);
            const dy = (enemy.y + enemy.height / 2) - (this.player.y + this.player.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < shockwaveRadius) {
                affectedEnemies.push({ enemy, dist, dx, dy });
                totalResistance += (enemy.health || 30);
            }
        }

        const baseResistance = 100;
        let crowdFactor = totalResistance > baseResistance ? baseResistance / totalResistance : 1.0;
        if (crowdFactor < 0.2) crowdFactor = 0.2;

        for (const item of affectedEnemies) {
            const { enemy, dist, dx, dy } = item;
            let nx, ny;
            if (dist < 1) {
                const angle = Math.random() * Math.PI * 2;
                nx = Math.cos(angle);
                ny = Math.sin(angle);
            } else {
                nx = dx / dist;
                ny = dy / dist;
            }
            const distanceToCover = shockwaveRadius - dist;
            const initialSpeed = (distanceToCover / 10) * crowdFactor;
            enemy.applyKnockback(nx * initialSpeed, ny * initialSpeed, 30);
        }
    }

    handlePlayerCollision(enemy, index) {
        const blocked = this.player.shieldActive;
        if (!blocked) {
            this.stats.damageReceived[enemy.type] += enemy.damage;
        }

        if (this.player.takeDamage(enemy.damage)) {
            this.gameOver();
            return;
        }

        if (!blocked) {
            this.particleManager.create(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_HIT);
            this.camera.shake = 10;
        } else {
            this.particleManager.create(enemy.x, enemy.y, '#00ffff', 10);
            this.camera.shake = 5;
        }

        this.scene.remove(enemy.mesh);
        this.enemies.splice(index, 1);
    }

    /**
     * Renders the 3D scene, updating fog, camera, and all visible meshes.
     */
    render3D() {
        this.rendering.updateFog(this.baseFogDensity, BASE_CAMERA_HEIGHT, DEFAULT_FOG_DENSITY);
        this.rendering.updateCamera(this.player, this.input);

        const cursorTarget = this.lighting.getCursorTarget();
        this.player.updateMesh();

        this.enemies.forEach(e => {
            let visibility = 0.0;
            if (cursorTarget) {
                const dCursor = Math.sqrt((e.x - cursorTarget.x) ** 2 + (e.y - cursorTarget.z) ** 2);
                const radiusMultiplier = this.player ? (1 + this.player.lightRadiusBonus) : 1;
                const lightHeight = 300 * radiusMultiplier;
                const cEnd = lightHeight * Math.tan(Math.PI / 3);
                const cStart = lightHeight * Math.tan(Math.PI / 6);

                if (dCursor < cEnd) {
                    if (dCursor < cStart) visibility = 1.0;
                    else visibility = 1.0 - ((dCursor - cStart) / (cEnd - cStart));
                }
            }

            if (visibility < 1.0 && this.bulletManager) {
                for (let b of this.bulletManager.bullets) {
                    if (!b.isPlayer) continue;
                    const dB = Math.sqrt((e.x - b.x) ** 2 + (e.y - b.y) ** 2);
                    if (dB < 150) {
                        visibility = Math.max(visibility, 1.0 - (dB / 150));
                        if (visibility >= 1.0) break;
                    }
                }
            }

            e.updateMesh(visibility, this.currentBiome?.fogColor || 0x000000, this.rendering.camera3D);
        });

        this.bulletManager.updateMeshes();
        this.itemManager.updateMeshes();
        this.rendering.applyShake(this.camera.shake, this.state);
        this.rendering.render();
    }

    onEnemyDeath(enemy) {
        this.kills++;
        this.stats.enemiesKilled[enemy.type]++;
        this.player.onKill();
        this.particleManager.create(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_DEATH);
        this.itemManager.spawnXP(enemy.x, enemy.y, enemy.xpValue);
        this.scene.remove(enemy.mesh);
        const index = this.enemies.indexOf(enemy);
        if (index > -1) this.enemies.splice(index, 1);
    }

    gameOver() {
        this.state = 'gameover';
        this.camera.shake = 0;
        const souls = this.getRunSouls();
        this.totalSouls += souls;
        this.metaProgress.souls = this.totalSouls;
        this.persistence.saveMeta(this.metaProgress);
        this.stats.finalWave = this.wave;
        this.stats.survived = false;
        this.ui.showGameOverStats(souls);
    }

    win() {
        this.state = 'gameover';
        this.camera.shake = 0;
        const souls = Math.floor(this.kills / 3) + 50;
        this.totalSouls += souls;
        this.metaProgress.souls = this.totalSouls;
        this.persistence.saveMeta(this.metaProgress);
        this.stats.finalWave = this.wave;
        this.stats.survived = true;
        this.ui.showGameOverStats(souls, true);
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.ui.showPauseScreen();
        } else if (this.state === 'paused') {
            this.ui.resumeGame();
        } else if (this.state === 'frozen') {
            this.state = 'paused';
            this.ui.showPauseScreen();
            this.ui.showFrozenMessage(false);
        }
    }

    toggleFreeze() {
        if (this.state === 'playing') {
            this.setFrozen(true);
            this.manualFreeze = true;
            this.ignoreKeys = new Set();
            ['w', 'a', 's', 'd'].forEach(k => {
                if (this.input.keys[k]) this.ignoreKeys.add(k);
            });
            this.ignoreMouse = this.input.mouseDown;
        } else if (this.state === 'frozen') {
            this.setFrozen(false);
            this.manualFreeze = false;
        }
    }

    setFrozen(frozen) {
        if (frozen) {
            this.state = 'frozen';
            this.ui.showFrozenMessage(true);
            this.lastTime = performance.now();
        } else {
            this.unfreeze();
        }
    }

    unfreeze() {
        this.state = 'playing';
        this.manualFreeze = false;
        this.ui.showFrozenMessage(false);
        this.lastTime = performance.now();
    }

    updateGlobalLights() {
        this.lighting.updateGlobalLights(this.player);
    }

    loadPreviousStats() {
        return this.persistence.loadPreviousStats();
    }

    saveCurrentStats() {
        this.persistence.saveRun(this.player.level);
    }

    loadMetaProgress() {
        return this.persistence.loadMetaProgress();
    }

    saveMetaProgress() {
        this.persistence.saveMeta(this.metaProgress);
    }

    getRunSouls() {
        return Math.floor(this.kills / 5);
    }
}
