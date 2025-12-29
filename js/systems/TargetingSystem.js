export class TargetingSystem {
    constructor(spatialHash, lightingManager) {
        this.spatialHash = spatialHash;
        this.lightingManager = lightingManager;
    }

    /**
     * Finds the best target for a player based on range and visibility.
     * @param {Player} player - The player looking for a target.
     * @param {number} rangeOverride - Optional range override (uses player.range if null).
     * @returns {Enemy|null} The nearest valid target or null.
     */
    findTarget(player, rangeOverride = null) {
        const range = rangeOverride || player.range || 600;

        // Optimization: Query SpatialHash for candidates around player
        // Note: SpatialHash uses 2D coords (x, y) which match Entity x, y
        // We search in slightly larger weapon range box
        const candidates = this.spatialHash.query(
            player.x - range,
            player.y - range,
            range * 2,
            range * 2
        );

        let nearest = null;
        let minDst = Infinity;
        const rangeSq = range * range;

        for (const e of candidates) {
            if (e.health <= 0 || e.isDummy) continue;

            // 1. Check Weapon Range
            const pdx = (e.x + e.width / 2) - (player.x + player.width / 2);
            const pdy = (e.y + e.height / 2) - (player.y + player.height / 2);
            const pDistSq = pdx * pdx + pdy * pdy;

            if (pDistSq > rangeSq) continue;

            // 2. Check Light Visibility (Must be lit by any source)
            if (!this.lightingManager.isPointLit(e.x + e.width / 2, e.y + e.height / 2)) continue;

            // Sort by distance (nearest priority)
            if (pDistSq < minDst) {
                minDst = pDistSq;
                nearest = e;
            }
        }

        return nearest;
    }
}
