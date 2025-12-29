import { PARTICLE_COUNT_HIT } from '../constants.js';

export class PhysicsSystem {
    constructor(game) {
        this.game = game;
    }

    update(dt) {
        if (!this.game.players || !this.game.enemies) return;

        // Check Enemy-Player Collisions for ALL players
        const players = this.game.players;

        for (const player of players) {
            if (player.health <= 0 || player.isDowned) continue;

            const potentialCollisions = this.game.spatialHash.query(player.x, player.y, player.width, player.height);

            for (const enemy of potentialCollisions) {
                if (this.game.trainingMode && enemy.isDummy) continue; // Skip player collision for dummies

                // If enemy is already dead/processed (e.g. hit another player same frame), skip
                if (enemy.health <= 0) continue;

                if (enemy.collidesWith(player)) {
                    this.handlePlayerCollision(enemy, player);
                }
            }
        }
    }

    handlePlayerCollision(enemy, player) {
        const { stats, particleManager, camera, scene, enemies } = this.game;

        const blocked = player.shieldActive;
        if (!blocked) {
            stats.damageReceived[enemy.type] += enemy.damage;
        }

        if (player.takeDamage(enemy.damage)) {
            // Check if ALL players are dead/downed before ending game
            let allDead = true;
            if (this.game.isMultiplayer && this.game.players) {
                for (const p of this.game.players) {
                    if (!p.isDowned && p.health > 0) {
                        allDead = false;
                        break;
                    }
                }
            } else {
                // Single player: if takeDamage returns true, they are downed/dead -> Game Over
                allDead = true;
            }

            if (allDead) {
                this.game.gameOver();
            }
            return;
        }

        if (!blocked) {
            particleManager.create(enemy.x, enemy.y, '#ff0000', PARTICLE_COUNT_HIT);
            camera.shake = 10;
        } else {
            particleManager.create(enemy.x, enemy.y, '#00ffff', 10);
            camera.shake = 5;
        }

        enemy.dispose(scene);
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            enemies.splice(index, 1);
        }
    }
}
