// ==================== ENTITY CLASSES ====================
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { SpriteGenerator } from './sprites.js';

export class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;
        this.vy = 0;
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height,
            centerX: this.x + this.width / 2,
            centerY: this.y + this.height / 2
        };
    }

    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.left < b.right && a.right > b.left &&
               a.top < b.bottom && a.bottom > b.top;
    }
}

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 32, 32);
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 3;
        this.sprite = SpriteGenerator.createPlayerSprite(32);

        // Combat stats
        this.damage = 10;
        this.fireRate = 10; // frames between shots
        this.fireTimer = 0;
        this.bulletSpeed = 8;
        this.bulletSize = 8;
        this.projectileCount = 1;
        this.piercing = 0;
        this.range = 600;

        // XP and leveling
        this.xp = 0;
        this.level = 1;
        this.xpToLevel = 10;

        // Rotation for aiming
        this.angle = 0;

        // Skill tracking
        this.skills = {};

        // Health regeneration
        this.healthRegen = 0; // HP per second
        this.regenTimer = 0;

        // Vampire (lifesteal)
        this.vampire = 0; // HP per kill
        this.vampireTimer = 0;
        this.vampireCooldown = 30; // frames (0.5 sec at 60fps)

        // Slow effect (cumulative - multiple ice hits stack)
        this.slowEffects = []; // Array of {amount, timer} objects

        // Freeze chance
        this.freezeChance = 0; // 0-1, where 0.1 = 10% chance

        // Extra skill choice
        this.extraChoice = false; // If true, show 4 skills instead of 3

        // Berserk mode
        this.berserkBonus = 0; // Damage multiplier when below 30% health

        // Armor
        this.armor = 0; // Absorbs damage before HP

        // Magnet range
        this.magnetBonus = 0; // Increases pickup range

        // Drop rate
        this.dropBonus = 0; // Increases health drop rate
    }

    update(input, mouseX, mouseY) {
        // Update slow effect timers and remove expired effects
        for (let i = this.slowEffects.length - 1; i >= 0; i--) {
            this.slowEffects[i].timer--;
            if (this.slowEffects[i].timer <= 0) {
                this.slowEffects.splice(i, 1);
            }
        }

        // Calculate total slow amount from all active effects
        const totalSlowAmount = this.slowEffects.reduce((sum, effect) => sum + effect.amount, 0);

        // Cap at 100% slow (can't go negative speed)
        const cappedSlowAmount = Math.min(1, totalSlowAmount);

        // Calculate effective speed with cumulative slow effect
        const effectiveSpeed = this.speed * (1 - cappedSlowAmount);

        // Movement
        this.vx = 0;
        this.vy = 0;

        if (input.keys['w'] || input.keys['ArrowUp']) this.vy = -effectiveSpeed;
        if (input.keys['s'] || input.keys['ArrowDown']) this.vy = effectiveSpeed;
        if (input.keys['a'] || input.keys['ArrowLeft']) this.vx = -effectiveSpeed;
        if (input.keys['d'] || input.keys['ArrowRight']) this.vx = effectiveSpeed;

        // Normalize diagonal movement
        if (this.vx !== 0 && this.vy !== 0) {
            this.vx *= 0.707;
            this.vy *= 0.707;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Keep in bounds
        this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.height, this.y));

        // Calculate aim angle
        const bounds = this.getBounds();
        this.angle = Math.atan2(mouseY - bounds.centerY, mouseX - bounds.centerX);

        // Fire timer
        if (this.fireTimer > 0) this.fireTimer--;

        // Health regeneration (60 frames = 1 second)
        if (this.healthRegen > 0) {
            this.regenTimer++;
            if (this.regenTimer >= 60) {
                this.regenTimer = 0;
                this.heal(this.healthRegen);
            }
        }

        // Vampire cooldown
        if (this.vampireTimer > 0) this.vampireTimer--;
    }

    shoot(mouseDown) {
        if (this.fireTimer === 0 && mouseDown) {
            this.fireTimer = this.fireRate;
            return true;
        }
        return false;
    }

    addXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToLevel) {
            this.levelUp();
            return true;
        }
        return false;
    }

    levelUp() {
        this.level++;
        this.xp = 0;
        this.xpToLevel = Math.floor(this.xpToLevel * 1.5);
    }

    takeDamage(amount) {
        // Armor reduces damage (permanent damage reduction)
        if (this.armor > 0) {
            amount = Math.max(0, amount - this.armor);
        }

        // Apply damage to health
        this.health -= amount;
        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    onKill() {
        // Vampire effect - heal on kill (with cooldown)
        if (this.vampire > 0 && this.vampireTimer === 0) {
            this.heal(this.vampire);
            this.vampireTimer = this.vampireCooldown;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);
        ctx.drawImage(this.sprite, -this.width / 2, -this.height / 2);
        ctx.restore();
    }
}

export class Enemy extends Entity {
    constructor(x, y, type) {
        super(x, y, 32, 32);
        this.type = type;

        // Set stats based on type
        switch(type) {
            case 'basic':
                this.maxHealth = 30;
                this.speed = 1.5;
                this.damage = 10;
                this.xpValue = 1;
                this.width = this.height = 32;
                break;
            case 'fast':
                this.maxHealth = 15;
                this.speed = 3;
                this.damage = 5;
                this.xpValue = 2;
                this.width = this.height = 28;
                break;
            case 'tank':
                this.maxHealth = 100;
                this.speed = 0.8;
                this.damage = 20;
                this.xpValue = 5;
                this.width = this.height = 40;
                break;
            case 'shooter':
                this.maxHealth = 20;
                this.speed = 1;
                this.damage = 5;
                this.xpValue = 3;
                this.shootTimer = 0;
                this.shootRate = 120;
                this.width = this.height = 32;
                break;
            case 'ice':
                this.maxHealth = 25;
                this.speed = 0.9;
                this.damage = 5; // Contact damage (same as shooter)
                this.xpValue = 3;
                this.shootTimer = 0;
                this.shootRate = 180; // Slower fire rate than regular shooter
                this.width = this.height = 32;
                this.slowAmount = 0.15; // 15% slow
                this.slowDuration = 60; // 1 second (60 frames at 60fps)
                break;
        }

        this.sprite = SpriteGenerator.createEnemySprite(type, this.width);
        this.health = this.maxHealth;
        this.angle = 0; // For rotation (shooters face player)

        // Freeze effect
        this.frozen = false;
        this.freezeTimer = 0;
    }

    update(playerX, playerY) {
        // Update freeze timer
        if (this.freezeTimer > 0) {
            this.freezeTimer--;
            if (this.freezeTimer === 0) {
                this.frozen = false;
            }
        }

        // Skip movement if frozen
        if (this.frozen) {
            return;
        }

        // Move towards player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate angle to player
        this.angle = Math.atan2(dy, dx);

        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Shooter and ice enemy shooting
        if ((this.type === 'shooter' || this.type === 'ice') && this.shootTimer !== undefined) {
            this.shootTimer++;
        }
    }

    canShoot() {
        if ((this.type === 'shooter' || this.type === 'ice') && this.shootTimer >= this.shootRate) {
            this.shootTimer = 0;
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    draw(ctx) {
        ctx.save();

        // Apply blue tint if frozen
        if (this.frozen) {
            ctx.globalAlpha = 0.7;
            ctx.filter = 'brightness(1.2) saturate(0.5)';
        }

        // Rotate shooter and ice enemies to face player
        if (this.type === 'shooter' || this.type === 'ice') {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.angle);
            ctx.drawImage(this.sprite, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        } else {
            ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
        }

        // Draw ice overlay if frozen
        if (this.frozen) {
            ctx.fillStyle = 'rgba(102, 204, 255, 0.4)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.restore();

        // Health bar
        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 3;
            const healthPercent = this.health / this.maxHealth;

            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x, this.y - 6, barWidth, barHeight);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y - 6, barWidth * healthPercent, barHeight);
        }
    }
}

export class Bullet extends Entity {
    constructor(x, y, angle, speed, damage, isPlayer = true, piercing = 0, range = 600, enemyType = null) {
        super(x, y, 8, 8);
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.isPlayer = isPlayer;
        this.piercing = piercing;
        this.maxPiercing = piercing;
        this.distanceTraveled = 0;
        this.maxDistance = range;
        this.enemyType = enemyType; // Store enemy type for ice bullets
        this.sprite = SpriteGenerator.createBulletSprite(
            isPlayer ? 'player' : (enemyType === 'ice' ? 'ice' : 'enemy')
        );

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.distanceTraveled += this.speed;
    }

    isOutOfBounds() {
        return this.x < -50 || this.x > CANVAS_WIDTH + 50 ||
               this.y < -50 || this.y > CANVAS_HEIGHT + 50 ||
               this.distanceTraveled > this.maxDistance;
    }

    onHit() {
        this.piercing--;
        return this.piercing < 0;
    }

    draw(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    }
}

export class Item extends Entity {
    constructor(x, y, type) {
        super(x, y, 12, 12);
        this.type = type;
        this.sprite = SpriteGenerator.createItemSprite(type);
        this.magnetRange = 80;
        this.magnetSpeed = 3;
    }

    update(playerX, playerY, playerMagnetBonus = 0) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Magnet effect with bonus range
        const effectiveMagnetRange = this.magnetRange * (1 + playerMagnetBonus);
        if (dist < effectiveMagnetRange && dist > 0) {
            this.vx = (dx / dist) * this.magnetSpeed;
            this.vy = (dy / dist) * this.magnetSpeed;
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    draw(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    }
}
