// ==================== STATS TRACKING & PERSISTENCE ====================

export class StatsManager {
    static createEmptyStats() {
        return {
            enemiesKilled: {
                basic: 0,
                fast: 0,
                tank: 0,
                shooter: 0,
                ice: 0
            },
            damageReceived: {
                basic: 0,
                fast: 0,
                tank: 0,
                shooter: 0,
                ice: 0,
                bullet: 0
            },
            damageDealt: 0,
            shotsFired: 0,
            shotsHit: 0,
            skillsPicked: [], // [{level: 2, skill: "damage"}, ...]
            finalWave: 1,
            survived: false
        };
    }

    static loadPreviousStats() {
        const saved = localStorage.getItem('arpg_previous_run');
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    }

    static saveCurrentStats(stats, level) {
        const accuracy = stats.shotsFired > 0
            ? ((stats.shotsHit / stats.shotsFired) * 100)
            : 0;
        const totalDamageReceived = Object.values(stats.damageReceived).reduce((a, b) => a + b, 0);

        const statsToSave = {
            finalWave: stats.finalWave,
            level: level,
            damageDealt: Math.floor(stats.damageDealt),
            accuracy: parseFloat(accuracy.toFixed(1)),
            totalDamageReceived: Math.floor(totalDamageReceived),
            enemiesKilled: { ...stats.enemiesKilled }
        };

        localStorage.setItem('arpg_previous_run', JSON.stringify(statsToSave));
    }

    static loadMetaProgress() {
        const saved = localStorage.getItem('arpg_meta_progress');
        if (saved) {
            return JSON.parse(saved);
        }
        return { souls: 0, upgrades: {}, gameSpeed: 1.0 };
    }

    static saveMetaProgress(metaProgress) {
        localStorage.setItem('arpg_meta_progress', JSON.stringify(metaProgress));
    }
}
