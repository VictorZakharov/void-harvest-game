import {
    XP_ITEM_BASE_VALUE
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';
import { EnemyVisuals } from './EnemyVisuals.js';

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
                this.damage = 5;
                this.xpValue = XP_ITEM_BASE_VALUE;
                this.shootTimer = 0;
                this.shootRate = 180;
                this.width = this.height = 32;
                this.slowAmount = 0.15;
                this.slowDuration = 60;
                break;
        }

        this.sprite = SpriteGenerator.createEnemySprite(type, this.width);
        this.health = this.maxHealth;
        this.angle = 0;

        // Freeze effect state
        this.frozen = false;
        this.freezeTimer = 0;

        // Knockback handling state
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.knockbackTimer = 0;

        // Instantiate the visuals component
        this.visuals = new EnemyVisuals(this);
    }

    /**
     * Compatibility getter for external access to the 3D mesh.
     */
    get mesh() {
        return this.visuals.mesh;
    }

    /**
     * Compatibility setter for the mesh (required to avoid conflicts with Entity constructor).
     */
    set mesh(value) { }

    /**
     * Updates enemy AI, movement, and logic.
     * @param {number} playerX - Player's X position.
     * @param {number} playerY - Player's Y position.
     * @param {number} speedModifier - Multiplier for movement speed.
     */
    update(playerX, playerY, speedModifier = 1) {
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
            const currentSpeed = this.speed * speedModifier;
            this.vx = (dx / dist) * currentSpeed;
            this.vy = (dy / dist) * currentSpeed;
        }

        // Apply knockback if active
        if (this.knockbackTimer > 0) {
            this.knockbackTimer--;
            this.knockbackVx *= 0.9;
            this.knockbackVy *= 0.9;
            this.x += this.knockbackVx;
            this.y += this.knockbackVy;
            return;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Shooter and ice enemy shooting timer
        if ((this.type === 'shooter' || this.type === 'ice') && this.shootTimer !== undefined) {
            this.shootTimer++;
        }
    }

    /**
     * Checks if the enemy is ready to fire a projectile.
     * @returns {boolean}
     */
    canShoot() {
        if ((this.type === 'shooter' || this.type === 'ice') && this.shootTimer >= this.shootRate) {
            this.shootTimer = 0;
            return true;
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

    /**
     * Compatibility method to update the visual mesh.
     * Delegates to EnemyVisuals.
     */
    updateMesh(...args) {
        this.visuals.update(...args);
    }

    /**
     * Cleans up Three.js resources for the enemy.
     * @param {THREE.Scene} scene - The scene to remove visuals from.
     */
    dispose(scene) {
        this.visuals.dispose(scene);
    }
}
