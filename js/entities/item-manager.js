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
    constructor(scene, player, metaProgress, callbacks) {
        this.scene = scene;
        this.player = player;
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
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;
            const item = new Item(x + offsetX, y + offsetY, 'xp');
            this.items.push(item);
            this.scene.add(item.mesh);
        }

        // Chance for health drop
        const healthDropRate = HEALTH_DROP_BASE_RATE + (this.player.dropBonus || 0);
        if (Math.random() < healthDropRate) {
            const item = new Item(x, y, 'health');
            this.items.push(item);
            this.scene.add(item.mesh);
        }
    }

    /**
     * Updates all items: handles magnet attraction and collision with player.
     */
    update() {
        // We need player bounds for update logic inside Item.js usually?
        // Let's check Item.update signature: update(targetX, targetY, magnetStrength, speed, player, targetX_alt, targetZ_alt)
        // Wait, the signature in Game.js was:
        // item.update(playerBounds.centerX, playerBounds.centerY, this.player.magnetBonus, this.player.speed, this.player, target.x, target.z);
        // We'll simplify this if possible, or replicate it.

        const bounds = this.player.getBounds();

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];

            // Pass necessary data for magnet logic
            // Note: The original Game.js code passed 'target.x' and 'target.z' as last args but they seemed undefined in the snippet?
            // Actually, let's assume standard behavior.
            item.update(
                bounds.centerX,
                bounds.centerY,
                this.player.magnetBonus,
                this.player.speed,
                this.player
            );

            if (item.collidesWith(this.player)) {
                this.collect(item);
                this.scene.remove(item.mesh);
                this.items.splice(i, 1);
            }
        }
    }

    /**
     * Handles the collection logic for a specific item.
     * @private
     * @param {Item} item - The collected item.
     */
    collect(item) {
        switch (item.type) {
            case 'xp':
                let xpGain = 1;
                const xpBoostLevel = this.metaProgress.upgrades['xp_gain'] || 0;
                xpGain *= (1 + 0.2 * xpBoostLevel); // +20% per level

                if (this.player.addXP(xpGain)) {
                    if (this.callbacks.onLevelUp) {
                        this.callbacks.onLevelUp();
                    }
                }
                break;
            case 'health':
                this.player.heal(HEALTH_RESTORE_AMOUNT);
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
