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
     * @param {Function} callbacks.createExplosion - Function to spawn explosion ring (x, y, color, radius).
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
        const rightGunY = 10;
        const leftGunY = -10; // Mirror for left hand

        const cos = Math.cos(player.angle);
        const sin = Math.sin(player.angle);

        let effectiveDamage = player.damage;

        const createBulletAt = (angleOffset, sideOffset) => {
            const rotatedX = gunOffsetX * cos - sideOffset * sin;
            const rotatedY = gunOffsetX * sin + sideOffset * cos;

            const startX = bounds.centerX + rotatedX;
            const startY = bounds.centerY + rotatedY;

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
            createBulletAt(spreadOffset, rightGunY); // Always right hand for single shot
            player.currentSpread = Math.min(player.maxSpread, player.currentSpread + player.spreadPerShot);
        } else {
            const spreadStep = 0.15; // Slightly tighter spread per bullet since they are separated physically
            for (let i = 0; i < player.projectileCount; i++) {
                // Alternate sides: Even -> Right, Odd -> Left
                const isRight = (i % 2 === 0);
                const sideOffset = isRight ? rightGunY : leftGunY;

                const baseOffset = (i - (player.projectileCount - 1) / 2) * spreadStep;
                const jitter = (Math.random() - 0.5) * 2 * player.currentSpread;
                createBulletAt(baseOffset + jitter, sideOffset);
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
        // Use enemy's current angle (which includes spread/jitter) for shooters
        // Fallback to targeting calculation for others or if angle isn't set
        let angle = enemy.angle;
        if (angle === undefined) {
            angle = Math.atan2(targetY - bounds.centerY, targetX - bounds.centerX);
        }

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
    update(player, enemies, timeScale = 1.0) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(timeScale);

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
                            // Check for freeze chance
                            if (player.freezeChance > 0 && Math.random() < player.freezeChance) {
                                enemy.freeze(120); // 2 seconds at 60fps
                                this.callbacks.createParticles(enemy.x, enemy.y, '#00ffff', 15);
                            } else {
                                this.callbacks.createParticles(enemy.x, enemy.y, '#ffff00', PARTICLE_COUNT_HIT);
                            }
                        }

                        // Splash Damage
                        if (player.splashRadius > 0) {
                            const rangeSq = player.splashRadius * player.splashRadius;
                            const splashDmg = bullet.damage * player.splashDamageRatio;

                            // Visuals for explosion at impact point
                            // Add slight jitter to separate simultaneous hits visually
                            const ex = bullet.x + (Math.random() - 0.5) * 15;
                            const ey = bullet.y + (Math.random() - 0.5) * 15;

                            this.callbacks.createParticles(ex, ey, '#ff5500', 8);
                            if (this.callbacks.createExplosion) {
                                this.callbacks.createExplosion(ex, ey, '#ff5500', player.splashRadius);
                            }

                            for (const other of enemies) {
                                if (other === enemy || other.health <= 0) continue;

                                const dx = other.x - enemy.x;
                                const dy = other.y - enemy.y;
                                if (dx * dx + dy * dy <= rangeSq) {
                                    if (other.takeDamage(splashDmg)) {
                                        if (this.callbacks.onEnemyDeath) this.callbacks.onEnemyDeath(other);
                                    }
                                    this.callbacks.createParticles(other.x, other.y, '#ff8800', 3);
                                }
                            }
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
                            amount: 0.25,
                            timer: 120
                        });
                        this.callbacks.createParticles(player.x, player.y, '#66ccff', 8);
                        // Ice bullets deal NO initial damage, only DoT via stacks (handled in Player.js)
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
