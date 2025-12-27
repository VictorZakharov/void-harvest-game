import {
    XP_ITEM_BASE_VALUE,
    SHOOTER_STOP_RANGE
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';

/**
 * Represents an enemy entity with AI, stats, and movement logic.
 * Rendering is delegated to the EnemyVisuals component.
 */
export class Enemy extends Entity {
    constructor(x, y, type) {
        super(x, y, 32, 32);
        this.type = type;

        // Set stats based on type
        switch (type) {
            case 'basic':
                this.maxHealth = 30;
                this.speed = 1.5;
                this.damage = 10;
                this.xpValue = 1;
                this.width = this.height = 32;
                break;
            case 'fast':
                this.maxHealth = 15;
                this.speed = 2.7; // Reduced from 3 to 0.9x
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
                this.shootRate = 240; // Reduced from 120 (2x slower)
                this.width = this.height = 32;
                break;
            case 'ice':
                this.maxHealth = 25;
                this.speed = 0.9;
                this.damage = 5;
                this.xpValue = XP_ITEM_BASE_VALUE;
                this.shootTimer = 0;
                this.shootRate = 180;
                this.width = this.height = 32;
                this.slowAmount = 0.25;
                this.slowDuration = 120;
                break;
        }

        this.sprite = SpriteGenerator.createEnemySprite(type, this.width);
        this.health = this.maxHealth;
        this.angle = 0;

        // Freeze effect state
        this.frozen = false;
        this.freezeTimer = 0;

        // Knockback handling state
        this.knockbackVy = 0;
        this.knockbackTimer = 0;
    }

    /**
     * Compatibility getter for external access to the 3D mesh.
     */


    /**
     * Updates enemy AI, movement, and logic.
     * @param {number} playerX - Player's X position.
     * @param {number} playerY - Player's Y position.
     * @param {number} speedModifier - Multiplier for movement speed.
     * @param {number} [timeScale=1.0] - Global game time scale.
     */
    update(playerX, playerY, speedModifier = 1, timeScale = 1.0) {
        // Update freeze timer
        if (this.freezeTimer > 0) {
            this.freezeTimer -= timeScale;
            if (this.freezeTimer <= 0) {
                this.frozen = false;
                this.freezeTimer = 0;
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

        // Calculate angle
        if (!this.isDummy) {
            // Face towards player
            this.angle = Math.atan2(dy, dx);
        }

        // Movement logic
        // Default to moving (unless dummy)
        let allowedToMove = !this.isDummy;

        // Shooter logic overrides movement
        if ((this.type === 'shooter' || this.type === 'ice') && this.shooterState !== undefined && this.shooterState !== 0) {
            allowedToMove = false;
        }

        if (dist > 0 && allowedToMove) {
            const currentSpeed = this.speed * speedModifier;
            this.vx = (dx / dist) * currentSpeed;
            this.vy = (dy / dist) * currentSpeed;
        } else {
            // Stop if too close, not allowed, or is dummy
            if (this.isDummy) {
                this.vx = 0;
                this.vy = 0;
            } else if (allowedToMove) {
                // Just resetting vx/vy if we shouldn't move
            }
        }

        // Apply knockback if active
        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= timeScale;
            this.knockbackVx *= 0.9;
            this.knockbackVy *= 0.9;

            // Apply time-scaled knockback movement
            this.x += this.knockbackVx * timeScale;
            this.y += this.knockbackVy * timeScale;
            return;
        }

        // Apply movement scaled by DT (timeScale)
        // vx/vy are speed * modifiers, so they represent "pixels per frame at 144fps" scaling
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;

        // Shooter and ice enemy logic
        // States: 
        // 0: Moving/Approaching (Default)
        // 1: Aiming (Stopped, Kneeling, Waiting)
        // 2: Shooting (Burst)
        // 3: Cooldown (Waiting to Aim again)

        if (this.type === 'shooter' || this.type === 'ice') {
            // Initialize state if missing
            if (this.shooterState === undefined) {
                this.shooterState = 0; // 0=Move, 1=Aim, 2=Shoot, 3=Cooldown
                this.stateTimer = 0;
                this.burstCount = 0;
                this.isKneeling = false;
            }

            // Dist check logic
            // Dummies always in range to ensure they fire
            const inRange = this.isDummy || (dist <= SHOOTER_STOP_RANGE);

            switch (this.shooterState) {
                case 0: // MOVING
                    if (inRange) {
                        this.shooterState = 1; // Start Aiming
                        this.stateTimer = 60; // 1 second aim time
                        this.isKneeling = true;
                        if (!this.isDummy) {
                            this.vx = 0;
                            this.vy = 0;
                        }
                    }
                    // Movement logic is handled above by general update if not handled here
                    // But we need to ensure we don't move if we just switched to Aiming
                    if (this.shooterState !== 0) {
                        this.vx = 0;
                        this.vy = 0;
                    }
                    else if (inRange) {
                        // Fallback safety, though the if(inRange) above should catch it
                        this.vx = 0;
                        this.vy = 0;
                    }
                    break;

                case 1: // AIMING
                    this.vx = 0;
                    this.vy = 0;
                    this.isKneeling = true;
                    this.stateTimer -= timeScale;

                    if (!inRange) {
                        // Player ran away, resume chase
                        this.shooterState = 0;
                        this.isKneeling = false;
                    } else if (this.stateTimer <= 0) {
                        // Aim finished, start shooting
                        this.shooterState = 2; // Shooting
                        this.burstCount = 0;
                        this.stateTimer = 0; // Ready to shoot immediately
                    }
                    break;

                case 2: // SHOOTING
                    this.vx = 0;
                    this.vy = 0;
                    this.isKneeling = true;
                    this.stateTimer -= timeScale;

                    // Shooting logic is handled in canShoot(), this state just manages the burst flow
                    // Actually, canShoot() needs to look at this state.
                    if (this.burstCount >= 3) {
                        this.shooterState = 3; // Cooldown
                        this.stateTimer = this.shootRate;
                    }
                    break;

                case 3: // COOLDOWN
                    this.vx = 0;
                    this.vy = 0;
                    this.isKneeling = true; // Stay kneeling in cooldown? Or stand up? 
                    // "kneel... aim... shoot... kneel happens instantly"
                    // If they stay in range, keeping them kneeling makes sense.

                    this.stateTimer -= timeScale;
                    if (!inRange) {
                        this.shooterState = 0;
                        this.isKneeling = false;
                    } else if (this.stateTimer <= 0) {
                        this.shooterState = 1; // Back to Aiming
                        this.stateTimer = 60;
                    }
                    break;
            }
        }
    }

    /**
     * Checks if the enemy is ready to fire a projectile.
     * @returns {boolean}
     */
    canShoot() {
        if (this.type === 'shooter' || this.type === 'ice') {
            if (this.shooterState === 2 && this.stateTimer <= 0) {
                this.burstCount++;
                this.stateTimer = 18; // Slow down burst (approx 0.3s between shots)

                // Apply random angular spread to the shot
                // The updated angle will be used by the BulletManager when collecting projectile data
                const spread = 0.25; // Approx 14 degrees spread (+/- 7 degrees)
                this.angle += (Math.random() - 0.5) * spread;

                return true;
            }
            return false;
        }
        return false;
    }

    /**
     * Applies damage to the enemy.
     * @param {number} amount - Amount of damage to apply.
     * @returns {boolean} True if the enemy has died.
     */
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    /**
     * Triggers a knockback effect on the enemy.
     * @param {number} vx - Velocity X component of knockback.
     * @param {number} vy - Velocity Y component of knockback.
     * @param {number} duration - Frames of knockback duration.
     */
    applyKnockback(vx, vy, duration = 10) {
        this.knockbackVx = vx;
        this.knockbackVy = vy;
        this.knockbackTimer = duration;
    }

    /**
     * Freezes the enemy in place.
     * @param {number} duration - Frames to stay frozen.
     */
    freeze(duration = 120) {
        this.frozen = true;
        this.freezeTimer = Math.max(this.freezeTimer, duration);
    }

    dispose(scene) {
        // Visuals are now handled by EnemyInstancedRenderer and HealthBarSystem
    }
}
