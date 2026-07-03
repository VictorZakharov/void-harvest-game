import { POLAR_VORTEX_RADIUS, ENEMY_DEATH_TOTAL_FRAMES } from '../constants.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
    }

    /**
     * Updates all enemies: movement, shooting, collision with player effects.
     * @param {number} effectiveScale - Time scale factor for movement
     * @param {Object} playerBounds - Cached bounds of the primary player (or relevant target)
     * @param {number} speedMod - Global speed modifier (e.g. from weather)
     */
    update(effectiveScale, playerBounds, speedMod) {
        const game = this.game;
        const enemies = game.enemies;
        const players = game.players;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];

            // Dying enemies are inert corpses: tick the death animation,
            // remove once it completes, skip all AI.
            if (enemy.isDying) {
                enemy.deathTime += effectiveScale;
                if (enemy.deathTime >= ENEMY_DEATH_TOTAL_FRAMES) {
                    enemy.dispose(game.scene);
                    enemies.splice(i, 1);
                }
                continue;
            }

            let currentSpeedMod = speedMod;

            // Stasis / Polar Vortex Logic
            if (game.player.stasisUnlocked) {
                const dx = (enemy.x + enemy.width / 2) - (game.player.x + game.player.width / 2);
                const dy = (enemy.y + enemy.height / 2) - (game.player.y + game.player.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Use defined radius or fallback constant. 
                const effectiveRadius = (game.player.stasisRadius || POLAR_VORTEX_RADIUS) + (enemy.width / 2);

                if (dist < effectiveRadius) {
                    currentSpeedMod *= (1 - game.player.stasisSlow);
                }
            }

            // Update Enemy Entity (Logic + Animation State)
            enemy.update(players, currentSpeedMod, effectiveScale);

            if (enemy.canShoot()) {
                // Find nearest valid target (ignoring downed players)
                // Defaults to playerBounds (Primary Player) if no better target found to keep logic safe
                let targetX = playerBounds.centerX;
                let targetY = playerBounds.centerY;
                let minDistSq = Infinity;

                for (const p of players) {
                    if (p.health > 0 && !p.isDowned) {
                        const dx = p.x - enemy.x;
                        const dy = p.y - enemy.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < minDistSq) {
                            minDistSq = dSq;
                            const pB = p.getBounds();
                            targetX = pB.centerX;
                            targetY = pB.centerY;
                        }
                    }
                }

                // Fire Bullet
                game.bulletManager.createEnemyBullet(enemy, targetX, targetY);
            }
        }
    }
}
