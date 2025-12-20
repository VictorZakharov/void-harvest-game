// ==================== GAME CLASS ====================
import {
    CANVAS_WIDTH, CANVAS_HEIGHT, GAME_DURATION, BASE_CAMERA_HEIGHT,
    WAVE_DURATION, INITIAL_SPAWN_RATE, MIN_SPAWN_RATE, SPAWN_RATE_DECREASE,
    WAVE_UNLOCK_FAST, WAVE_UNLOCK_SHOOTER, WAVE_UNLOCK_TANK, WAVE_UNLOCK_ICE,
    WAVE_SCALING_BOOST_1, WAVE_SCALING_BOOST_2, ENEMY_SCALING_PER_WAVE,
    HEALTH_DROP_BASE_RATE, HEALTH_RESTORE_AMOUNT, PARTICLE_COUNT_HIT, PARTICLE_COUNT_DEATH,
    WEATHER_DURATION, WEATHER_WARNING_TIME, WEATHER_FADE_TIME,
    WEATHER_INTERVAL_MIN, WEATHER_INTERVAL_MAX, WEATHER_SLOW_AMOUNT
} from './constants.js';
import { BIOMES, WEATHER_TYPES, DEFAULT_FOG_DENSITY } from './biomes.js';
import { Player, Enemy, Bullet, Item } from './entities.js';
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

        // Initialize 3D Scene
        this.init3D();

        this.reset();
    }

    init3D() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
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

        // Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5); // Intersect at y=5 (mid-height of player/items)
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

        this.enemies = [];
        this.bullets = [];
        this.items = [];
        this.particles = [];

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
            this.createPlayerBullets();
        }

        // Spawn enemies
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnRate) {
            this.spawnTimer = 0;
            this.spawnEnemy();
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
                this.createEnemyBullet(enemy, playerBounds.centerX, playerBounds.centerY);
            }

            // Check collision with player
            if (enemy.collidesWith(this.player)) {
                this.stats.damageReceived[enemy.type] += enemy.damage;
                if (this.player.takeDamage(enemy.damage)) {
                    this.gameOver();
                }
                this.createParticles(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_HIT);

                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
                this.camera.shake = 10;
            }
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            if (bullet.isOutOfBounds()) {
                this.scene.remove(bullet.mesh);
                this.bullets.splice(i, 1);
                continue;
            }

            // Check bullet collisions
            if (bullet.isPlayer) {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];

                    // Skip if this bullet already hit this enemy
                    if (bullet.hitEnemies.has(enemy)) continue;

                    if (bullet.collidesWith(enemy)) {
                        // Mark this enemy as hit by this bullet
                        bullet.hitEnemies.add(enemy);

                        // Track stats
                        this.stats.shotsHit++;
                        this.stats.damageDealt += bullet.damage;

                        // Check for freeze effect
                        if (this.player.freezeChance > 0 && Math.random() < this.player.freezeChance) {
                            enemy.frozen = true;
                            enemy.freezeTimer = 60; // 1 second
                            this.createParticles(enemy.x, enemy.y, '#66ccff', 15);
                        }

                        if (enemy.takeDamage(bullet.damage)) {
                            this.kills++;
                            this.stats.enemiesKilled[enemy.type]++;
                            this.player.onKill(); // Vampire effect
                            this.createParticles(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_DEATH);
                            this.spawnXP(enemy.x, enemy.y, enemy.xpValue);

                            this.scene.remove(enemy.mesh);
                            this.enemies.splice(j, 1);
                        } else {
                            this.createParticles(enemy.x, enemy.y, '#ffff00', PARTICLE_COUNT_HIT);
                        }

                        // Only remove bullet and stop checking if it has no piercing left
                        if (bullet.onHit()) {
                            this.scene.remove(bullet.mesh);
                            this.bullets.splice(i, 1);
                            break;
                        }
                        // Otherwise, bullet continues to next enemy (piercing)
                    }
                }
            } else {
                // Enemy bullet
                if (bullet.collidesWith(this.player)) {
                    // Ice bullets apply slow effect (cumulative)
                    if (bullet.enemyType === 'ice') {
                        this.player.slowEffects.push({
                            amount: 0.15, // 15% slow
                            timer: 60     // 1 second
                        });
                        this.createParticles(this.player.x, this.player.y, '#66ccff', 8);
                    } else {
                        this.stats.damageReceived.bullet += bullet.damage;
                        if (this.player.takeDamage(bullet.damage)) {
                            this.gameOver();
                        }
                        this.createParticles(this.player.x, this.player.y, '#ff0000', PARTICLE_COUNT_HIT);
                    }
                    this.scene.remove(bullet.mesh);
                    this.bullets.splice(i, 1);
                    this.camera.shake = 8;
                }
            }
        }

        // Update items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(playerBounds.centerX, playerBounds.centerY, this.player.magnetBonus, this.player.speed, this.player, target.x, target.z);

            if (item.collidesWith(this.player)) {
                this.collectItem(item);
                this.scene.remove(item.mesh);
                this.items.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isDead()) {
                this.scene.remove(this.particles[i].mesh);
                this.particles.splice(i, 1);
            }
        }

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
            if (visibility < 1.0) {
                for (let j = 0; j < this.bullets.length; j++) {
                    const b = this.bullets[j];
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

        this.bullets.forEach(b => b.updateMesh());
        this.items.forEach(i => i.updateMesh());
        this.particles.forEach(p => p.update()); // Particle update handles mesh update

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


    createPlayerBullets() {
        const bounds = this.player.getBounds();
        // Calculate Barrel Position
        // Gun Mesh Offset is (25, 10, 10). In 2D Top-Down:
        // Forward (X) = 25
        // Right (Y/Z) = 10
        // We need to rotate this offset by the player's angle.
        const gunOffsetX = 25;
        const gunOffsetY = 10;

        // Rotate offset
        const cos = Math.cos(this.player.angle);
        const sin = Math.sin(this.player.angle);

        // Rotated Vector = (x*cos - y*sin, x*sin + y*cos)
        // Note: Canvas Y is down, so rotation might feel inverted, but player.angle is already computed via atan2(dy, dx) so it's standard radians.
        const rotatedX = gunOffsetX * cos - gunOffsetY * sin;
        const rotatedY = gunOffsetX * sin + gunOffsetY * cos;

        const startX = bounds.centerX + rotatedX;
        const startY = bounds.centerY + rotatedY;

        // Calculate damage with berserk bonus at different health thresholds per level
        // Level 1 (0.5): +50% damage at ≤10% HP
        // Level 2 (1.0): +100% damage at <15% HP
        // Level 3 (1.5): +150% damage at <20% HP
        let effectiveDamage = this.player.damage;
        if (this.player.berserkBonus > 0) {
            const healthPercent = this.player.health / this.player.maxHealth;
            const berserkThreshold = this.player.berserkBonus * 0.1 + 0.05;
            const isBerserk = healthPercent <= berserkThreshold;
            effectiveDamage = this.player.damage * (isBerserk ? (1 + this.player.berserkBonus) : 1);
        }

        if (this.player.projectileCount === 1) {
            // Apply Spread
            const spreadOffset = (Math.random() - 0.5) * 2 * this.player.currentSpread;
            const bullet = new Bullet(
                startX, startY, this.player.angle + spreadOffset, this.player.bulletSpeed,
                effectiveDamage, true, this.player.piercing, this.player.range
            );
            this.bullets.push(bullet);
            this.scene.add(bullet.mesh);
            this.stats.shotsFired++;

            // Increase Recoil
            this.player.currentSpread = Math.min(this.player.maxSpread, this.player.currentSpread + this.player.spreadPerShot);
        } else {
            // Multishot logic - Add recoil to the base spread
            // Basic spread for multishot is Fixed (0.3). We add random jitter from recoil.
            const spreadStep = 0.3;
            for (let i = 0; i < this.player.projectileCount; i++) {
                const baseOffset = (i - (this.player.projectileCount - 1) / 2) * spreadStep;
                const jitter = (Math.random() - 0.5) * 2 * this.player.currentSpread;

                const bullet = new Bullet(
                    startX, startY, this.player.angle + baseOffset + jitter, this.player.bulletSpeed,
                    effectiveDamage, true, this.player.piercing, this.player.range
                );
                this.bullets.push(bullet);
                this.scene.add(bullet.mesh);
                this.stats.shotsFired++;
            }
            // Increase Recoil
            this.player.currentSpread = Math.min(this.player.maxSpread, this.player.currentSpread + this.player.spreadPerShot);
        }
    }

    createEnemyBullet(enemy, targetX, targetY) {
        const bounds = enemy.getBounds();
        const angle = Math.atan2(targetY - bounds.centerY, targetX - bounds.centerX);

        let startX = bounds.centerX;
        let startY = bounds.centerY;

        // Visual offset to match gun position for shooters
        if (enemy.type === 'shooter' || enemy.type === 'ice') {
            // Gun is at Local: Forward (X) ~ Width/2 + 15, Right (Z) ~ Height/2 + 4
            // 3D/Game Space Mapping:
            // Local Forward X -> Rotated Vector
            // Local Right Z -> Perpendicular Vector

            const localFwd = enemy.width / 2 + 15;
            const localRight = enemy.height / 2 + 4;

            // Rotation formula derived from mesh.rotation.y = -angle
            // x' = x*cos(a) - z*sin(a)
            // z' = x*sin(a) + z*cos(a)
            // Here 'z' is the 'right' component in local space

            startX += localFwd * Math.cos(angle) - localRight * Math.sin(angle);
            startY += localFwd * Math.sin(angle) + localRight * Math.cos(angle);
        }

        const bullet = new Bullet(
            startX, startY, angle, 4, enemy.damage, false, 0, 600, enemy.type
        );
        this.bullets.push(bullet);
        this.scene.add(bullet.mesh);
    }

    spawnEnemy() {
        // Radial spawning with "Smart Bounds"
        // Calculate valid angular intervals where the spawn circle lies within map bounds
        // to avoid spawning enemies in the "illuminated void" or having them snap to edge.

        const originX = this.player.x + (this.player.width / 2);
        const originY = this.player.y + (this.player.height / 2);
        const lightRadius = this.player.getLightRadius();
        const R = lightRadius * 1.5; // Spawn radius

        // 1. Initialize valid intervals (0 to 2PI)
        let intervals = [{ start: 0, end: Math.PI * 2 }];

        // Helper to subtract an angular range from the valid set
        const cut = (badStart, badEnd) => {
            const newIntervals = [];
            // Normalize inputs to 0..2PI
            badStart = (badStart + Math.PI * 4) % (Math.PI * 2);
            badEnd = (badEnd + Math.PI * 4) % (Math.PI * 2);

            // If wrapping (e.g. 350 to 10), split into two cuts
            if (badStart > badEnd) {
                // Cut badStart..2PI AND 0..badEnd
                // Recursive call is easiest, but let's handle manually to avoid stack
                // Actually, let's just run logic twice for the split
                // We'll create a temp list for first pass
            }
            // Wait, handling circular range subtraction generic is tricky.
            // Simpler: Just intersect valid ranges!
            // Valid Range X: [acos((0-ox)/R), acos((W-ox)/R)]? 
            // This is easier.
        };

        // REVISED GEOMETRY APPROACH: INTERSECTION
        // We need an angle theta such that:
        // originX + R*cos(theta) is in [-50, W+50]
        // originY + R*sin(theta) is in [-50, H+50]

        // 1. Find Valid Arc for X
        // cos(theta) must be in [minCos, maxCos]
        const minCos = (-50 - originX) / R;
        const maxCos = (CANVAS_WIDTH + 50 - originX) / R;
        // cos is valid if angle is NOT in the "forbidden Left cone" or "forbidden Right cone"
        // Valid Cos Range corresponds to arc around PI/2 and 3PI/2? No.
        // Left Edge (cos < minCos): Forbidden Arc centered at PI.
        // Right Edge (cos > maxCos): Forbidden Arc centered at 0.

        // 2. Find Valid Arc for Y
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
            const span = Math.acos(Math.max(-1, Math.min(1, maxCos))); // Half-width (acos is 0..PI)
            // Range is -span to +span (wrapping)
            badRanges.push({ start: 2 * Math.PI - span, end: span }); // Wrap handled simply?
        }
        // Top Wall (3PI/2 - Up in screen Y-check? No Y is down. 0 is Top.)
        // sin < minSin. minSin is negative usually.
        // Forbidden arc centered at 3PI/2 (270 deg)
        if (minSin > -1) {
            // asin gives -PI/2 to PI/2.
            // value is sin(theta) < minSin.
            // theta such that sin(theta) = minSin are intersections.
            // Arc is the bottom part? No Top part of screen is y=0.
            // y < -50 means "Above Top".
            // sin(t) corresponds to Y change.
            // t=3PI/2 -> sin=-1 -> y = oy - R. Correct.
            // So centered at 3PI/2.
            // Width? asin returns angle from X axis?
            // Let's use span from vertical.
            // cos(complement) = minSin?
            const span = Math.acos(Math.max(-1, Math.min(1, minSin))); // Angle from 3PI/2 intersection?
            // Actually: asin(minSin) gives angle near 3PI/2 (negative).
            // Valid Y is sin > minSin.
            // Bad Y is sin < minSin.
            // Range is roughly [3PI/2 - delta, 3PI/2 + delta].
            // To get width: Intersection is where sin(theta) = minSin.
            // theta = asin(minSin). (e.g. -10 deg). And PI - asin(minSin) (190 deg).
            // Bad range is between them: 190 to 350.
            // Center is 270 (3PI/2).
            const ang1 = Math.asin(Math.max(-1, Math.min(1, minSin))); // -PI/2..PI/2
            // Two solutions to sin(t)=K: a, PI-a.
            // Lower region is between PI-ang1 and 2PI+ang1.
            // Since ang1 is negative, PI-ang1 is > PI.
            // Start: PI - ang1. End: 2PI + ang1.
            badRanges.push({ start: Math.PI - ang1, end: (2 * Math.PI + ang1) });
        }
        // Bottom Wall (PI/2)
        // y > H+50. sin(t) > maxSin. center at PI/2.
        if (maxSin < 1) {
            const ang1 = Math.asin(Math.max(-1, Math.min(1, maxSin)));
            // Solutions: ang1, PI-ang1.
            // Region between ang1 and PI-ang1 is the "Hump" (positive sin).
            // Start: ang1. End: PI - ang1.
            badRanges.push({ start: ang1, end: Math.PI - ang1 });
        }

        // 3. Subtract all badRanges from [0, 2PI]
        const flatten = (ranges) => {
            // Sort by start
            // Normalize to 0..2PI handling wraps by splitting
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
            // Union
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
        };

        const bad = flatten(badRanges);

        // Invert to find Good Intervals
        const good = [];
        let cursor = 0;
        bad.forEach(b => {
            if (b.s > cursor) good.push({ s: cursor, e: b.s });
            cursor = Math.max(cursor, b.e);
        });
        if (cursor < 2 * Math.PI) good.push({ s: cursor, e: 2 * Math.PI });

        if (good.length === 0) return; // No valid spawn (e.g. map fully lit)

        // 4. Pick Random
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

        // No clamping needed (we ensured it's inside bounds via angle)
        // Except maybe float errors?



        // Choose enemy type based on wave with increasing difficulty
        let type = 'basic';
        const rand = Math.random();

        if (this.wave >= 20) {
            // Extreme late game - brutal difficulty
            if (rand < 0.35) type = 'tank';
            else if (rand < 0.6) type = 'shooter';
            else if (rand < 0.8) type = 'ice';
            else if (rand < 0.95) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= WAVE_SCALING_BOOST_1) {
            // Very late game - very hard
            if (rand < 0.3) type = 'tank';
            else if (rand < 0.55) type = 'shooter';
            else if (rand < 0.75) type = 'ice';
            else if (rand < 0.9) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= 10) {
            // Late game - hard enemies
            if (rand < 0.2) type = 'tank';
            else if (rand < 0.45) type = 'shooter';
            else if (rand < 0.65) type = 'ice';
            else if (rand < 0.85) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= WAVE_UNLOCK_ICE) {
            // Mid-late game - ice introduced
            if (rand < 0.1) type = 'tank';
            else if (rand < 0.3) type = 'shooter';
            else if (rand < 0.45) type = 'ice';
            else if (rand < 0.7) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= WAVE_UNLOCK_TANK) {
            // Mid-late game - tanks introduced
            if (rand < 0.1) type = 'tank';
            else if (rand < 0.35) type = 'shooter';
            else if (rand < 0.65) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= WAVE_UNLOCK_SHOOTER) {
            // Mid game - shooters introduced
            if (rand < 0.25) type = 'shooter';
            else if (rand < 0.55) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= WAVE_UNLOCK_FAST) {
            // Early-mid game - fast enemies introduced
            if (rand < 0.35) type = 'fast';
            else type = 'basic';
        }
        // Wave 1-2: Only basic enemies

        // Custom game mode: filter by enabled enemy types
        if (this.customEnemies) {
            // If selected type is disabled, choose randomly from enabled types
            if (!this.customEnemies[type]) {
                const enabledTypes = Object.keys(this.customEnemies).filter(t => this.customEnemies[t]);
                if (enabledTypes.length > 0) {
                    type = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
                } else {
                    type = 'basic'; // Fallback
                }
            }
        }

        const enemy = new Enemy(x, y, type);

        // Scale enemy stats based on wave (10% HP and damage increase per wave after wave 1)
        let scaleFactor = 1 + ((this.wave - 1) * ENEMY_SCALING_PER_WAVE);

        // Extra scaling for extreme late game
        if (this.wave >= WAVE_SCALING_BOOST_1) {
            scaleFactor += (this.wave - WAVE_SCALING_BOOST_1) * 0.05; // Additional 5% per wave after 15
        }
        if (this.wave >= WAVE_SCALING_BOOST_2) {
            scaleFactor += (this.wave - WAVE_SCALING_BOOST_2) * 0.1; // Even more brutal after wave 25
        }

        enemy.maxHealth = Math.floor(enemy.maxHealth * scaleFactor);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.floor(enemy.damage * scaleFactor);

        // Speed increases in late game
        if (this.wave >= 12) {
            enemy.speed *= 1 + ((this.wave - 12) * 0.04);
        }

        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
    }

    spawnXP(x, y, amount) {
        for (let i = 0; i < amount; i++) {
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;
            const item = new Item(x + offsetX, y + offsetY, 'xp');
            this.items.push(item);
            this.scene.add(item.mesh);
        }

        // Chance for health drop (base 5% + player bonus)
        const healthDropRate = HEALTH_DROP_BASE_RATE + (this.player.dropBonus || 0);
        if (Math.random() < healthDropRate) {
            const item = new Item(x, y, 'health');
            this.items.push(item);
            this.scene.add(item.mesh);
        }
    }

    collectItem(item) {
        switch (item.type) {
            case 'xp':
                let xpGain = 1;
                const xpBoostLevel = this.metaProgress.upgrades['xp_gain'] || 0;
                xpGain *= (1 + 0.2 * xpBoostLevel); // +20% per level

                if (this.player.addXP(xpGain)) {
                    this.ui.showLevelUpScreen();
                }
                break;
            case 'health':
                this.player.heal(HEALTH_RESTORE_AMOUNT);
                break;
        }
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const p = new Particle(
                x, y, color,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
            this.particles.push(p);
            this.scene.add(p.mesh);
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
