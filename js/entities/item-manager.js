import { Item } from './Item.js';
import { HEALTH_DROP_BASE_RATE, HEALTH_RESTORE_AMOUNT } from '../constants.js';

/**
 * Manages all collectable items in the game (XP orbs, health packs).
 * Handles spawning, physics (magnetism), and collection.
 */
export class ItemManager {
    /**
     * @param {THREE.Scene} scene - The Three.js scene.
     * @param {Player} player - The player entity.
     * @param {Object} metaProgress - Game meta progress for persistent upgrades.
     * @param {Object} callbacks - Dictionary of callbacks.
     * @param {Function} callbacks.onLevelUp - Callback when player levels up.
     */
    constructor(scene, playerOrPlayers, metaProgress, callbacks) {
        this.scene = scene;
        // Support array or single
        this.players = Array.isArray(playerOrPlayers) ? playerOrPlayers : [playerOrPlayers];
        // Keep single ref if needed for some legacy, but preferably use [0]
        this.player = this.players[0];

        this.metaProgress = metaProgress;
        this.callbacks = callbacks;
        this.items = [];
    }

    /**
     * Spawns XP orbs and potentially health packs at a specific location.
     * @param {number} x - The X coordinate.
     * @param {number} y - The Y coordinate.
     * @param {number} amount - Number of XP orbs to spawn.
     */
    spawnXP(x, y, amount) {
        for (let i = 0; i < amount; i++) {
            // Fly out of the corpse to a random side, then settle
            const item = new Item(x, y, 'xp');
            item.toss(Math.random() * Math.PI * 2, 2.5 + Math.random() * 2.5, 20 + Math.random() * 14);
            this.items.push(item);
            this.scene.add(item.mesh);
        }

        // Chance for health drop (Use P1 stats/highest drop bonus?)
        const maxDropBonus = this.players.reduce((max, p) => Math.max(max, p.dropBonus || 0), 0);
        const healthDropRate = HEALTH_DROP_BASE_RATE + maxDropBonus;

        if (Math.random() < healthDropRate) {
            const item = new Item(x, y, 'health');
            item.toss(Math.random() * Math.PI * 2, 3 + Math.random() * 2.5, 24 + Math.random() * 12);
            this.items.push(item);
            this.scene.add(item.mesh);
        }
    }

    /**
     * Updates all items: handles magnet attraction and collision with player.
     */
    update(timeScale = 1.0) {
        // Collect player bounds once
        // const bounds = this.player.getBounds(); // Legacy

        // We need to check against ALL players
        const playerBounds = this.players.filter(p => !p.isDowned && p.health > 0).map(p => ({
            p,
            bounds: p.getBounds()
        }));

        if (playerBounds.length === 0) return; // No active players

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];

            // Health packs only attract players who are actually hurt;
            // at full HP they are ignored and stay on the ground.
            let candidates = playerBounds;
            if (item.type === 'health') {
                candidates = playerBounds.filter(({ p }) => p.health < p.maxHealth);
            }
            const canPickup = candidates.length > 0;

            // Magnetism: closest eligible player attracts. With no eligible
            // player, fall back to the closest player just to keep toss
            // physics and discovery running (no magnet/pickup).
            const pool = canPickup ? candidates : playerBounds;
            let closest = null;
            let minDistSq = Infinity;

            pool.forEach(({ p, bounds }) => {
                const distSq = (item.x - bounds.centerX) ** 2 + (item.y - bounds.centerY) ** 2;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closest = { p, bounds };
                }
            });

            if (closest) {
                // Update item logic (magnetism, movement) towards closest
                item.update(
                    closest.bounds.centerX,
                    closest.bounds.centerY,
                    closest.p.magnetBonus,
                    closest.p.speed,
                    closest.p,
                    null, null,
                    timeScale,
                    canPickup
                );

                if (canPickup && item.collidesWith(closest.p)) {
                    this.collect(item, closest.p);
                    this.scene.remove(item.mesh);
                    this.items.splice(i, 1);
                }
            }
        }
    }

    /**
     * Handles the collection logic for a specific item.
     * @private
     * @param {Item} item - The collected item.
     * @param {Player} collector - The player who collected it.
     */
    collect(item, collector) {
        switch (item.type) {
            case 'xp':
                let xpGain = 1;
                const xpBoostLevel = this.metaProgress.upgrades['xp_gain'] || 0;
                xpGain *= (1 + 0.2 * xpBoostLevel); // +20% per level

                // Split XP evenly among all players to ensure simultaneous progression.
                const splitAmount = Math.ceil(xpGain / this.players.length);

                this.players.forEach(p => {
                    // Check if player levels up
                    if (p.health > 0 || p.isDowned) { // Gain XP even if downed? Sure.
                        if (p.addXP(splitAmount)) {
                            // Player leveled up!
                            if (this.callbacks.onLevelUp) {
                                this.callbacks.onLevelUp(p); // Pass the specific player
                            }
                        }
                    }
                });
                break;
            case 'health':
                collector.heal(HEALTH_RESTORE_AMOUNT);
                break;
        }
    }

    /**
     * Updates visual rotation of items.
     */
    updateMeshes() {
        this.items.forEach(i => i.updateMesh());
    }

    /**
     * Clears all items from the scene.
     */
    clear() {
        this.items.forEach(i => this.scene.remove(i.mesh));
        this.items.length = 0;
    }
}
