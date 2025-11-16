// ==================== GAME CLASS ====================
import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_DURATION } from './constants.js';
import { Player, Enemy, Bullet, Item } from './entities.js';
import { Particle } from './particles.js';
import { InputHandler } from './input.js';
import { META_UPGRADES, SKILLS } from './skills.js';
import { UIManager } from './ui.js';
import { StatsManager } from './stats.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.input = new InputHandler(this.canvas);
        this.state = 'start'; // start, playing, paused, gameover
        this.gameLoopRunning = false;

        this.metaProgress = StatsManager.loadMetaProgress();
        this.totalSouls = this.metaProgress.souls || 0;

        this.ui = new UIManager(this);
        this.reset();
    }

    reset() {
        // Clear all game state completely
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
        this.player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        // Apply meta upgrades AFTER player is created (permanent upgrades only)
        this.applyMetaUpgrades();

        // Reset all game timers and counters
        this.spawnTimer = 0;
        this.spawnRate = 60;
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
        // Reset game state and apply meta upgrades (important for newly purchased upgrades!)
        this.reset();

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
                this.state = 'playing';
                this.lastTime = performance.now(); // Reset time to avoid jump
            }
        }

        if (this.state === 'playing') {
            this.update();
        }

        // Always draw, even when paused or gameover
        if (this.state !== 'start') {
            this.draw();
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

        // Update player
        this.player.update(this.input, this.input.mouseX, this.input.mouseY);

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
        if (this.difficultyTimer >= 900) { // Every 15 seconds
            this.difficultyTimer = 0;
            this.spawnRate = Math.max(20, this.spawnRate - 2);
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
                this.createParticles(enemy.x, enemy.y, '#ff0000', 5);
                this.enemies.splice(i, 1);
                this.camera.shake = 10;
            }
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            if (bullet.isOutOfBounds()) {
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
                            this.createParticles(enemy.x, enemy.y, '#ff0000', 10);
                            this.spawnXP(enemy.x, enemy.y, enemy.xpValue);
                            this.enemies.splice(j, 1);
                        } else {
                            this.createParticles(enemy.x, enemy.y, '#ffff00', 3);
                        }

                        // Only remove bullet and stop checking if it has no piercing left
                        if (bullet.onHit()) {
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
                        this.createParticles(this.player.x, this.player.y, '#ff0000', 5);
                    }
                    this.bullets.splice(i, 1);
                    this.camera.shake = 8;
                }
            }
        }

        // Update items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(playerBounds.centerX, playerBounds.centerY, this.player.magnetBonus, this.player.speed);

            if (item.collidesWith(this.player)) {
                this.collectItem(item);
                this.items.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isDead()) {
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

    draw() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Camera shake (only when playing)
        this.ctx.save();
        if (this.camera.shake > 0 && this.state === 'playing') {
            const shakeX = (Math.random() - 0.5) * this.camera.shake;
            const shakeY = (Math.random() - 0.5) * this.camera.shake;
            this.ctx.translate(shakeX, shakeY);
        }

        // Draw grid
        this.ctx.strokeStyle = '#2a2a3e';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CANVAS_WIDTH, y);
            this.ctx.stroke();
        }

        // Draw items
        this.items.forEach(item => item.draw(this.ctx));

        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));

        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(this.ctx));

        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw player
        this.player.draw(this.ctx);

        this.ctx.restore();

        // Draw slow effect overlay (blue glow on screen edges) - intensifies dramatically with stacks
        if (this.player.slowEffects.length > 0) {
            // Use the longest remaining timer for fade effect
            const maxTimer = Math.max(...this.player.slowEffects.map(e => e.timer));
            const timeFade = Math.min(1, maxTimer / 60); // Fade in/out

            // Calculate total slow percentage for opacity (more stacks = much more visible)
            const totalSlowPercent = Math.min(1, this.player.slowEffects.reduce((sum, e) => sum + e.amount, 0));

            // Inner radius shrinks dramatically with more stacks (vision tunnel)
            const innerRadius = CANVAS_WIDTH * (0.4 - totalSlowPercent * 0.35);
            const outerRadius = CANVAS_WIDTH * 0.7;

            const gradient = this.ctx.createRadialGradient(
                CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, innerRadius,
                CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, outerRadius
            );

            // At low stacks: subtle blue glow
            // At high stacks: intense white-blue, almost complete whiteout
            const baseOpacity = 0.4 + (totalSlowPercent * 0.5); // 0.4 to 0.9
            const edgeIntensity = baseOpacity * timeFade;

            // Mix in white at higher slow percentages for blinding effect
            const whiteAmount = Math.max(0, totalSlowPercent - 0.5) * 2; // 0 at 50%, 1 at 100%
            const r = 102 + (255 - 102) * whiteAmount;
            const g = 204 + (255 - 204) * whiteAmount;
            const b = 255;

            gradient.addColorStop(0, 'rgba(102, 204, 255, 0)');
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${edgeIntensity * 0.3})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${edgeIntensity})`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // At very high stacks (80%+), add full-screen overlay for near-complete whiteout
            if (totalSlowPercent >= 0.8) {
                const whiteoutOpacity = (totalSlowPercent - 0.8) * 5 * timeFade; // 0 at 80%, 1 at 100%
                this.ctx.fillStyle = `rgba(255, 255, 255, ${whiteoutOpacity * 0.6})`;
                this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
        }

        // Draw frozen state overlay
        if (this.state === 'frozen') {
            // Semi-transparent dark overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Message box positioned away from player
            const boxWidth = 500;
            const boxHeight = 120;
            const margin = 60;

            // Get player position
            const playerX = this.player.x;
            const playerY = this.player.y;

            // Define possible message box positions
            const positions = [
                {
                    name: 'top',
                    x: (CANVAS_WIDTH - boxWidth) / 2,
                    y: margin
                },
                {
                    name: 'bottom',
                    x: (CANVAS_WIDTH - boxWidth) / 2,
                    y: CANVAS_HEIGHT - boxHeight - margin
                },
                {
                    name: 'left',
                    x: margin,
                    y: (CANVAS_HEIGHT - boxHeight) / 2
                },
                {
                    name: 'right',
                    x: CANVAS_WIDTH - boxWidth - margin,
                    y: (CANVAS_HEIGHT - boxHeight) / 2
                }
            ];

            // Calculate distance from player to nearest edge of each message box
            let maxDist = -1;
            let bestPosition = positions[0];

            for (const pos of positions) {
                // Find closest point on rectangle to player
                const closestX = Math.max(pos.x, Math.min(playerX, pos.x + boxWidth));
                const closestY = Math.max(pos.y, Math.min(playerY, pos.y + boxHeight));

                // Calculate distance to closest point on rectangle perimeter
                const dist = Math.sqrt(
                    Math.pow(playerX - closestX, 2) +
                    Math.pow(playerY - closestY, 2)
                );

                if (dist > maxDist) {
                    maxDist = dist;
                    bestPosition = pos;
                }
            }

            const boxX = bestPosition.x;
            const boxY = bestPosition.y;

            // Box background with glow
            this.ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 3;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            this.ctx.shadowBlur = 0;

            // Title text
            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = 'bold 28px "Courier New"';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Skill Acquired!', boxX + boxWidth / 2, boxY + 35);

            // Instruction text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px "Courier New"';
            this.ctx.fillText('Move or shoot to continue...', boxX + boxWidth / 2, boxY + 75);

            // Reset text properties
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
        }
    }

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
            this.bullets.push(new Bullet(
                startX, startY, this.player.angle, this.player.bulletSpeed,
                effectiveDamage, true, this.player.piercing, this.player.range
            ));
            this.stats.shotsFired++;
        } else {
            const spread = 0.3;
            for (let i = 0; i < this.player.projectileCount; i++) {
                const offset = (i - (this.player.projectileCount - 1) / 2) * spread;
                this.bullets.push(new Bullet(
                    startX, startY, this.player.angle + offset, this.player.bulletSpeed,
                    effectiveDamage, true, this.player.piercing, this.player.range
                ));
                this.stats.shotsFired++;
            }
        }
    }

    createEnemyBullet(enemy, targetX, targetY) {
        const bounds = enemy.getBounds();
        const angle = Math.atan2(targetY - bounds.centerY, targetX - bounds.centerX);
        this.bullets.push(new Bullet(
            bounds.centerX, bounds.centerY, angle, 4, enemy.damage, false, 0, 600, enemy.type
        ));
    }

    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch(side) {
            case 0: x = Math.random() * CANVAS_WIDTH; y = -20; break;
            case 1: x = CANVAS_WIDTH + 20; y = Math.random() * CANVAS_HEIGHT; break;
            case 2: x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + 20; break;
            case 3: x = -20; y = Math.random() * CANVAS_HEIGHT; break;
        }

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
        } else if (this.wave >= 15) {
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
        } else if (this.wave >= 8) {
            // Mid-late game - ice introduced
            if (rand < 0.1) type = 'tank';
            else if (rand < 0.3) type = 'shooter';
            else if (rand < 0.45) type = 'ice';
            else if (rand < 0.7) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= 7) {
            // Mid-late game - tanks introduced
            if (rand < 0.1) type = 'tank';
            else if (rand < 0.35) type = 'shooter';
            else if (rand < 0.65) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= 5) {
            // Mid game - shooters introduced
            if (rand < 0.25) type = 'shooter';
            else if (rand < 0.55) type = 'fast';
            else type = 'basic';
        } else if (this.wave >= 3) {
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
        let scaleFactor = 1 + ((this.wave - 1) * 0.1);

        // Extra scaling for extreme late game
        if (this.wave >= 15) {
            scaleFactor += (this.wave - 15) * 0.05; // Additional 5% per wave after 15
        }
        if (this.wave >= 25) {
            scaleFactor += (this.wave - 25) * 0.1; // Even more brutal after wave 25
        }

        enemy.maxHealth = Math.floor(enemy.maxHealth * scaleFactor);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.floor(enemy.damage * scaleFactor);

        // Speed increases in late game
        if (this.wave >= 12) {
            enemy.speed *= 1 + ((this.wave - 12) * 0.04);
        }

        this.enemies.push(enemy);
    }

    spawnXP(x, y, amount) {
        for (let i = 0; i < amount; i++) {
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;
            this.items.push(new Item(x + offsetX, y + offsetY, 'xp'));
        }

        // Chance for health drop (base 5% + player bonus)
        const healthDropRate = 0.05 + (this.player.dropBonus || 0);
        if (Math.random() < healthDropRate) {
            this.items.push(new Item(x, y, 'health'));
        }
    }

    collectItem(item) {
        switch(item.type) {
            case 'xp':
                let xpGain = 1;
                const xpBoostLevel = this.metaProgress.upgrades['xp_gain'] || 0;
                xpGain *= (1 + 0.1 * xpBoostLevel);

                if (this.player.addXP(xpGain)) {
                    this.ui.showLevelUpScreen();
                }
                break;
            case 'health':
                this.player.heal(20);
                break;
        }
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push(new Particle(
                x, y, color,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            ));
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
