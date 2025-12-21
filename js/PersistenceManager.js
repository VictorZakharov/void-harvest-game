import { StatsManager } from './stats.js';

/**
 * Manages the persistence of game data, including run statistics 
 * and meta-progression upgrades.
 */
export class PersistenceManager {
    constructor() {
        this.stats = StatsManager.createEmptyStats();
        this.metaProgress = { souls: 0, upgrades: {} };
    }

    /**
     * Resets the statistics for a new game run.
     */
    resetRunStats() {
        this.stats = StatsManager.createEmptyStats();
    }

    /**
     * Loads the meta-progression data from storage.
     * @returns {Object} The meta-progression object.
     */
    loadMetaProgress() {
        this.metaProgress = StatsManager.loadMetaProgress();
        return this.metaProgress;
    }

    /**
     * Loads statistics from the previously completed run.
     * @returns {Object|null}
     */
    loadPreviousStats() {
        return StatsManager.loadPreviousStats();
    }

    /**
     * Saves the statistics of the current run.
     * @param {number} playerLevel - The final level reached by the player.
     */
    saveRun(playerLevel) {
        StatsManager.saveCurrentStats(this.stats, playerLevel);
    }

    /**
     * Stores meta-progression data.
     * @param {Object} [metaProgress] - Optional new meta-progress object to save.
     */
    saveMeta(metaProgress) {
        if (metaProgress) this.metaProgress = metaProgress;
        StatsManager.saveMetaProgress(this.metaProgress);
    }
}
