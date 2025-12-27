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

    handleShockwave() {
        const { player, particleManager, enemies } = this.game;

        player.triggerShockwave = false;
        particleManager.create(player.x + player.width / 2, player.y + player.height / 2, '#00ffff', 50);

        const shockwaveRadius = (player.shockwaveForce || 10) * 10;
        const rSq = shockwaveRadius * shockwaveRadius;

        // Optimize: Use Spatial Hash for shockwave
        const areaEnemies = this.game.spatialHash.query(
            player.x - shockwaveRadius,
            player.y - shockwaveRadius,
            shockwaveRadius * 2,
            shockwaveRadius * 2
        );

        const affectedEnemies = [];
        let totalResistance = 0;

        for (const enemy of areaEnemies) {
            const dx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
            const dy = (enemy.y + enemy.height / 2) - (player.y + player.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < shockwaveRadius) {
                affectedEnemies.push({ enemy, dist, dx, dy });
                totalResistance += (enemy.health || 30);
            }
        }

        const baseResistance = 100;
        let crowdFactor = totalResistance > baseResistance ? baseResistance / totalResistance : 1.0;
        if (crowdFactor < 0.2) crowdFactor = 0.2;

        for (const item of affectedEnemies) {
            const { enemy, dist, dx, dy } = item;
            let nx, ny;
            if (dist < 1) {
                const angle = Math.random() * Math.PI * 2;
                nx = Math.cos(angle);
                ny = Math.sin(angle);
            } else {
                nx = dx / dist;
                ny = dy / dist;
            }
            const distanceToCover = shockwaveRadius - dist;
            const initialSpeed = (distanceToCover / 10) * crowdFactor;
            enemy.applyKnockback(nx * initialSpeed, ny * initialSpeed, 30);
        }
    }
}
