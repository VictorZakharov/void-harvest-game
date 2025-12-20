import { Bullet } from './Bullet.js';
import { PARTICLE_COUNT_HIT } from '../constants.js';

/**
 * Manages all projectiles in the game, including player and enemy bullets.
 * Handles creation, updates, collision detection, and cleanup of bullets.
 */
export class BulletManager {
    /**
     * @param {THREE.Scene} scene - The Three.js scene to add bullet meshes to.
     * @param {Object} stats - The game stats object for tracking shots fired and damage.
     * @param {Object} callbacks - Dictionary of callback functions.
     * @param {Function} callbacks.createParticles - Function to spawn particles (x, y, color, count).
     * @param {Function} callbacks.onGameOver - Function to trigger game over state.
     * @param {Function} callbacks.onCameraShake - Function to trigger camera shake (amount).
     * @param {Function} [callbacks.onEnemyDeath] - Optional callback when an enemy is killed by a bullet.
     * @param {Function} [callbacks.onEnemyHit] - Optional callback when an enemy is hit (enemy, damage).
     */
    constructor(scene, stats, callbacks) {
        this.scene = scene;
        this.stats = stats;
        this.callbacks = callbacks;
        this.bullets = [];
    }

    /**
     * Creates bullets fired by the player.
     * Handles multishot, spread, and damage calculations based on player stats.
     * @param {Player} player - The player entity firing the bullets.
     */
    createPlayerBullets(player) {
        const bounds = player.getBounds();
        const gunOffsetX = 25;
        const gunOffsetY = 10;
        const cos = Math.cos(player.angle);
        const sin = Math.sin(player.angle);

        const rotatedX = gunOffsetX * cos - gunOffsetY * sin;
        const rotatedY = gunOffsetX * sin + gunOffsetY * cos;

        const startX = bounds.centerX + rotatedX;
        const startY = bounds.centerY + rotatedY;

        let effectiveDamage = player.damage;
        if (player.berserkBonus > 0) {
            const healthPercent = player.health / player.maxHealth;
            const berserkThreshold = player.berserkBonus * 0.1 + 0.05;
            const isBerserk = healthPercent <= berserkThreshold;
            effectiveDamage = player.damage * (isBerserk ? (1 + player.berserkBonus) : 1);
        }

        const createBullet = (angleOffset) => {
            const bullet = new Bullet(
                startX, startY, player.angle + angleOffset, player.bulletSpeed,
                effectiveDamage, true, player.piercing, player.range
            );
            this.bullets.push(bullet);
            this.scene.add(bullet.mesh);
            this.stats.shotsFired++;
        };

        if (player.projectileCount === 1) {
            const spreadOffset = (Math.random() - 0.5) * 2 * player.currentSpread;
            createBullet(spreadOffset);
            player.currentSpread = Math.min(player.maxSpread, player.currentSpread + player.spreadPerShot);
        } else {
            const spreadStep = 0.3;
            for (let i = 0; i < player.projectileCount; i++) {
                const baseOffset = (i - (player.projectileCount - 1) / 2) * spreadStep;
                const jitter = (Math.random() - 0.5) * 2 * player.currentSpread;
                createBullet(baseOffset + jitter);
            }
            player.currentSpread = Math.min(player.maxSpread, player.currentSpread + player.spreadPerShot);
        }
    }

    /**
     * Creates a bullet fired by an enemy towards a target.
     * @param {Enemy} enemy - The enemy entity firing the bullet.
     * @param {number} targetX - The X coordinate of the target.
     * @param {number} targetY - The Y coordinate of the target.
     */
    createEnemyBullet(enemy, targetX, targetY) {
        const bounds = enemy.getBounds();
        const angle = Math.atan2(targetY - bounds.centerY, targetX - bounds.centerX);

        let startX = bounds.centerX;
        let startY = bounds.centerY;

        if (enemy.type === 'shooter' || enemy.type === 'ice') {
            const localFwd = enemy.width / 2 + 15;
            const localRight = enemy.height / 2 + 4;
            startX += localFwd * Math.cos(angle) - localRight * Math.sin(angle);
            startY += localFwd * Math.sin(angle) + localRight * Math.cos(angle);
        }

        const bullet = new Bullet(
            startX, startY, angle, 4, enemy.damage, false, 0, 600, enemy.type
        );
        this.bullets.push(bullet);
        this.scene.add(bullet.mesh);
    }

    /**
     * Updates all active bullets and handles collision detection.
     * @param {Player} player - The player entity (for enemy bullet collisions).
     * @param {Enemy[]} enemies - List of active enemies (for player bullet collisions).
     */
    update(player, enemies) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            if (bullet.isOutOfBounds()) {
                this.scene.remove(bullet.mesh);
                this.bullets.splice(i, 1);
                continue;
            }

            if (bullet.isPlayer) {
                for (const enemy of enemies) {
                    if (enemy.health > 0 && !bullet.hitEnemies.has(enemy) && bullet.collidesWith(enemy)) {
                        bullet.hitEnemies.add(enemy);

                        if (enemy.takeDamage(bullet.damage)) {
                            // Trigger callback for enemy death
                            if (this.callbacks.onEnemyDeath) {
                                this.callbacks.onEnemyDeath(enemy);
                            }
                        } else {
                            this.callbacks.createParticles(enemy.x, enemy.y, '#ffff00', PARTICLE_COUNT_HIT);
                        }

                        this.callbacks.onEnemyHit && this.callbacks.onEnemyHit(enemy, bullet.damage); // For stats maybe?

                        if (bullet.onHit()) {
                            this.scene.remove(bullet.mesh);
                            this.bullets.splice(i, 1);
                            break; // Stop checking enemies for this bullet
                        }
                    }
                }
            } else {
                // Enemy bullet
                if (bullet.collidesWith(player)) {
                    if (bullet.enemyType === 'ice') {
                        player.slowEffects.push({
                            amount: 0.15,
                            timer: 60
                        });
                        this.callbacks.createParticles(player.x, player.y, '#66ccff', 8);
                    } else {
                        this.stats.damageReceived.bullet += bullet.damage;
                        if (player.takeDamage(bullet.damage)) {
                            this.callbacks.onGameOver();
                        }
                        this.callbacks.createParticles(player.x, player.y, '#ff0000', PARTICLE_COUNT_HIT);
                    }
                    this.scene.remove(bullet.mesh);
                    this.bullets.splice(i, 1);
                    this.callbacks.onCameraShake(8);
                }
            }
        }
    }

    /**
     * Updates the visual mesh positions of all bullets to match their logical state.
     * Should be called in the render loop.
     */
    updateMeshes() {
        this.bullets.forEach(b => b.updateMesh());
    }

    /**
     * Removes all bullets from the scene and clears the internal list.
     * Useful for game resets or restarting.
     */
    clear() {
        this.bullets.forEach(b => this.scene.remove(b.mesh));
        this.bullets.length = 0;
    }
}
