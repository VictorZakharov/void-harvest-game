import { PARTICLE_COUNT_HIT } from '../constants.js';

export class PhysicsSystem {
    constructor(game) {
        this.game = game;
    }

    update(dt) {
        if (!this.game.player || !this.game.enemies) return;

        // Check Enemy-Player Collisions
        for (let i = this.game.enemies.length - 1; i >= 0; i--) {
            const enemy = this.game.enemies[i];
            if (enemy.collidesWith(this.game.player)) {
                this.handlePlayerCollision(enemy, i);
            }
        }
    }

    handlePlayerCollision(enemy, index) {
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
        enemies.splice(index, 1);
    }

    handleShockwave() {
        const { player, particleManager, enemies } = this.game;

        player.triggerShockwave = false;
        particleManager.create(player.x + player.width / 2, player.y + player.height / 2, '#00ffff', 50);

        const shockwaveRadius = (player.shockwaveForce || 10) * 10;
        const affectedEnemies = [];
        let totalResistance = 0;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
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
