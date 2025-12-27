import { PARTICLE_COUNT_HIT } from '../constants.js';

export class PhysicsSystem {
    constructor(game) {
        this.game = game;
    }

    update(dt) {
        if (!this.game.player || !this.game.enemies) return;

        // Check Enemy-Player Collisions
        // Optimize: Only check enemies near the player
        const player = this.game.player;
        const potentialCollisions = this.game.spatialHash.query(player.x, player.y, player.width, player.height);

        for (const enemy of potentialCollisions) {
            if (this.game.trainingMode && enemy.isDummy) continue; // Skip player collision for dummies

            if (enemy.collidesWith(player)) {
                // We need the index to remove from main array? 
                // game.enemies.splice(index, 1) is used in handlePlayerCollision
                // This makes it tricky if we don't have the index.
                // Let's find index or change handlePlayerCollision to use indexOf
                this.handlePlayerCollision(enemy);
            }
        }
    }

    handlePlayerCollision(enemy) {
        const { player, stats, particleManager, camera, scene, enemies } = this.game;

        const blocked = player.shieldActive;
        if (!blocked) {
            stats.damageReceived[enemy.type] += enemy.damage;
        }

        if (player.takeDamage(enemy.damage)) {
            this.game.gameOver();
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
