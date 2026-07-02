import * as THREE from 'three';
import { BIOMES, WEATHER_TYPES, DEFAULT_FOG_DENSITY } from './biomes.js';
import { Player } from './entities/Player.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, INITIAL_SPAWN_RATE, WEATHER_INTERVAL_MIN, WEATHER_INTERVAL_MAX, GAME_DURATION } from './constants.js';
import { TextureGenerator } from './texture-generator.js';
import { META_UPGRADES, SKILLS } from './skills.js';

export class GameSessionManager {
    constructor(game) {
        this.game = game;
    }

    start() {
        const game = this.game;
        const savedCustomEnemies = game.customEnemies;
        const savedCustomSkills = game.customSkills;
        const savedCustomBiome = game.customBiome;
        const savedDebugWeather = game.debugWeather;
        const savedIsMultiplayer = game.isMultiplayer;
        const savedFriendlyFire = game.friendlyFire;
        const savedSpawnRate = game.customSpawnRate;
        const savedMaxEnemies = game.customMaxEnemies;

        // Ensure Multiplayer flag is set & persisted BEFORE reset calls check it for player creation
        game.isMultiplayer = savedIsMultiplayer;

        // Reset game state (recreates players based on isMultiplayer)
        this.reset(true);

        // Restore Flags that reset() might have cleared or that we want to persist
        game.isMultiplayer = savedIsMultiplayer;
        game.friendlyFire = savedFriendlyFire;
        game.customEnemies = savedCustomEnemies;
        game.customSkills = savedCustomSkills;
        game.customBiome = savedCustomBiome;
        game.debugWeather = savedDebugWeather;
        game.debugPerf = game.customDebugPerf;
        game.customSpawnRate = savedSpawnRate;
        game.customMaxEnemies = savedMaxEnemies;

        if (game.customBiome) {
            game.currentBiome = BIOMES[game.customBiome.toUpperCase()] || BIOMES.NEUTRAL;
        }

        // Finalize Custom Game Flag (Restored from saved variables)
        game.isCustomGame = !!(
            (game.customEnemies && Object.values(game.customEnemies).some(v => v === true)) ||
            (game.customSkills && Object.keys(game.customSkills).length > 0) ||
            game.customBiome ||
            game.customSpawnRate ||
            game.customMaxEnemies
        );

        this.applyBiomeVisuals();
        game.state = 'playing';
        game.lastTime = performance.now();
        this.applyCustomSkills();

        // Autoshoot State (Refresh on start)
        if (game.trainingMode) {
            game.autoshootEnabled = false;
        } else {
            game.autoshootEnabled = (game.metaProgress.autoshootEnabled !== undefined) ? game.metaProgress.autoshootEnabled : true;
        }
        game.autoshootOverrideTimer = 0;

        // Show Hint at start (Always, unless training mode)
        if (game.ui.showStatusMessage && !game.trainingMode) {
            const status = game.autoshootEnabled ? "[Q] Autoshoot: ON" : "[Q] Autoshoot: OFF";
            game.ui.showStatusMessage(status, 3000);
        }

        if (!game.gameLoopRunning) {
            game.gameLoopRunning = true;
            // Initial Input State
            game.lastQ = false;
            game.gameLoop();
        }
    }

    reset(commitHistory = false) {
        const game = this.game;

        // 1. Standard Cleanup via References
        if (game.players) {
            game.players.forEach(p => {
                if (p && p.visuals) p.visuals.dispose();
            });
        } else if (game.player && game.player.visuals) {
            game.player.visuals.dispose();
        }

        // 2. Robust Safety Sweep (Fixes "Ghost Players" and Texture Warnings)
        if (game.scene) {
            for (let i = game.scene.children.length - 1; i >= 0; i--) {
                const child = game.scene.children[i];
                if (child.name === 'PlayerGroup') {
                    game.scene.remove(child);
                }
            }
        }

        if (game.enemies) {
            game.enemies.forEach(e => game.scene.remove(e.mesh));
            game.enemies.length = 0;
        }
        if (game.bulletManager) game.bulletManager.clear();
        if (game.itemManager) game.itemManager.clear();
        if (game.particleManager) game.particleManager.clear();
        if (game.healthBarSystem) game.healthBarSystem.clear();
        if (game.overheadUI) game.overheadUI.clear();

        // Reset players array
        game.players = [];

        // Select Biome
        if (game.customBiome) {
            game.currentBiome = BIOMES[game.customBiome.toUpperCase()] || BIOMES.NEUTRAL;
        } else {
            let keys = Object.keys(BIOMES);
            const lastId = game.metaProgress.lastBiomeId;
            if (lastId) {
                const filtered = keys.filter(k => BIOMES[k].id !== lastId);
                if (filtered.length > 0) keys = filtered;
            }
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            game.currentBiome = BIOMES[randomKey];
        }

        // Only save history if this is a REAL game start
        if (commitHistory && !game.customBiome) {
            game.metaProgress.lastBiomeId = game.currentBiome.id;
            game.persistence.saveMeta(game.metaProgress);
        }

        this.applyBiomeVisuals();

        // Weather System
        if (game.weather) {
            game.weather.weatherState = 'none';
            game.weather.weatherTimer = 0;
            game.weather.nextWeatherTimer = Math.random() * (WEATHER_INTERVAL_MAX - WEATHER_INTERVAL_MIN) + WEATHER_INTERVAL_MIN;
        }
        game.baseFogDensity = DEFAULT_FOG_DENSITY;

        if (game.weatherSystem) {
            game.weatherSystem.stopWeather();
        }

        // Create players
        if (game.isMultiplayer) {
            const c1 = game.playerColors ? game.playerColors[0] : '#00ffff';
            const c2 = game.playerColors ? game.playerColors[1] : '#0088ff';
            const p1 = new Player(CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2, game.scene, 0, c1);
            const p2 = new Player(CANVAS_WIDTH / 2 + 60, CANVAS_HEIGHT / 2, game.scene, 1, c2);
            game.players = [p1, p2];
        } else {
            const c1 = game.playerColors ? game.playerColors[0] : '#00ffff';
            const p1 = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, game.scene, 0, c1);
            game.players = [p1];
        }

        if (game.overheadUI) {
            game.overheadUI.clear();
            game.players.forEach(p => game.overheadUI.register(p));
        }

        // Legacy / Primary Ref
        game.player = game.players[0];

        // Update managers
        if (game.itemManager) {
            game.itemManager.players = game.players;
            game.itemManager.player = game.player;
        }

        this.applyMetaUpgrades();

        // Reset game counters
        game.spawnTimer = 0;
        game.spawnRate = INITIAL_SPAWN_RATE;
        game.difficultyTimer = 0;
        game.gameTime = 0;
        game.kills = 0;
        game.runSouls = 0; // Initialize collected souls for this run
        game.frameCount = 0;
        game.wave = 1;

        // Check if this is a custom game (will be refined in start())
        game.isCustomGame = !!(
            (game.customEnemies && Object.values(game.customEnemies).some(v => v === true)) ||
            (game.customSkills && Object.keys(game.customSkills).length > 0) ||
            game.customBiome ||
            game.customSpawnRate ||
            game.customMaxEnemies
        );

        // Reset systems
        if (game.cameraSystem) game.cameraSystem.reset();
        if (game.gameInputSystem) game.gameInputSystem.reset();

        // Initialize stats
        game.persistence.resetRunStats();
        game.stats = game.persistence.stats;
        if (game.bulletManager) game.bulletManager.stats = game.stats;

        // Trigger debug weather
        if (game.debugWeather && game.weather) {
            game.weather.triggerWeather(game.currentBiome);
        }

        // Training Mode Check
        game.trainingMode = false;
        if (game.customEnemies) {
            const anyEnabled = Object.values(game.customEnemies).some(e => e === true);
            if (!anyEnabled) {
                game.trainingMode = true;
            }
        }
    }

    applyBiomeVisuals() {
        const game = this.game;
        if (!game.currentBiome) return;
        const maps = TextureGenerator.generateGroundMaps(game.currentBiome.id);
        if (game.groundMaterial) {
            // Sharp textures at grazing angles (top-down camera looks across the plane)
            const maxAniso = game.rendering && game.rendering.renderer
                ? game.rendering.renderer.capabilities.getMaxAnisotropy()
                : 1;
            maps.map.anisotropy = maxAniso;
            maps.normalMap.anisotropy = maxAniso;

            game.groundMaterial.map = maps.map;
            game.groundMaterial.normalMap = maps.normalMap;
            game.groundMaterial.normalScale = new THREE.Vector2(0.8, 0.8);
            game.groundMaterial.roughnessMap = maps.roughnessMap;
            game.groundMaterial.color.setHex(0xffffff);
            game.groundMaterial.roughness = 1.0;
            game.groundMaterial.metalness = 0.0;
            game.groundMaterial.needsUpdate = true;
        }
        if (game.scene && game.scene.fog) {
            game.scene.fog.color.setHex(game.currentBiome.fogColor);
            game.baseFogDensity = game.currentBiome.fogDensity || DEFAULT_FOG_DENSITY;
        }
        if (game.scene) {
            game.scene.background.setHex(game.currentBiome.fogColor);
        }
        if (game.weather && game.weather.weatherState === 'active' && game.weatherSystem) {
            game.weatherSystem.startWeather(game.currentBiome.weather);
        }
    }

    applyMetaUpgrades() {
        const game = this.game;
        for (let upgrade of META_UPGRADES) {
            const level = game.metaProgress.upgrades[upgrade.id] || 0;
            if (level > 0) {
                game.players.forEach(p => upgrade.apply(p, level));
            }
        }
    }

    applyCustomSkills() {
        const game = this.game;
        if (!game.customSkills) return;
        game.customSkillIds = new Set();
        for (let skillId in game.customSkills) {
            const level = game.customSkills[skillId];
            if (level > 0) {
                const skill = SKILLS.find(s => s.id === skillId);
                if (skill) {
                    game.customSkillIds.add(skillId);
                    for (let i = 0; i < level; i++) {
                        game.players.forEach(p => skill.apply(p));
                    }
                }
            }
        }
    }

    gameOver() {
        const game = this.game;

        // Hide UI Prompts via Systems
        if (game.resurrectionSystem) game.resurrectionSystem.hidePrompt();
        if (game.weather) game.weather.hideWarning();

        game.state = 'gameover';
        if (game.cameraSystem) game.cameraSystem.reset();

        const runBonus = game.getRunSouls(); // This implies 'Kill Bonus'
        const earned = (game.runSouls || 0) + runBonus;

        if (!game.isCustomGame) {
            game.totalSouls += earned;
            game.metaProgress.souls = game.totalSouls;
            game.persistence.saveMeta(game.metaProgress);
        }

        game.stats.finalWave = game.wave;
        game.stats.survived = false;
        game.ui.showGameOverStats(earned);
    }

    win() {
        const game = this.game;

        // Hide UI Prompts via Systems
        if (game.resurrectionSystem) game.resurrectionSystem.hidePrompt();
        if (game.weather) game.weather.hideWarning();

        game.state = 'gameover';
        if (game.cameraSystem) game.cameraSystem.reset();

        const runBonus = game.getRunSouls() + 50;
        const earned = (game.runSouls || 0) + runBonus;

        if (!game.isCustomGame) {
            game.totalSouls += earned;
            game.metaProgress.souls = game.totalSouls;
            game.persistence.saveMeta(game.metaProgress);
        }

        game.stats.finalWave = game.wave;
        game.stats.survived = true;
        game.ui.showGameOverStats(earned, true);
    }
}
