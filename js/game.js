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

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        // this.ctx = this.canvas.getContext('2d'); // Removed for Three.js
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.input = new InputHandler(this.canvas);
        this.state = 'start'; // start, playing, paused, gameover
        this.gameLoopRunning = false;

        this.metaProgress = StatsManager.loadMetaProgress();
        this.totalSouls = this.metaProgress.souls || 0;

        this.ui = new UIManager(this);

        // Initialize stats early for managers
        this.stats = StatsManager.createEmptyStats();

        // Initialize 3D Scene
        this.init3D();

        this.reset();
    }

    init3D() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0); // Latent fog, enabled only during weather

        // Cursor Light (Follows mouse)
        // Cursor Light (Follows mouse)
        // Intensity reduced to prevent washout
        this.cursorLight = new THREE.SpotLight(0xffffff, 2.0); // Reduced from 2.5
        this.cursorLight.position.set(0, 200, 0); // Lowered height for intensity
        this.cursorLight.angle = Math.PI / 3; // Widen angle to 60 deg (was 45) for +50% radius
        this.cursorLight.penumbra = 0.5;
        this.cursorLight.decay = 1.0; // Reduced decay for farther reach
        this.cursorLight.distance = 3000;
        this.cursorLight.castShadow = true;
        this.cursorLight.shadow.mapSize.width = 2048; // Increased from 1024 for cleaner edges
        this.cursorLight.shadow.mapSize.height = 2048;
        this.cursorLight.shadow.bias = -0.0005; // Fix shadow acne/striping
        this.cursorLight.shadow.normalBias = 0.02; // Improve self-shadowing accuracy

        // Cursor Glow (Bright point source) - kept white/bright
        this.cursorGlow = new THREE.PointLight(0xffffff, 1.5, 900, 2); // Radius 600 -> 900 (+50%)
        this.scene.add(this.cursorGlow);

        this.scene.add(this.cursorGlow);

        // Reticle (Spread Indicator)
        // 1. Shadow/Outline (Black, thick, solid)
        // RingGeometry(inner, outer, segments)
        // Background Ring: 0.75 to 1.05 (Thickness 0.3)
        const reticleShadowGeo = new THREE.RingGeometry(0.75, 1.05, 32);
        const reticleShadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending, // Solid occlusion
            depthTest: true, // Allow occlusion by enemies
            depthWrite: false // Prevent Z-fighting with ground/self
        });
        this.reticleShadow = new THREE.Mesh(reticleShadowGeo, reticleShadowMat);
        this.reticleShadow.rotation.x = -Math.PI / 2;
        this.scene.add(this.reticleShadow);

        // 2. Main Glow (Cyan, thinner, additive)
        // Foreground Ring: 0.8 to 1.0 (Thickness 0.2)
        // Sits inside the black ring, but thicker than before
        const reticleGeo = new THREE.RingGeometry(0.8, 1.0, 32);
        const reticleMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, // Glow
            depthTest: true, // Allow occlusion by enemies
            depthWrite: false // Prevent Z-fighting
        });
        this.reticle = new THREE.Mesh(reticleGeo, reticleMat);
        this.reticle.rotation.x = -Math.PI / 2;
        this.reticle.position.y = 0.5; // Lift higher above shadow to prevent z-fighting flicker
        this.scene.add(this.reticle);

        // Target is dynamic, but we can just set target to (x, 0, z) in update
        // We need to add the light and its target to the scene
        this.scene.add(this.cursorLight);
        this.cursorLight.target.position.set(0, 0, 0);
        this.scene.add(this.cursorLight.target);

        // Camera (Adjusted for wider view)
        // Decouple aspect ratio from logical game size
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera3D = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);

        // Camera Orbital State
        this.camYaw = 0; // Angle around Vertical Axis
        this.camPitch = Math.PI / 4; // 45 degrees Down
        this.camDist = 1000;

        // Initial Position calculation (Cartesian from Spherical)
        this.updateCameraTransform();

        // this.camera3D.position.set(0, 800, 600); // REPLACED by updateCameraTransform
        // this.camera3D.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        // Set renderer size to match display size (prevents stretching)
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows, reduces hard aliasing

        // Lights
        // High Contrast / "Fog of War" setup
        const ambientLight = new THREE.AmbientLight(0x000000, 0.0); // Pure darkness
        this.scene.add(ambientLight);

        // Removed HemisphereLight to ensure darkness
        // const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5); 
        // this.scene.add(hemiLight);

        // Dim moonlight just for slight contour
        const dirLight = new THREE.DirectionalLight(0xaaccff, 0.05); // Barely visible rim light
        dirLight.position.set(500, 1000, 500);
        dirLight.castShadow = true;
        dirLight.shadow.bias = -0.0005; // Fix acne here too

        // Handle window resize
        window.addEventListener('resize', () => {
            const width = this.canvas.clientWidth;
            const height = this.canvas.clientHeight;

            this.camera3D.aspect = width / height;
            this.camera3D.updateProjectionMatrix();

            this.renderer.setSize(width, height, false);
        });

        // Optimize shadow map
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 2500;
        dirLight.shadow.camera.left = -1000;
        dirLight.shadow.camera.right = 1000;
        dirLight.shadow.camera.top = 1000;
        dirLight.shadow.camera.bottom = -1000;

        this.scene.add(dirLight);

        // Create Ground
        // Procedural Texture loaded later in applyBiomeVisuals
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

        // GridHelper removed per user request


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

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5); // Intersect at y=5 (mid-height of player/items)

        // Initialize lists (Entities tracked by managers, but referenced here if needed?)
        this.enemies = [];
        // items and particles are now fully managed by managers, minimal need for local list unless for debugging

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
        // Clear all game state completely
        if (this.scene) {
            // Remove existing meshes
            this.enemies?.forEach(e => this.scene.remove(e.mesh));
            this.bullets?.forEach(b => this.scene.remove(b.mesh));
            this.items?.forEach(i => this.scene.remove(i.mesh));
            this.particles?.forEach(p => this.scene.remove(p.mesh));
            if (this.player?.mesh) this.scene.remove(this.player.mesh);
        }

        this.enemies.length = 0; // Clear without breaking reference
        if (this.bulletManager) this.bulletManager.clear();
        if (this.itemManager) this.itemManager.clear();
        if (this.particleManager) this.particleManager.clear();

        // Do NOT clear custom settings here. 
        // They are managed by the UI (Start vs Custom Start).
        // If we clear them, Restarting a custom game loses the config.

        // Select Biome
        if (this.customBiome) {
            this.currentBiome = BIOMES[this.customBiome.toUpperCase()] || BIOMES.NEUTRAL;
        } else {
            let keys = Object.keys(BIOMES);

            // Exclude last played biome (PERSISTENT CHECK)
            // We use metaProgress so this works even if the user refreshes the page
            const lastId = this.metaProgress.lastBiomeId;

            if (lastId) {
                const filtered = keys.filter(k => BIOMES[k].id !== lastId);
                if (filtered.length > 0) keys = filtered;
            }

            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            this.currentBiome = BIOMES[randomKey];
        }

        // Only save history if this is a REAL game start (not just the background reset)
        if (commitHistory && !this.customBiome) {
            this.metaProgress.lastBiomeId = this.currentBiome.id;
            this.saveMetaProgress();
        }

        this.applyBiomeVisuals();

        // Weather System
        // Weather System
        this.weatherState = 'none'; // 'none', 'active'
        this.weatherTimer = 0;
        this.nextWeatherTimer = Math.random() * (WEATHER_INTERVAL_MAX - WEATHER_INTERVAL_MIN) + WEATHER_INTERVAL_MIN;
        this.baseFogDensity = DEFAULT_FOG_DENSITY; // Initialize base density

        // Fix: Explicitly stop any active weather visuals
        if (this.weatherSystem) {
            this.weatherSystem.startWeather('none');
        }

        // Clear any old player reference
        this.player = null;

        // Create completely fresh player with base stats
        // Create completely fresh player with base stats
        this.player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        if (this.scene && this.player.mesh) this.scene.add(this.player.mesh);

        // Update managers with new player instance
        if (this.itemManager) this.itemManager.player = this.player;

        // Apply meta upgrades AFTER player is created (permanent upgrades only)
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

        // Reset input state to prevent carryover
        if (this.input) {
            this.input.mouseDown = false;
        }

        // Initialize stats
        this.stats = StatsManager.createEmptyStats();
        if (this.bulletManager) this.bulletManager.stats = this.stats;

        // Trigger debug weather
        if (this.debugWeather) {
            this.triggerWeather();
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

        // Track which skills are from custom start (for UI styling)
        this.customSkillIds = new Set();

        // Apply each selected skill the specified number of times
        for (let skillId in this.customSkills) {
            const level = this.customSkills[skillId];
            if (level > 0) {
                const skill = SKILLS.find(s => s.id === skillId);
                if (skill) {
                    // Track this skill as a custom starting skill
                    this.customSkillIds.add(skillId);

                    // Apply the skill 'level' times to reach the desired level
                    for (let i = 0; i < level; i++) {
                        skill.apply(this.player);
                    }
                }
            }
        }
    }

    applyBiomeVisuals() {
        if (!this.currentBiome) return;

        // Generate Procedural Ground Texture
        const texture = TextureGenerator.generateGround(this.currentBiome.id);

        if (this.groundMaterial) {
            this.groundMaterial.map = texture;
            this.groundMaterial.color.setHex(0xffffff); // Set to white to show texture colors
            this.groundMaterial.roughness = 1.0; // Fully matte to prevent shiny cursor spot
            this.groundMaterial.metalness = 0.0; // Non-metallic
            this.groundMaterial.needsUpdate = true;
        }

        // Update Fog Color
        if (this.scene && this.scene.fog) {
            this.scene.fog.color.setHex(this.currentBiome.fogColor);
            this.baseFogDensity = this.currentBiome.fogDensity || DEFAULT_FOG_DENSITY;
        }

        // Update Background Color (matches fog usually)
        if (this.scene) {
            this.scene.background.setHex(this.currentBiome.fogColor);
        }

        // Force Weather Sync:
        // If weather is currently active, restart it with the new biome's type.
        // If not active, ensure the next trigger will use correct type.
        if (this.weatherState === 'active' && this.weatherSystem) {
            this.weatherSystem.startWeather(this.currentBiome.weather);
        }
        // Also update fog density target for immediate feedback if needed? 
        // No, triggerWeather handles density.

        // Dynamic High Contrast Reticle Color removed.
        // We now use a static Cyan Reticle + Black Shadow Outline.
    }

    start() {
        // Preserve custom game settings before reset
        const savedCustomEnemies = this.customEnemies;
        const savedCustomSkills = this.customSkills;
        const savedCustomBiome = this.customBiome;
        const savedDebugWeather = this.debugWeather;

        // Reset game state and apply meta upgrades (important for newly purchased upgrades!)
        // Commit this biome selection to history (true)
        this.reset(true);

        // Restore custom game settings after reset
        this.customEnemies = savedCustomEnemies;
        this.customSkills = savedCustomSkills;
        this.customBiome = savedCustomBiome;
        this.debugWeather = savedDebugWeather;

        // Re-apply biome selection directly if custom was set
        if (this.customBiome) {
            this.currentBiome = BIOMES[this.customBiome.toUpperCase()] || BIOMES.NEUTRAL;
        } else {
            // If no custom biome, pick random again because reset() picks random, 
            // but we want to ensure fresh random if this is a new "Start" call?
            // Actually, reset() picks random.
            // But if we just came from a game where customBiome WAS set,
            // reset() would have seen customBiome=null (because we cleared it in reset? No we saved it).
            // Wait, reset() clears customBiome.
        }

        // ALWAYS re-apply biome visuals at start to ensure Ground + Weather sync
        this.applyBiomeVisuals();

        // Ensure clean start
        this.state = 'playing';

        // Ensure clean start
        this.state = 'playing';
        this.lastTime = performance.now();

        // Apply custom skills if in custom mode (after meta upgrades)
        this.applyCustomSkills();

        // Start fresh game loop
        if (!this.gameLoopRunning) {
            this.gameLoopRunning = true;
            this.gameLoop();
        }
    }

    gameLoop() {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        // Handle ESC key for Pause Menu
        if (this.input.escapePressed) {
            this.input.escapePressed = false;
            this.togglePause();
        }

        // Handle SPACE key for Frozen Pause (Quick Pause)
        if (this.input.spacePressed) {
            this.input.spacePressed = false;
            this.toggleFreeze();
        }

        // Handle frozen state - check for any input to unfreeze
        if (this.state === 'frozen') {
            let hasResumeInput = false;

            // Check Keys (W, A, S, D)
            ['w', 'a', 's', 'd'].forEach(k => {
                if (this.input.keys[k]) {
                    // Key is currently pressed
                    // If Manually Frozen, ignore keys that were ALREADY pressed when frozen
                    const ignored = this.manualFreeze && this.ignoreKeys && this.ignoreKeys.has(k);
                    if (!ignored) hasResumeInput = true;
                } else {
                    // Key released: Remove from ignore list so re-pressing it resumes game
                    if (this.manualFreeze && this.ignoreKeys) this.ignoreKeys.delete(k);
                }
            });

            // Check Mouse
            if (this.input.mouseDown) {
                const ignored = this.manualFreeze && this.ignoreMouse;
                if (!ignored) hasResumeInput = true;
            } else {
                if (this.manualFreeze) this.ignoreMouse = false;
            }

            if (hasResumeInput) {
                this.unfreeze();
            } else {
                // Ensure UI is visible
                if (this.ui) this.ui.showFrozenMessage(true);
            }
        }

        if (this.state === 'playing') {
            this.update(dt);
        }

        // Always draw, even when paused or gameover
        // Always render
        if (this.state !== 'start') {
            this.render3D();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    updateWeather() { // Frame-based update
        if (!this.currentBiome) return;
        if (this.currentBiome.weather === WEATHER_TYPES.NONE) return;

        const warningUI = document.getElementById('weather-warning');

        if (this.weatherState === 'none') {
            this.nextWeatherTimer--; // Decrement by frame

            // Warning Logic
            if (this.nextWeatherTimer <= WEATHER_WARNING_TIME) {
                if (warningUI) {
                    warningUI.classList.remove('hidden');
                    warningUI.textContent = `WARNING: ${this.currentBiome.weather.toUpperCase()} APPROACHING`;
                }
            } else {
                if (warningUI) warningUI.classList.add('hidden');
            }

            if (this.nextWeatherTimer <= 0) {
                this.triggerWeather();
            }
        } else if (this.weatherState === 'active') {
            if (warningUI) warningUI.classList.add('hidden'); // Hide warning once active

            this.weatherTimer--; // Decrement by frame

            // Calculate Fade Factor (0.0 to 1.0)
            let fadeFactor = 1.0;
            const timeElapsed = WEATHER_DURATION - this.weatherTimer;
            const timeRemaining = this.weatherTimer;

            if (timeElapsed < WEATHER_FADE_TIME) {
                // FADE IN
                fadeFactor = timeElapsed / WEATHER_FADE_TIME;
            } else if (timeRemaining < WEATHER_FADE_TIME) {
                // FADE OUT
                fadeFactor = timeRemaining / WEATHER_FADE_TIME;
            }

            // Update weather system particles (wrap around player)
            if (this.player && this.weatherSystem) {
                this.weatherSystem.update(this.player.x, this.player.y, fadeFactor);
            }

            // Apply player slow (1 frame duration, continually re-applied)
            this.player.slowEffects.push({
                amount: WEATHER_SLOW_AMOUNT * fadeFactor,
                timer: 1
            });

            if (this.weatherTimer <= 0) {
                this.endWeather();
            }
        }
    }

    triggerWeather() {
        this.weatherState = 'active';
        this.weatherTimer = WEATHER_DURATION;
        // console.log(`Weather started: ${this.currentBiome.weather}`);

        if (this.weatherSystem) {
            this.weatherSystem.startWeather(this.currentBiome.weather);
        }

        // Increase Fog Density
        const targetDensity = this.currentBiome.weatherFogDensity || DEFAULT_FOG_DENSITY * 3;
        this.baseFogDensity = targetDensity;
    }

    endWeather() {
        this.weatherState = 'none';
        this.nextWeatherTimer = Math.random() * (WEATHER_INTERVAL_MAX - WEATHER_INTERVAL_MIN) + WEATHER_INTERVAL_MIN;
        // console.log("Weather ended");

        if (this.weatherSystem) {
            this.weatherSystem.stopWeather();
        }

        // Reset Fog Density
        // Use biome default or global default
        this.baseFogDensity = this.currentBiome?.fogDensity || DEFAULT_FOG_DENSITY;
    }



    update(dt) {
        // Zoom handled in render3D


        this.gameTime++;

        this.updateWeather(); // Frame-based update

        // Check win condition (10 minutes)
        if (this.gameTime >= GAME_DURATION * 60) {
            this.win();
            return;
        }

        // Calculate 3D mouse position
        const ndcX = (this.input.mouseX / CANVAS_WIDTH) * 2 - 1;
        const ndcY = -(this.input.mouseY / CANVAS_HEIGHT) * 2 + 1;
        this.mouse.set(ndcX, ndcY);

        this.raycaster.setFromCamera(this.mouse, this.camera3D);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.groundPlane, target);

        // Update cursor light
        if (this.cursorLight) {
            const radiusMultiplier = this.player ? (1 + this.player.lightRadiusBonus) : 1;
            const lightHeight = 300 * radiusMultiplier;
            this.cursorLight.position.set(target.x, lightHeight, target.z);
            this.cursorLight.target.position.set(target.x, 0, target.z);

            // Scale intensity slightly with radius
            // Base intensity ~800. Scale linearly to keep consistent brightness.
            // 5000 was clipping (White), 2 was invisible.
            this.cursorLight.intensity = 800 * radiusMultiplier;
            this.cursorLight.distance = 3000 * radiusMultiplier;
        }
        if (this.cursorGlow) {
            this.cursorGlow.position.set(target.x, 20, target.z);
        }

        // Update player with world coordinates
        // target.z maps to 2D y
        this.player.update(this.input, target.x, target.z, this.camYaw || 0);

        // Player shooting
        if (this.player.shoot(this.input.mouseDown)) {
            this.bulletManager.createPlayerBullets(this.player);
        }

        // Spawn enemies
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnRate) {
            this.spawnTimer = 0;
            this.enemySpawner.spawn(this.wave, this.player, this.customEnemies);
        }

        // Increase difficulty over time
        this.difficultyTimer++;
        if (this.difficultyTimer >= WAVE_DURATION) { // Every 15 seconds
            this.difficultyTimer = 0;
            this.spawnRate = Math.max(MIN_SPAWN_RATE, this.spawnRate - SPAWN_RATE_DECREASE);
            this.wave++;
        }

        // Update enemies
        const playerBounds = this.player.getBounds();
        const speedMod = (this.weatherState === 'active') ? (1 - WEATHER_SLOW_AMOUNT) : 1;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(playerBounds.centerX, playerBounds.centerY, speedMod);

            // Enemy shooting
            if (enemy.canShoot()) {
                this.bulletManager.createEnemyBullet(enemy, playerBounds.centerX, playerBounds.centerY);
            }

            // Check collision with player
            if (enemy.collidesWith(this.player)) {
                this.stats.damageReceived[enemy.type] += enemy.damage;
                if (this.player.takeDamage(enemy.damage)) {
                    this.gameOver();
                }
                this.particleManager.create(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_HIT);

                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
                this.camera.shake = 10;
            }
        }

        // Update bullets
        this.bulletManager.update(this.player, this.enemies);

        // Update items
        this.itemManager.update();

        // Update particles
        this.particleManager.update();

        // Update camera shake
        if (this.camera.shake > 0) {
            this.camera.shake--;
        }

        // Update UI
        this.ui.updateHUD();
    }

    render3D() {
        // --- DYNAMIC FOG SCALING ---
        if (this.scene && this.scene.fog) {
            const currentHeight = this.camera3D.position.y;
            const height = Math.max(100, currentHeight);
            const scale = BASE_CAMERA_HEIGHT / height;
            const base = (typeof this.baseFogDensity !== 'undefined') ? this.baseFogDensity : DEFAULT_FOG_DENSITY;
            this.scene.fog.density = base * scale;
        }
        // ---------------------------

        // Update entity meshes
        const lightRadius = this.player.getLightRadius();
        const cursorTarget = this.cursorLight ? this.cursorLight.target.position : null;

        // ---------- CAMERA CONTROL ----------
        // Handle Camera Rotation
        if (this.input.rightMouseDown) {
            const deltas = this.input.getDeltas();
            const sensitivity = 0.01;

            // Yaw (Left/Right) - Rotate around player
            this.camYaw -= deltas.x * sensitivity;

            // Pitch (Up/Down)
            this.camPitch -= deltas.y * sensitivity;

            // Clamp Pitch to avoid flipping or extreme angles
            // Min: 0.5 (Higher angle, prevents looking too flat along ground)
            // Max: PI/2 - 0.1 (Almost top-down)
            const minPitch = 0.5;
            const maxPitch = Math.PI / 2 - 0.1;
            this.camPitch = Math.max(minPitch, Math.min(maxPitch, this.camPitch));
        } else {
            // Flush deltas even if not using them to prevent jump on next click
            this.input.getDeltas();
        }

        // Handle Camera Zoom
        const zoomDelta = this.input.getZoomDelta();
        if (zoomDelta !== 0) {
            const zoomSpeed = 50; // Distance per click
            this.camDist += zoomDelta * zoomSpeed;
            // Clamp Distance
            // Min: 400 (Prevent clipping)
            // Max: 1500 (Keep action focused)
            this.camDist = Math.max(400, Math.min(1500, this.camDist));
        }

        // Apply Camera Transform relative to Player
        this.updateCameraTransform(); // Use helper method for consistency

        // Update Reticle
        if (this.reticle && cursorTarget && this.player) {
            this.reticle.position.set(cursorTarget.x, 2, cursorTarget.z); // Slightly above ground

            // Calculate distance to player
            const dx = cursorTarget.x - (this.player.x + this.player.width / 2);
            const dz = cursorTarget.z - (this.player.y + this.player.height / 2);
            const dist = Math.sqrt(dx * dx + dz * dz);

            // Radius = dist * tan(spread/2) roughly, or just proportional
            // Spread is total angle or half angle? currentSpread is likely half-angle deviation (radius)
            // Let's assume currentSpread is the +/- max deviation
            const spreadRadius = Math.max(10, dist * Math.tan(this.player.currentSpread));

            this.reticle.scale.set(spreadRadius, spreadRadius, 1);

            // Dynamic Color based on Range
            if (dist > this.player.range) {
                this.reticle.material.color.setHex(0x888888); // Grey out-of-range
            } else {
                this.reticle.material.color.setHex(0x00ffff); // Cyan in-range
            }

            // Sync Shadow
            if (this.reticleShadow) {
                // Position slightly lower? Actually depthTest: false means draw order matters.
                // We added Shadow FIRST, so it draws underneath. 
                // We'll set it to same position.
                this.reticleShadow.position.copy(this.reticle.position);
                this.reticleShadow.scale.set(spreadRadius, spreadRadius, 1);
            }
        }

        this.player.updateMesh();

        this.enemies.forEach(e => {
            // Visibility Factor (0.0 = Hidden/Shadow, 1.0 = Fully Visible)
            let visibility = 0.0;

            // Check Player Light (Self) -> REMOVED per request. Player emits 0 light.
            // Enemies only visible via Cursor Light.
            // const dPlayer = ... (Deleted)

            // Check Cursor Light
            if (cursorTarget) {
                const dCursor = Math.sqrt((e.x - cursorTarget.x) ** 2 + (e.y - cursorTarget.z) ** 2);

                // Calculate geometry-based limits to match Visual Spotlight PERFECTLY
                // Spotlight: Height ~300, Angle PI/3, Penumbra 0.5
                const radiusMultiplier = this.player ? (1 + this.player.lightRadiusBonus) : 1;
                const lightHeight = 300 * radiusMultiplier;
                const halfAngle = Math.PI / 3;

                // Visual Outer Radius (Zero Light)
                const cEnd = lightHeight * Math.tan(halfAngle); // ~520 * multiplier

                // Visual Inner Radius (Full Light)
                // Penumbra 0.5 implies light starts fading at 50% of angle? 
                // Approx: innerAngle = halfAngle * (1 - penumbra)
                const innerAngle = halfAngle * 0.5;
                const cStart = lightHeight * Math.tan(innerAngle); // ~173 * multiplier

                if (dCursor < cEnd) {
                    if (dCursor < cStart) {
                        visibility = Math.max(visibility, 1.0);
                    } else {
                        const factor = 1.0 - ((dCursor - cStart) / (cEnd - cStart));
                        visibility = Math.max(visibility, factor);
                    }
                }
            }

            // Check Player Bullets (Light Sources)
            // Reveal enemies near bullets (Radius 150)
            const BULLET_LIGHT_RADIUS = 150;
            // Optimization: Only check if not already fully visible
            if (visibility < 1.0 && this.bulletManager) {
                // Access bullets from manager
                const bullets = this.bulletManager.bullets;
                for (let j = 0; j < bullets.length; j++) {
                    const b = bullets[j];
                    if (!b.isPlayer) continue; // Only player bullets emit light

                    const dB = Math.sqrt((e.x - b.x) ** 2 + (e.y - b.y) ** 2);
                    if (dB < BULLET_LIGHT_RADIUS) {
                        // Simple linear fade for bullet light
                        const factor = 1.0 - (dB / BULLET_LIGHT_RADIUS);
                        visibility = Math.max(visibility, factor);
                        if (visibility >= 1.0) break; // Fully lit, stop checking
                    }
                }
            }

            // Pass current biome fog color for camouflage blending (used for tinting if needed)
            const fogColor = this.currentBiome ? this.currentBiome.fogColor : 0x000000;
            e.updateMesh(visibility, fogColor, this.camera3D);
        });

        if (this.bulletManager) this.bulletManager.updateMeshes();
        if (this.itemManager) this.itemManager.updateMeshes();
        // this.particleManager.update() call in Game.update() handles physics + mesh updates.
        // No need to call update again here.

        // Camera follow handled by updateCameraTransform() above


        // Shake
        // Shake
        if (this.camera.shake > 0 && this.state !== 'gameover') {
            this.camera3D.position.x += (Math.random() - 0.5) * this.camera.shake * 2;
            this.camera3D.position.z += (Math.random() - 0.5) * this.camera.shake * 2;
        }

        this.renderer.render(this.scene, this.camera3D);
    }

    // Kept for reference or removed
    draw2D() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // ... (previous 2D code)
    }

    draw() {
        // Redirection to 3D render is done in gameLoop
        // Or we can leave this EMPTY or use it for UI overlay only if using 2D context on same canvas?
        // Three.js renderer overwrites canvas content. 
        // Rendering slow effect overlay needs a separate approach or post-processing.
        // For now, skip overlays or unimplemented.
    }

    // Draw slow/frozen effects not implemented in 3D yet







    onEnemyDeath(enemy) {
        this.kills++;
        this.stats.enemiesKilled[enemy.type]++;
        this.player.onKill(); // Vampire effect
        this.particleManager.create(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_DEATH);
        this.itemManager.spawnXP(enemy.x, enemy.y, enemy.xpValue);

        this.scene.remove(enemy.mesh);

        // Remove from list safely
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
        }
    }

    gameOver() {
        this.state = 'gameover';
        this.camera.shake = 0; // Stop screen shake

        const souls = this.getRunSouls();
        this.totalSouls += souls;
        this.metaProgress.souls = this.totalSouls;
        this.saveMetaProgress();

        // Finalize stats
        this.stats.finalWave = this.wave;
        this.stats.survived = false;

        // Display stats
        this.ui.showGameOverStats(souls);
    }

    win() {
        this.state = 'gameover';
        this.camera.shake = 0; // Stop screen shake

        const souls = Math.floor(this.kills / 3) + 50; // Bonus for winning
        this.totalSouls += souls;
        this.metaProgress.souls = this.totalSouls;
        this.saveMetaProgress();

        // Finalize stats
        this.stats.finalWave = this.wave;
        this.stats.survived = true;

        // Display stats
        this.ui.showGameOverStats(souls, true);
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.ui.showPauseScreen();
        } else if (this.state === 'paused') {
            this.ui.resumeGame();
        } else if (this.state === 'frozen') {
            // Can pause from frozen state
            this.state = 'paused';
            this.ui.showPauseScreen();
            this.ui.showFrozenMessage(false);
        }
    }

    toggleFreeze() {
        if (this.state === 'playing') {
            this.setFrozen(true);
            this.manualFreeze = true;

            // Snapshot active inputs to ignore them for auto-resume
            // This allows the user to hold keys while freezing, but resume by pressing NEW keys
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
        this.manualFreeze = false; // Always clear manual flag
        this.ui.showFrozenMessage(false);
        this.lastTime = performance.now();
    }

    updateGlobalLights() {
        if (!this.player) return;

        const radiusMultiplier = 1 + this.player.lightRadiusBonus;

        // Update Cursor Light stats
        if (this.cursorLight) {
            // Update height (preserve X/Z - current position might be stale so we only set Y relative)
            // Actually, we can't easily set Y without knowing X/Z if we want to be safe, 
            // but cursorLight.position.y is what matters.
            this.cursorLight.position.y = 300 * radiusMultiplier;

            // Scale intensity and distance
            this.cursorLight.intensity = 5000 * Math.pow(radiusMultiplier, 1.5);
            this.cursorLight.distance = 3000 * radiusMultiplier;
        }

        // Update Cursor Glow
        if (this.cursorGlow) {
            this.cursorGlow.distance = 900 * radiusMultiplier;
        }
    }

    // Stats persistence methods (delegated to StatsManager)
    loadPreviousStats() {
        return StatsManager.loadPreviousStats();
    }

    saveCurrentStats() {
        StatsManager.saveCurrentStats(this.stats, this.player.level);
    }

    loadMetaProgress() {
        return StatsManager.loadMetaProgress();
    }

    saveMetaProgress() {
        StatsManager.saveMetaProgress(this.metaProgress);
    }

    updateCameraTransform() {
        if (!this.player) return;
        const hRadius = this.camDist * Math.cos(this.camPitch);
        const camY = this.camDist * Math.sin(this.camPitch);
        const camX = this.player.x + hRadius * Math.sin(this.camYaw);
        const camZ = this.player.y + hRadius * Math.cos(this.camYaw);
        this.camera3D.position.set(camX, camY, camZ);
        this.camera3D.lookAt(this.player.x, 0, this.player.y);
    }

    getRunSouls() {
        return Math.floor(this.kills / 5);
    }
}
