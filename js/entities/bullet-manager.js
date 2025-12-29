import { Bullet } from './Bullet.js';
import { PARTICLE_COUNT_HIT, POLAR_VORTEX_RADIUS } from '../constants.js';
import { EnemyInstancedAnimation } from './EnemyInstancedAnimation.js';

/**
 * Manages all projectiles in the game, including player and enemy bullets.
 * Handles creation, updates, collision detection, and cleanup of bullets.
 */
export class BulletManager {
    /**
     * @param {THREE.Scene} scene - The Three.js scene to add bullet meshes to.
     * @param {Object} stats - The game stats object for tracking shots fired and damage.
     * @param {SpatialHash} spatialHash - Spatial hash for optimized collision detection.
     * @param {Object} callbacks - Dictionary of callback functions.
     * @param {Function} callbacks.createParticles - Function to spawn particles (x, y, color, count).
     * @param {Function} callbacks.createExplosion - Function to spawn explosion ring (x, y, color, radius).
     * @param {Function} callbacks.onGameOver - Function to trigger game over state.
     * @param {Function} callbacks.onCameraShake - Function to trigger camera shake (amount).
     * @param {Function} [callbacks.onEnemyDeath] - Optional callback when an enemy is killed by a bullet.
     * @param {Function} [callbacks.onEnemyHit] - Optional callback when an enemy is hit (enemy, damage).
     */
    constructor(scene, stats, spatialHash, callbacks) {
        this.scene = scene;
        this.stats = stats;
        this.spatialHash = spatialHash;
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
                effectiveDamage, true, player.piercing, player.range, null, false,
                {
                    freezeChance: player.freezeChance,
                    splashRadius: player.splashRadius,
                    splashDamageRatio: player.splashDamageRatio
                },
                player.color // Apply player's unique color to projectile
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
            // Calculate exact Muzzle Position from Visual Model
            const muzzle = EnemyInstancedAnimation.getMuzzlePosition(enemy);
            startX = muzzle.x;
            startY = muzzle.z; // Game Z is 2D Y

            // Note: angle is already set correctly (straight or aimed)
            // We just updated the start point.

            // Recalculate angle from muzzle to target IF NOT DUMMY
            // Dummies should shoot straight ahead (controlled by their angle)
            if (!enemy.isDummy) {
                angle = Math.atan2(targetY - startY, targetX - startX);
            }

            // Apply spread to the bullet angle (Visuals only, does not rotate enemy body)
            const spread = 0.25; // Approx 14 degrees
            angle += (Math.random() - 0.5) * spread;
        }

        // Create Enemy Bullet
        const bullet = new Bullet(
            startX, startY, angle, 4, enemy.isDummy ? 0 : enemy.damage, false, 0, 600, enemy.type, enemy.isDummy,
            { forceFreeze: (enemy.type === 'ice') }
        );

        // Adjust for Bullet Center vs Top-Left
        // Bullet.js renders at x + width/2. We want center to be at startX.
        bullet.x -= bullet.width / 2;
        bullet.y -= bullet.height / 2;

        // Sync bullet visual height with gun muzzle height
        if (enemy.type === 'shooter' || enemy.type === 'ice') {
            const muzzle = EnemyInstancedAnimation.getMuzzlePosition(enemy);
            bullet.yHeight = muzzle.y;

            // Re-apply center correction using robust muzzle pos
            bullet.x = muzzle.x - bullet.width / 2;
            bullet.y = muzzle.z - bullet.height / 2;
        }

        this.bullets.push(bullet);
        this.scene.add(bullet.mesh);
    }

    /**
     * Updates all active bullets and handles collision detection.
     * @param {Player} player - The player entity (for enemy bullet collisions).
     * @param {Enemy[]} enemies - List of active enemies (for player bullet collisions).
     * @param {number} [timeScale=1.0] - Global game time scale.
     * @param {boolean} [friendlyFire=false] - Whether player bullets can hurt players.
     */
    update(players, enemies, timeScale = 1.0, friendlyFire = false) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            let currentScale = timeScale;
            // Check for Polar Vortex Bullet Slow (Level 3+)
            // Check against ALL players with Stasis unlocked
            // Ensure players is/are iterable
            const playerList = Array.isArray(players) ? players : [players];

            if (!bullet.isPlayer) {
                for (const p of playerList) {
                    if (p.stasisBulletSlow && p.health > 0 && !p.isDowned) {
                        const dx = bullet.x - p.x;
                        const dy = bullet.y - p.y;
                        const radIs = p.stasisRadius || POLAR_VORTEX_RADIUS;
                        if (dx * dx + dy * dy < radIs * radIs) {
                            currentScale *= (1 - p.stasisSlow);
                            // Don't stack multiple slows from multiple players? 
                            // Or do? safe to break after one application for now to prevent 0 speed
                            break;
                        }
                    }
                }
            }

            bullet.update(currentScale);

            if (bullet.isOutOfBounds()) {
                this.scene.remove(bullet.mesh);
                this.bullets.splice(i, 1);
                continue;
            }

            if (bullet.isPlayer) {
                // --- Friendly Fire Check ---
                // If enabled, check if bullet hits OTHER players
                if (friendlyFire) {
                    const playerList = Array.isArray(players) ? players : [players];
                    for (const p of playerList) {
                        // Standard Friendly Fire: Check collision against all active players.
                        // This allows PvP testing and simulates dangerous combat environments.

                        // Check collision
                        if (p.health > 0 && !p.isDowned) {
                            // Simple box/circle check
                            // Bullet is center x,y
                            const dx = bullet.x - (p.x + p.width / 2);
                            const dy = bullet.y - (p.y + p.height / 2);
                            const distSq = dx * dx + dy * dy;
                            const hitRad = (p.width / 2) + 5; // Player radius approx


                            if (distSq < hitRad * hitRad) {
                                // Hit Player!
                                p.takeDamage(bullet.damage);
                                this.callbacks.createParticles(p.x + p.width / 2, p.y + p.height / 2, '#ff0000', 5);

                                // Destroy Bullet
                                this.scene.remove(bullet.mesh);
                                this.bullets.splice(i, 1);
                                continue; // Proceed to next bullet
                            }
                        }
                    }
                } // End Friendly Fire


                // Optimize: Query only nearby enemies using Spatial Hash
                const nearbyEnemies = this.spatialHash.query(bullet.x, bullet.y, bullet.width || 8, bullet.height || 8);

                for (const enemy of nearbyEnemies) {
                    if (enemy.health > 0 && !bullet.hitEnemies.has(enemy) && bullet.collidesWith(enemy)) {
                        bullet.hitEnemies.add(enemy);

                        if (enemy.takeDamage(bullet.damage)) {
                            // Trigger callback for enemy death
                            if (this.callbacks.onEnemyDeath) {
                                this.callbacks.onEnemyDeath(enemy);
                            }
                        } else {
                            // Check for freeze chance: Standard OR Forced (Ice bullet deflection)
                            // Use BULLET stats, not player (since we don't know which player here easily)
                            if (bullet.forceFreeze || (bullet.freezeChance > 0 && Math.random() < bullet.freezeChance)) {
                                enemy.freeze(120); // 2 seconds at 60fps
                                this.callbacks.createParticles(enemy.x, enemy.y, '#00ffff', 15);
                            } else {
                                this.callbacks.createParticles(enemy.x, enemy.y, '#ffff00', PARTICLE_COUNT_HIT);
                            }
                        }

                        // Splash Damage
                        if (bullet.splashRadius > 0) {
                            const rangeSq = bullet.splashRadius * bullet.splashRadius;
                            const splashDmg = bullet.damage * bullet.splashDamageRatio;

                            // Visuals for explosion at impact point
                            // Add slight jitter to separate simultaneous hits visually
                            const ex = bullet.x + (Math.random() - 0.5) * 15;
                            const ey = bullet.y + (Math.random() - 0.5) * 15;

                            this.callbacks.createParticles(ex, ey, '#ff5500', 8);
                            if (this.callbacks.createExplosion) {
                                this.callbacks.createExplosion(ex, ey, '#ff5500', bullet.splashRadius);
                            }

                            // Optimize: Query enemies in splash radius
                            // Radius * 2 for width/height box
                            const splashEnemies = this.spatialHash.query(
                                ex - bullet.splashRadius,
                                ey - bullet.splashRadius,
                                bullet.splashRadius * 2,
                                bullet.splashRadius * 2
                            );

                            for (const other of splashEnemies) {
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
                for (const player of playerList) {
                    // Skip downed or dead players - bullets pass through them
                    if (player.isDowned || player.health <= 0) continue;

                    if (bullet.collidesWith(player)) {

                        // Deflect Skill Logic
                        // Redirects bullet back to nearest enemy if charges available AND Hit is from Front (120 deg arc)
                        if (player.deflectUnlocked && player.deflectCharges > 0) {

                            // Check Directionality
                            const playerFacing = player.angle;

                            // Robust angle calculation using velocity
                            const checkAngle = Math.atan2(bullet.vy, bullet.vx);
                            const incomingAngle = checkAngle + Math.PI;

                            let hitAngleDiff = incomingAngle - playerFacing;
                            while (hitAngleDiff > Math.PI) hitAngleDiff -= Math.PI * 2;
                            while (hitAngleDiff < -Math.PI) hitAngleDiff += Math.PI * 2;

                            // 120 degree arc = +/- 60 degrees (PI/3)
                            const arcRad = (120 * Math.PI / 180) / 2; // 60 degrees

                            if (Math.abs(hitAngleDiff) <= arcRad) {
                                // Valid Frontal Deflect
                                player.deflectCharges--;

                                // Find Target in Frontal Arc (Recalculate sourceAngle based on checkAngle)
                                const sourceAngle = checkAngle + Math.PI;
                                const arc = 120 * (Math.PI / 180);
                                const halfArc = arc / 2;

                                const deflectRange = 800;
                                // Fix: Query box must be centered on player (x-range, y-range)
                                const nearby = this.spatialHash.query(
                                    player.x - deflectRange,
                                    player.y - deflectRange,
                                    deflectRange * 2,
                                    deflectRange * 2
                                );

                                let nearest = null;
                                let minDst = Infinity;

                                for (const e of nearby) {
                                    if (e.health <= 0 || e.isDummy) {
                                        if (!e.isDummy && e.health <= 0) continue;
                                        if (e.health <= 0) continue;
                                    }

                                    const dx = (e.x + 0.5 * e.width) - bullet.x;
                                    const dy = (e.y + 0.5 * e.height) - bullet.y;

                                    // Check Angle Constraint (120 degree arc towards shooter/source)
                                    const angleToEnemy = Math.atan2(dy, dx);
                                    let angleDiff = angleToEnemy - sourceAngle;

                                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                                    if (Math.abs(angleDiff) > halfArc) continue;

                                    const d2 = dx * dx + dy * dy;
                                    if (d2 < minDst) {
                                        minDst = d2;
                                        nearest = e;
                                    }
                                }

                                // Default: Reflect back 180 degrees
                                let targetAngle = sourceAngle;

                                if (nearest) {
                                    // Aim at center of enemy from center of bullet
                                    const bx = bullet.x + bullet.width / 2;
                                    const by = bullet.y + bullet.height / 2;
                                    const ex = nearest.x + nearest.width / 2;
                                    const ey = nearest.y + nearest.height / 2;

                                    targetAngle = Math.atan2(ey - by, ex - bx);
                                }

                                // Convert Bullet to Player Bullet
                                bullet.isPlayer = true;
                                bullet.angle = targetAngle;
                                bullet.speed *= 1.5;
                                bullet.vx = Math.cos(targetAngle) * bullet.speed;
                                bullet.vy = Math.sin(targetAngle) * bullet.speed;

                                // Apply Stats
                                if (bullet.enemyType === 'ice') {
                                    bullet.damage = 0;
                                    bullet.forceFreeze = true;
                                } else {
                                    bullet.damage = player.damage;
                                }
                                bullet.piercing = player.piercing;
                                bullet.freezeChance = player.freezeChance;
                                bullet.splashRadius = player.splashRadius;
                                bullet.splashDamageRatio = player.splashDamageRatio;

                                // range: "Same as original"
                                // We reset distanceTraveled so it flies a full new cycle
                                bullet.distanceTraveled = 0;
                                // We do NOT overwrite maxDistance with player.range
                                // bullet.maxDistance remains whatever the enemy set it to (e.g. 600)

                                // Visuals
                                this.callbacks.createParticles(bullet.x, bullet.y, '#00ffff', 5);

                                continue; // Block damage
                            }
                            // Else: Hit from behind -> Fall through to normal damage logic
                        }

                        if (bullet.enemyType === 'ice') {
                            // Skip slow effect for dummy bullets
                            if (!bullet.fromDummy) {
                                player.slowEffects.push({
                                    amount: 0.25,
                                    timer: 120
                                });
                            }
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
