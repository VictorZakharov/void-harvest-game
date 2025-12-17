// ==================== GAME CLASS ====================
import {
    CANVAS_WIDTH, CANVAS_HEIGHT, GAME_DURATION,
    WAVE_DURATION, INITIAL_SPAWN_RATE, MIN_SPAWN_RATE, SPAWN_RATE_DECREASE,
    WAVE_UNLOCK_FAST, WAVE_UNLOCK_SHOOTER, WAVE_UNLOCK_TANK, WAVE_UNLOCK_ICE,
    WAVE_SCALING_BOOST_1, WAVE_SCALING_BOOST_2, ENEMY_SCALING_PER_WAVE,
    HEALTH_DROP_BASE_RATE, HEALTH_RESTORE_AMOUNT, PARTICLE_COUNT_HIT, PARTICLE_COUNT_DEATH
} from './constants.js';
import { Player, Enemy, Bullet, Item } from './entities.js';
import { Particle } from './particles.js';
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
        this.scene.background = new THREE.Color(0x000000); // Pitch Black
        this.scene.fog = new THREE.Fog(0x000000, 500, 2000); // Pitch Black Fog

        // Cursor Light (Follows mouse)
        // Cursor Light (Follows mouse)
        // SUPER intensity to cut through bright ambient
        this.cursorLight = new THREE.SpotLight(0xffffff, 5000.0); // Boosted to 5000
        this.cursorLight.position.set(0, 200, 0); // Lowered height for intensity
        this.cursorLight.angle = Math.PI / 3; // Widen angle to 60 deg (was 45) for +50% radius
        this.cursorLight.penumbra = 0.5;
        this.cursorLight.decay = 1.0; // Reduced decay for farther reach
        this.cursorLight.distance = 3000;
        this.cursorLight.castShadow = true;
        this.cursorLight.shadow.mapSize.width = 1024;
        this.cursorLight.shadow.mapSize.height = 1024;

        // Cursor Glow (Bright point source) - kept white/bright
        this.cursorGlow = new THREE.PointLight(0xffffff, 10.0, 900, 2); // Radius 600 -> 900 (+50%)
        this.scene.add(this.cursorGlow);

        // Target is dynamic, but we can just set target to (x, 0, z) in update
        // We need to add the light and its target to the scene
        this.scene.add(this.cursorLight);
        this.cursorLight.target.position.set(0, 0, 0);
        this.scene.add(this.cursorLight.target);

        // Camera (Adjusted for wider view)
        // Decouple aspect ratio from logical game size
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera3D = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
        this.camera3D.position.set(0, 800, 600); // Closer for better player focus
        this.camera3D.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        // Set renderer size to match display size (prevents stretching)
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.shadowMap.enabled = true;

        // Lights
        // High visibility setup
        // Lights
        // High Contrast / "Fog of War" setup
        const ambientLight = new THREE.AmbientLight(0x000000, 0.0); // Pure darkness
        this.scene.add(ambientLight);

        // Removed HemisphereLight to ensure darkness
        // const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5); 
        // this.scene.add(hemiLight);

        // Dim moonlight just for slight contour
        // Dim moonlight just for slight contour
        const dirLight = new THREE.DirectionalLight(0xaaccff, 0.05); // Barely visible rim light
        dirLight.position.set(500, 1000, 500);
        dirLight.castShadow = true;

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

        // Ground
        const groundGeo = new THREE.PlaneGeometry(CANVAS_WIDTH * 2, CANVAS_HEIGHT * 2);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(CANVAS_WIDTH * 2, 40, 0x444455, 0x222233);
        gridHelper.position.y = 1;
        this.scene.add(gridHelper);

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

    reset() {
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

        // Clear custom game mode
        this.customEnemies = null;
        this.customSkills = null;
        this.customSkillIds = null;

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

    start() {
        // Preserve custom game settings before reset
        const savedCustomEnemies = this.customEnemies;
        const savedCustomSkills = this.customSkills;

        // Reset game state and apply meta upgrades (important for newly purchased upgrades!)
        this.reset();

        // Restore custom game settings after reset
        this.customEnemies = savedCustomEnemies;
        this.customSkills = savedCustomSkills;

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

        // Handle ESC key for pause/resume (check before state check)
        if (this.input.escapePressed) {
            this.input.escapePressed = false;
            this.togglePause();
        }

        // Handle frozen state - check for any input to unfreeze
        if (this.state === 'frozen') {
            const hasMovementInput = this.input.keys['w'] || this.input.keys['a'] ||
                this.input.keys['s'] || this.input.keys['d'];
            const hasShootInput = this.input.mouseDown;

            if (hasMovementInput || hasShootInput) {
                this.unfreeze(); // New helper method
            } else {
                // Ensure UI is visible (in case setFrozen wasn't used or UI needs refresh)
                if (this.ui) this.ui.showFrozenMessage(true);
            }
        }

        if (this.state === 'playing') {
            this.update();
        }

        // Always draw, even when paused or gameover
        // Always render
        if (this.state !== 'start') {
            this.render3D();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {

        this.gameTime++;

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

            // Scale intensity to compensate for increased height (inverse square law approximation)
            // Base intensity 5000. With decay=1, we need linear+ compensation. 
            // Using power of 1.5 to ensure it stays punchy.
            this.cursorLight.intensity = 5000 * Math.pow(radiusMultiplier, 1.5);
            this.cursorLight.distance = 3000 * radiusMultiplier;
        }
        if (this.cursorGlow) {
            this.cursorGlow.position.set(target.x, 20, target.z);
        }

        // Update player with world coordinates
        // target.z maps to 2D y
        this.player.update(this.input, target.x, target.z);

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
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(playerBounds.centerX, playerBounds.centerY);

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
        // Update entity meshes
        const lightRadius = this.player.getLightRadius();
        const cursorTarget = this.cursorLight ? this.cursorLight.target.position : null;

        this.player.updateMesh();

        this.enemies.forEach(e => {
            let isVisible = false;

            // Check Player Light (Self)
            const dPlayer = Math.sqrt((e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2);
            if (dPlayer < lightRadius * 0.7) isVisible = true;

            // Check Cursor Light
            if (!isVisible && cursorTarget) {
                // cursorTarget.z is mapped to game Y
                const dCursor = Math.sqrt((e.x - cursorTarget.x) ** 2 + (e.y - cursorTarget.z) ** 2);
                if (dCursor < lightRadius) isVisible = true;
            }

            e.updateMesh(isVisible);
        });

        this.bullets.forEach(b => b.updateMesh());
        this.items.forEach(i => i.updateMesh());
        this.particles.forEach(p => p.update()); // Particle update handles mesh update

        // Camera follow (Basic)
        // Camera is already set at specific height/angle in init3D.
        // We just move X, Z to follow player.
        // Camera offset was (0, 800, 500) looking at (0,0,0).
        // So offset from target point (0,0,0) is (0, 800, 500).
        const targetX = this.player.x + this.player.width / 2;
        const targetZ = this.player.y + this.player.height / 2;

        this.camera3D.position.x = targetX;
        this.camera3D.position.z = targetZ + 600;
        this.camera3D.lookAt(targetX, 0, targetZ);

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
        const startX = bounds.centerX;
        const startY = bounds.centerY;

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
            const bullet = new Bullet(
                startX, startY, this.player.angle, this.player.bulletSpeed,
                effectiveDamage, true, this.player.piercing, this.player.range
            );
            this.bullets.push(bullet);
            this.scene.add(bullet.mesh);
            this.stats.shotsFired++;
        } else {
            const spread = 0.3;
            for (let i = 0; i < this.player.projectileCount; i++) {
                const offset = (i - (this.player.projectileCount - 1) / 2) * spread;
                const bullet = new Bullet(
                    startX, startY, this.player.angle + offset, this.player.bulletSpeed,
                    effectiveDamage, true, this.player.piercing, this.player.range
                );
                this.bullets.push(bullet);
                this.scene.add(bullet.mesh);
                this.stats.shotsFired++;
            }
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

        const souls = Math.floor(this.kills / 5);
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
}
