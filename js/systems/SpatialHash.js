/**
 * A spatial hash grid for efficient 2D spatial queries.
 * Divides the world into fixed-size cells to minimize collision checks.
 */
export class SpatialHash {
    /**
     * @param {number} cellSize - The size of each grid cell (e.g., 100).
     */
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.buckets = new Map();
    }

    /**
     * Clears the grid. Should be called every frame before re-populating.
     */
    clear() {
        this.buckets.clear();
    }

    /**
     * Inserts an entity into the grid.
     * @param {Object} entity - The entity to insert. Must have x, y properties.
     * @param {number} [width] - Optional width override (defaults to entity.width).
     * @param {number} [height] - Optional height override (defaults to entity.height).
     */
    insert(entity, width, height) {
        const w = width || entity.width || 0;
        const h = height || entity.height || 0;

        const left = Math.floor(entity.x / this.cellSize);
        const right = Math.floor((entity.x + w) / this.cellSize);
        const top = Math.floor(entity.y / this.cellSize);
        const bottom = Math.floor((entity.y + h) / this.cellSize);

        for (let i = left; i <= right; i++) {
            for (let j = top; j <= bottom; j++) {
                const key = `${i},${j}`;
                if (!this.buckets.has(key)) {
                    this.buckets.set(key, []);
                }
                this.buckets.get(key).push(entity);
            }
        }
    }

    /**
     * Retrieves all entities potentially colliding with the given bounds.
     * Returns a set of unique entities to avoid duplicates if spanning multiple cells.
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @returns {Set<Object>}
     */
    query(x, y, width, height) {
        const left = Math.floor(x / this.cellSize);
        const right = Math.floor((x + width) / this.cellSize);
        const top = Math.floor(y / this.cellSize);
        const bottom = Math.floor((y + height) / this.cellSize);

        const result = new Set();

        for (let i = left; i <= right; i++) {
            for (let j = top; j <= bottom; j++) {
                const key = `${i},${j}`;
                const bucket = this.buckets.get(key);
                if (bucket) {
                    for (const entity of bucket) {
                        result.add(entity);
                    }
                }
            }
        }
        return result;
    }
}
