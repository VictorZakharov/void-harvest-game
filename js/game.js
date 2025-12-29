// ==================== GAME CLASS ====================
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GAME_DURATION, BASE_CAMERA_HEIGHT,
  WAVE_DURATION, INITIAL_SPAWN_RATE, MIN_SPAWN_RATE, SPAWN_RATE_DECREASE,
  PARTICLE_COUNT_HIT, PARTICLE_COUNT_DEATH,
  WEATHER_DURATION, WEATHER_FADE_TIME, WEATHER_WARNING_TIME,
  WEATHER_INTERVAL_MIN, WEATHER_INTERVAL_MAX, WEATHER_SLOW_AMOUNT,
  HEALTH_DROP_BASE_RATE, HEALTH_RESTORE_AMOUNT,
  POLAR_VORTEX_RADIUS
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
import { EnemyInstancedRenderer } from './entities/EnemyInstancedRenderer.js';
import { HealthBarSystem } from './ui/HealthBarSystem.js';
import { PlayerOverheadUI } from './ui/PlayerOverheadUI.js';
import { LightingManager } from './LightingManager.js';
import { PersistenceManager } from './PersistenceManager.js';
import { WeatherManager } from './WeatherManager.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { SpatialHash } from './systems/SpatialHash.js';
import { TargetingSystem } from './systems/TargetingSystem.js';
import { ResurrectionSystem } from './systems/ResurrectionSystem.js';

export class Game {
  constructor() {
    this.persistence = new PersistenceManager();
    this.metaProgress = this.persistence.loadMetaProgress();
    this.metaProgress = this.persistence.loadMetaProgress();

    // Robust Initialization of Souls
    let loadedSouls = Number(this.metaProgress.souls);
    if (isNaN(loadedSouls)) loadedSouls = 0;
    this.totalSouls = loadedSouls;

    // Load Game Speed (Default 1.0)
    this.timeScale = this.metaProgress.gameSpeed !== undefined ? this.metaProgress.gameSpeed : 1.0;

    this.ui = new UIManager(this);
    this.canvas = this.ui.dom.gameCanvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.input = new InputHandler(this.ui.dom.gameCanvas);
    this.state = 'start'; // start, playing, paused, gameover
    this.gameLoopRunning = false;

    // Initialize stats early for managers
    this.stats = this.persistence.stats;

    // Initialize Managers
    this.rendering = new RenderingManager(this.canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.scene = this.rendering.scene; // Helper reference

    this.lighting = new LightingManager(this.scene);
    // Initialize Instanced Renderer
    // Capacity 15000 to handle high spawn rate stress tests without buffer overflow
    this.spatialHash = new SpatialHash(150); // Cell size approx max enemy size + speed buffer
    this.physicsSystem = new PhysicsSystem(this); // Physics & Collision

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
    this.weather = new WeatherManager(this.weatherSystem, this.ui.dom);

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
    this.instancedRenderer = new EnemyInstancedRenderer(this.scene, 15000); // Support up to 3000 enemies
    this.healthBarSystem = new HealthBarSystem(this.scene);
    this.overheadUI = new PlayerOverheadUI(this.scene);

    this.enemySpawner = new EnemySpawner(this.scene, this.enemies, this.healthBarSystem);
    this.targetingSystem = new TargetingSystem(this.spatialHash, this.lighting);
    this.resurrectionSystem = new ResurrectionSystem(this.particleManager);

    this.bulletManager = new BulletManager(this.scene, this.stats, this.spatialHash, {
      createParticles: (x, y, c, count) => this.particleManager.create(x, y, c, count),
      createExplosion: (x, y, c, r) => this.particleManager.createExplosion(x, y, c, r),
      onGameOver: () => {
        if (this.isMultiplayer && this.players) {
          // Check if ALL players are dead/downed
          const allDead = this.players.every(p => p.isDowned || p.health <= 0);
          if (allDead) this.gameOver();
        } else {
          this.gameOver();
        }
      },
      onCameraShake: (amount) => {
        this.camera.shake = amount;
      },
      onEnemyDeath: (enemy) => this.onEnemyDeath(enemy),
      onEnemyHit: (enemy, damage) => { /* Optional hook */
      }
    });

    this.itemManager = new ItemManager(this.scene, this.player, this.metaProgress, {
      onLevelUp: (player) => this.ui.showLevelUpScreen(player)
    });
  }

  reset(commitHistory = false) {
    // Clear existing objects

    // 1. Standard Cleanup via References
    if (this.players) {
      this.players.forEach(p => {
        if (p && p.visuals) p.visuals.dispose();
      });
    } else if (this.player && this.player.visuals) {
      this.player.visuals.dispose();
    }

    // 2. Robust Safety Sweep (Fixes "Ghost Players" and Texture Warnings)
    // Find any remaining Player Groups that leaked (e.g. from previous bugs)
    if (this.scene) {
      for (let i = this.scene.children.length - 1; i >= 0; i--) {
        const child = this.scene.children[i];
        if (child.name === 'PlayerGroup') {
          this.scene.remove(child);
        }
      }
    }

    if (this.enemies) {
      this.enemies.forEach(e => this.scene.remove(e.mesh));
      this.enemies.length = 0;
    }
    if (this.bulletManager) this.bulletManager.clear();
    if (this.itemManager) this.itemManager.clear();
    if (this.particleManager) this.particleManager.clear();
    if (this.healthBarSystem) this.healthBarSystem.clear();
    if (this.overheadUI) this.overheadUI.clear();

    // Reset players array
    this.players = [];

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

    // Create players
    if (this.isMultiplayer) {
      // P1: Left, P2: Right
      // P1: Left, P2: Right
      const c1 = this.playerColors ? this.playerColors[0] : '#00ffff';
      const c2 = this.playerColors ? this.playerColors[1] : '#0088ff';
      const p1 = new Player(CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2, this.scene, 0, c1); // ID 0
      const p2 = new Player(CANVAS_WIDTH / 2 + 60, CANVAS_HEIGHT / 2, this.scene, 1, c2); // ID 1
      this.players = [p1, p2];
    } else {
      // Single Player (ID 0)
      const c1 = this.playerColors ? this.playerColors[0] : '#00ffff';
      const p1 = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, this.scene, 0, c1);
      this.players = [p1];
    }

    if (this.overheadUI) {
      this.overheadUI.clear();
      this.players.forEach(p => this.overheadUI.register(p));
    }

    // Legacy support / Primary player ref
    this.player = this.players[0];

    // Update managers with new player instance(s)
    // Managers needing single player ref might default to P1
    if (this.itemManager) this.itemManager.players = this.players; // Update ItemManager to handle array

    // Update managers with new player instance
    if (this.itemManager) this.itemManager.player = this.player;

    this.applyMetaUpgrades();

    // Reset all game timers and counters
    this.spawnTimer = 0;
    this.spawnRate = INITIAL_SPAWN_RATE;
    this.difficultyTimer = 0;
    this.gameTime = 0;
    this.kills = 0;
    this.frameCount = 0;
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

    // Training Mode Check
    this.trainingMode = false;
    if (this.customEnemies) {
      // Check if any enemy is enabled
      const anyEnabled = Object.values(this.customEnemies).some(e => e === true);
      if (!anyEnabled) {
        this.trainingMode = true;
      }
    }
  }

  applyMetaUpgrades() {
    for (let upgrade of META_UPGRADES) {
      const level = this.metaProgress.upgrades[upgrade.id] || 0;
      if (level > 0) {
        this.players.forEach(p => upgrade.apply(p, level));
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
            this.players.forEach(p => skill.apply(p));
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
    const savedIsMultiplayer = this.isMultiplayer;
    const savedFriendlyFire = this.friendlyFire; // Persist Friendly Fire
    const savedSpawnRate = this.customSpawnRate;
    const savedMaxEnemies = this.customMaxEnemies;

    // Ensure Multiplayer flag is set & persisted BEFORE reset calls check it for player creation
    this.isMultiplayer = savedIsMultiplayer;

    // Reset game state (recreates players based on isMultiplayer)
    this.reset(true);

    // Restore Flags that reset() might have cleared or that we want to persist
    this.isMultiplayer = savedIsMultiplayer;
    this.friendlyFire = savedFriendlyFire;
    this.customEnemies = savedCustomEnemies;
    this.customSkills = savedCustomSkills;
    this.customBiome = savedCustomBiome;
    this.debugWeather = savedDebugWeather;
    this.debugPerf = this.customDebugPerf;
    this.customSpawnRate = savedSpawnRate;
    this.customMaxEnemies = savedMaxEnemies;

    // Apply Custom Spawn Rate (Interval in seconds)
    if (this.customSpawnRate) {
      this.spawnRate = this.customSpawnRate * 60;
    }

    if (this.customBiome) {
      this.currentBiome = BIOMES[this.customBiome.toUpperCase()] || BIOMES.NEUTRAL;
    }

    this.applyBiomeVisuals();
    this.state = 'playing';
    this.lastTime = performance.now();
    this.applyCustomSkills();

    // Autoshoot State (Refresh on start)
    if (this.trainingMode) {
      this.autoshootEnabled = false;
    } else {
      this.autoshootEnabled = (this.metaProgress.autoshootEnabled !== undefined) ? this.metaProgress.autoshootEnabled : true;
    }
    this.autoshootOverrideTimer = 0;

    // Show Hint at start (Always, unless training mode)
    if (this.ui.showStatusMessage && !this.trainingMode) {
      const status = this.autoshootEnabled ? "[Q] Autoshoot: ON" : "[Q] Autoshoot: OFF";
      this.ui.showStatusMessage(status, 3000);
    }

    if (!this.gameLoopRunning) {
      this.gameLoopRunning = true;
      // Initial Input State
      this.lastQ = false;
      this.gameLoop();
    }
  }

  gameLoop() {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // --- FPS Calculation ---
    if (!this.fpsTime) this.fpsTime = now;
    if (!this.frames) this.frames = 0;

    this.frames++;
    if (now >= this.fpsTime + 1000) {
      this.fps = this.frames; // Update FPS property for debug dump
      if (this.ui && this.ui.updateFPS) this.ui.updateFPS(this.frames); // Update UI if method exists
      else if (this.ui && this.ui.dom && this.ui.dom.fpsCounter) this.ui.dom.setText(this.ui.dom.fpsCounter, 'FPS: ' + this.frames);

      this.frames = 0;
      this.fpsTime = now;
    }
    // -----------------------

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

    // Initialize perf stats if missing
    if (!this.perfStats) this.perfStats = { logic: 0, render: 0, count: 0 };

    let t1, t2, t3;

    if (this.state === 'playing') {
      t1 = performance.now();
      this.update(dt);
      t2 = performance.now();
    }

    if (this.state !== 'start') {
      if (!t2) t2 = performance.now(); // Handle case where update wasn't called (paused)
      this.render3D(dt);
      t3 = performance.now();
    }

    // Accumulate stats if playing (ignore paused frames for stats usually, but here we capture everything)
    if (t1 && t3) {
      this.perfStats.logic += (t2 - t1);
      this.perfStats.render += (t3 - t2);
      this.perfStats.count++;
    }

    // FPS Calculation
    this.frameCount++;
    this.fpsTimer = (this.fpsTimer || 0) + dt;
    if (this.fpsTimer >= 500) { // Update every 500ms
      const fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
      if (this.ui && this.ui.dom && this.ui.dom.fpsCounter) {
        this.ui.dom.fpsCounter.textContent = `FPS: ${fps}`;
      }
      this.frameCount = 0;
      this.fpsTimer = 0;
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
    // Apply time scaling to the entire update step
    // Standardize to ~144 FPS (6.94ms) to restore original fast paced feel
    // (Previous logic was implicit 144hz dependent, so we target that baseline)
    const TARGET_DT = 6.944;
    const safeDt = Math.min(dt, 100); // Cap at 100ms
    const dtFactor = safeDt / TARGET_DT;

    // Effective Scale = TimeScale (User setting) * DT Correction (Frame variance)
    const effectiveScale = this.timeScale * dtFactor;

    // Advance game time by the scaled amount
    this.gameTime += effectiveScale;

    if (this.weather) {
      const newFog = this.weather.update(this.player, this.currentBiome, DEFAULT_FOG_DENSITY, effectiveScale);
      if (newFog !== null) this.baseFogDensity = newFog;
    }

    if (this.gameTime >= GAME_DURATION * 60) {
      this.win();
      return;
    }

    const target = this.rendering.getMouseWorldPosition(this.input.mouseX, this.input.mouseY);

    // Autoshoot Input Toggle (Q) - Disabled in Training Mode
    if (!this.trainingMode && (this.input.keys['q'] || this.input.keys['Q'])) {
      if (!this.lastQ) {
        this.autoshootEnabled = !this.autoshootEnabled;
        this.metaProgress.autoshootEnabled = this.autoshootEnabled;
        this.saveMetaProgress();

        const msg = this.autoshootEnabled ? "[Q] Autoshoot: ON" : "[Q] Autoshoot: OFF";
        if (this.ui.showStatusMessage) this.ui.showStatusMessage(msg, 2000);
      }
      this.lastQ = true;
    } else {
      this.lastQ = false;
    }

    // Manual Override Logic (2s)
    if (this.input.mouseDown) {
      this.autoshootOverrideTimer = 2.0;
    } else if (this.autoshootOverrideTimer > 0) {
      this.autoshootOverrideTimer -= dt / 1000;
    }

    let aimX = target.x;
    let aimZ = target.z;
    let autoFiring = false;

    // Autoshoot Targeting
    if (this.autoshootEnabled && this.autoshootOverrideTimer <= 0) {
      const nearest = this.targetingSystem.findTarget(this.player);

      if (nearest) {
        aimX = nearest.x + nearest.width / 2;
        aimZ = nearest.y + nearest.height / 2;
        autoFiring = true;
      }
    }

    // Lighting Update (Follows P1 Mouse)
    const targetForLighting = this.rendering.getMouseWorldPosition(this.input.mouseX, this.input.mouseY);

    // Pass P1 for lighting bonuses if available
    // Pass P1 and P2 for lighting
    const p1 = this.players[0] || this.player;
    const p2 = this.players[1];
    this.lighting.update(targetForLighting, p1, p2);

    // Player Updates
    // Player Updates
    this.players.forEach((p, index) => {
      // Pass global input to all players. Player class handles ID-based key filtering.

      // Determine Aim Target
      let pAimX, pAimZ;
      let targetFound = false;

      if (index === 0) {
        // P1 uses calculated aim (Mouse or Auto-Aim)
        pAimX = aimX;
        pAimZ = aimZ;
      } else {
        // P2 uses Auto-Aim ONLY (Nearest Enemy)
        const nearestP2 = this.targetingSystem.findTarget(p);

        if (nearestP2) {
          pAimX = nearestP2.x + nearestP2.width / 2;
          pAimZ = nearestP2.y + nearestP2.height / 2;
          targetFound = true;
        } else {
          // No target: Aim forward or keep last?
          // Default aim direction: Movement direction or forward.
          pAimX = p.x;
          pAimZ = p.y - 100; // Default up
          targetFound = false;
        }
      }

      p.update(this.input, pAimX, pAimZ, this.rendering.camYaw || 0, effectiveScale);

      // Shooting
      // P1: Manual or Auto (Inherits from Q toggle)
      if (index === 0) {
        // autoFiring is true if Autoshoot system found a target and is enabled
        if (p.shoot(this.input.mouseDown || autoFiring)) {
          this.bulletManager.createPlayerBullets(p);
        }
      }

      // P2 Always Autoshoots at Nearest Enemy
      if (index === 1 && !p.isDowned && p.health > 0 && targetFound) {
        if (p.shoot(true)) {
          this.bulletManager.createPlayerBullets(p);
        }
      }
    });

    // Resurrection Logic (Multiplayer Only)
    // Delegated to ResurrectionSystem
    if (this.isMultiplayer && this.state === 'playing') {
      this.resurrectionSystem.update(this.players, this.input, effectiveScale);
    }

    // Camera Logic (Average Position or P1?)
    // "Two players will appear on screen... close enough to share light".
    // Camera should probably center on midpoint.



    if (this.trainingMode) {
      // Training Mode: Maintain constant dummy population
      this.enemySpawner.updateTrainingMode(this.player);
    } else {
      // Normal Wave Logic
      this.spawnTimer += effectiveScale;
      if (this.spawnTimer >= this.spawnRate) {
        this.spawnTimer = 0;

        // Check max enemies limit
        const maxEnemies = this.customMaxEnemies || 9999;
        if (this.enemies.length < maxEnemies) {
          this.enemySpawner.spawn(this.wave, this.player, this.customEnemies);
        }
      }
    }

    this.difficultyTimer += effectiveScale;
    // Only increase difficulty (spawn rate decrease) if NOT using custom spawn rate
    if (this.difficultyTimer >= WAVE_DURATION) {
      this.difficultyTimer = 0;
      this.wave++;

      if (!this.customSpawnRate) {
        this.spawnRate = Math.max(MIN_SPAWN_RATE, this.spawnRate - SPAWN_RATE_DECREASE);
      }
    }

    const playerBounds = this.player.getBounds();
    let speedMod = (this.weather && this.weather.weatherState === 'active') ? (1 - WEATHER_SLOW_AMOUNT) : 1;

    if (this.player.triggerShockwave) {
      this.physicsSystem.handleShockwave();
    }

    // Populate Spatial Hash
    // Populate Spatial Hash
    this.spatialHash.clear();
    for (const enemy of this.enemies) {
      this.spatialHash.insert(enemy);
    }

    // Standard update loop (No sorting needed anymore for LOD, but sorting back-to-front or front-to-back can help overdraw)
    // Iterate through entities.
    // If overdraw is a concern, sorting front-to-back (closest first) is good.
    // But Array.sort is O(N log N).
    // Iterate backwards to safely remove items.

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      let currentSpeedMod = speedMod;

      if (this.player.stasisUnlocked) {
        const dx = (enemy.x + enemy.width / 2) - (this.player.x + this.player.width / 2);
        const dy = (enemy.y + enemy.height / 2) - (this.player.y + this.player.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Use defined radius or fallback constant. 
        // Add enemy radius (width/2) to make it edge-to-edge detection, matching visuals better.
        const effectiveRadius = (this.player.stasisRadius || POLAR_VORTEX_RADIUS) + (enemy.width / 2);

        if (dist < effectiveRadius) {
          currentSpeedMod *= (1 - this.player.stasisSlow);
        }
      }

      // Apply Global Time Scale to Enemy Speed
      // We use effectiveScale here to include both TimeScale and DT correction
      // enemy.update expects a timeScale factor.

      enemy.update(this.players, currentSpeedMod, effectiveScale);

      if (enemy.canShoot()) {
        // Find nearest valid target (ignoring downed players)
        let targetX = playerBounds.centerX;
        let targetY = playerBounds.centerY;
        let minDistSq = Infinity;
        let foundTarget = false;

        const pList = Array.isArray(this.players) ? this.players : [this.player];
        for (const p of pList) {
          if (p.health > 0 && !p.isDowned) {
            const dx = p.x - enemy.x;
            const dy = p.y - enemy.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDistSq) {
              minDistSq = dSq;
              const pB = p.getBounds();
              targetX = pB.centerX;
              targetY = pB.centerY;
              foundTarget = true;
            }
          }
        }

        // Fallback Strategy:
        // If no valid active target is found (e.g., all players are downed), default to the primary player's position.
        // This ensures the shooting logic has valid coordinates until the Game Over state triggers.
        this.bulletManager.createEnemyBullet(enemy, targetX, targetY);
      }
    }

    // --- System Updates ---
    // Update physics simulation with scaled delta time to maintain consistency during slow-motion.
    this.physicsSystem.update(dt * this.timeScale);

    // Update game systems (Bullets, Items, Particles) with the effective time scale (including DT correction).
    this.bulletManager.update(this.players, this.enemies, effectiveScale);
    this.itemManager.update(effectiveScale);
    this.particleManager.update();

    if (this.camera.shake > 0) this.camera.shake--;

    this.ui.updateHUD();
  }



  /**
   * Renders the 3D scene, updating fog, camera, and all visible meshes.
   */
  render3D(dt = 16) {
    this.rendering.updateFog(this.baseFogDensity, 800, DEFAULT_FOG_DENSITY);
    // Camera Logic (Average Position)
    // Runs every frame to allow looking around while paused/frozen
    let camX = 0, camZ = 0;
    let livePlayers = this.players.filter(p => !p.isDowned && p.health > 0);
    if (livePlayers.length === 0) livePlayers = this.players; // Fallback if all dead

    livePlayers.forEach(p => {
      const bounds = p.getBounds();
      camX += bounds.centerX;
      camZ += bounds.centerY;
    });
    // Protect against 0 players (shouldn't happen with fallback)
    if (livePlayers.length > 0) {
      camX /= livePlayers.length;
      camZ /= livePlayers.length;
    }

    // Initialize smoothing variables if missing
    if (this._smoothCamX === undefined) {
      this._smoothCamX = camX;
      this._smoothCamZ = camZ;
    }

    // LERP (Linear Interpolation) for smoothness
    const lerpFactor = 0.1;
    this._smoothCamX += (camX - this._smoothCamX) * lerpFactor;
    this._smoothCamZ += (camZ - this._smoothCamZ) * lerpFactor;

    this.rendering.updateCamera(this._smoothCamX, this._smoothCamZ, this.input);

    const target = this.lighting.getCursorTarget();

    // Calculate animation delta (0 if paused/frozen)
    const animDelta = (this.state === 'playing' ? this.timeScale : 0) * dt;
    // Update mesh for ALL players
    this.players.forEach(p => p.updateMesh(animDelta));

    // Update Instanced Renderer (Batches all enemies)
    // We pass player and cursorTarget for visibility/culling logic (Fog of War)
    const cursorTargetForCull = this.lighting.getCursorTarget();
    this.instancedRenderer.update(this.enemies, animDelta, this.player, cursorTargetForCull);

    // Update BulletManager with Friendly Fire flag
    const effectiveScale = (this.state === 'playing' ? this.timeScale : 0);
    this.bulletManager.update(this.players, this.enemies, effectiveScale, this.friendlyFire);

    // Update Overlay Visuals (Heath Bars)
    this.healthBarSystem.update(this.rendering.camera3D, this.player, cursorTargetForCull, this.enemies);
    if (this.overheadUI) this.overheadUI.update();

    this.bulletManager.updateMeshes();
    this.itemManager.updateMeshes();
    this.rendering.applyShake(this.camera.shake, this.state);
    this.rendering.render();
  }

  onEnemyDeath(enemy) {
    if (enemy.type === 'tank') {
      this.camera.shake = 5;
    }
    this.kills++;
    this.stats.enemiesKilled[enemy.type]++;
    this.player.onKill(); // This should probably be removed or adapted for multiple players
    this.particleManager.create(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_DEATH);
    this.itemManager.spawnXP(enemy.x, enemy.y, enemy.xpValue);

    this.totalSouls += enemy.soulsValue;

    // Cleanup
    this.healthBarSystem.unregister(enemy);
    enemy.dispose(this.scene);

    const index = this.enemies.indexOf(enemy);
    if (index > -1) this.enemies.splice(index, 1);
  }

  gameOver() {
    // Hide Revive Prompt
    if (this.resurrectionSystem) this.resurrectionSystem.hidePrompt();


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
    // Hide Revive Prompt
    if (this.resurrectionSystem) this.resurrectionSystem.hidePrompt();


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
      // Hide Revive Prompt
      if (this.resurrectionSystem) this.resurrectionSystem.hidePrompt();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.ui.hidePauseScreen();
      // Revive prompt will reappear in next update() if conditions met
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
      // Hide Revive Prompt when frozen (e.g. Level Up)
      if (this.resurrectionSystem) this.resurrectionSystem.hidePrompt();
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
