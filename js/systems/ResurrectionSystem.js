export class ResurrectionSystem {
    constructor(particleManager) {
        this.particleManager = particleManager;
        this.promptEl = document.getElementById('revive-prompt');
        this.REVIVE_RANGE = 100;
        this.REVIVE_TIME = 2 * 60; // 2 Seconds at 60fps (Game Time logic)
    }

    /**
     * Updates resurrection logic for a pair of players.
     * @param {Array<Player>} players 
     * @param {InputHandler} input 
     * @param {number} effectiveScale - Time scaling factor
     */
    update(players, input, effectiveScale) {
        // Only runs if 2 players are present
        if (players.length !== 2) return;

        const p1 = players[0]; // ID 0
        const p2 = players[1]; // ID 1 (Controller)

        let processedRevive = false;

        // Helper to handle one-way revive interaction
        const handleInteraction = (reviver, downed) => {
            if (!reviver || !downed) return;

            const dist = Math.hypot(reviver.x - downed.x, reviver.y - downed.y);
            let isReviving = false;

            // Check Input & Range
            if (dist < this.REVIVE_RANGE && !reviver.isDowned && reviver.health > 0) {
                // Show Prompt
                if (this.promptEl) {
                    const keyName = reviver.id === 0 ? "E" : "R-CTRL";
                    this.promptEl.innerHTML = `HOLD <span class="key-hint">[${keyName}]</span> TO REVIVE`;
                    this.promptEl.classList.remove('hidden');
                    processedRevive = true; // Flag that we seem to be in a revive state visually
                }

                // P1 reviving P2 -> Key 'e'
                if (reviver.id === 0 && input.keys['e']) isReviving = true;
                // P2 reviving P1 -> Key 'ControlRight'
                if (reviver.id === 1 && input.codes['ControlRight']) isReviving = true;
            }

            if (isReviving) {
                downed.reviveProgress += effectiveScale;

                // Update visual UI progress
                const pct = Math.min(100, (downed.reviveProgress / this.REVIVE_TIME) * 100);
                if (this.promptEl) {
                    const hintEl = this.promptEl.querySelector('.key-hint');
                    if (hintEl) hintEl.style.setProperty('--revive-progress', pct);
                }

                // Update 3D Ring
                const progress01 = downed.reviveProgress / this.REVIVE_TIME;
                downed.visuals.setReviveProgress(progress01, reviver.color);

                if (downed.reviveProgress >= this.REVIVE_TIME) {
                    downed.revive();
                    // Trigger resurrection particle effect
                    this.particleManager.create(downed.x, downed.y, '#00ff00', 30);
                    downed.visuals.setReviveProgress(0); // Reset and hide ring
                }
            } else {
                downed.reviveProgress = Math.max(0, downed.reviveProgress - effectiveScale); // Decay

                // Show empty ring if still downed (but out of range or not pressing key)
                if (downed.isDowned) {
                    // Show incomplete progress or empty ring?
                    // Original logic showed proportional decaying ring
                    downed.visuals.setReviveProgress(downed.reviveProgress / this.REVIVE_TIME, reviver.color);
                } else {
                    // Just in case it lingered
                    downed.visuals.setReviveProgress(0);
                }

                // Reset visual UI progress property
                if (this.promptEl && isReviving) { // Only if we *were* trying to revive? No, generally.
                    // Handled by CSS variable reset below if prompt is visible
                    const hintEl = this.promptEl.querySelector('.key-hint');
                    if (hintEl) hintEl.style.setProperty('--revive-progress', 0);
                }
            }
        };

        // Check both directions
        if (p1.isDowned && !p2.isDowned) handleInteraction(p2, p1);
        if (p2.isDowned && !p1.isDowned) handleInteraction(p1, p2);

        // Hide prompt if no valid interaction occurred this frame
        if (!processedRevive && this.promptEl) {
            this.promptEl.classList.add('hidden');
        }

        // Cleanup visuals for players who are downed but NOT being interacted with at all (e.g. partner dead or far away)
        // The handleInteraction handles the "in range but not pressing" case.
        // We need to handle "out of range" decay/hide.
        // Actually handleInteraction manages decay if called.
        // But if BOTH are Downed, handleInteraction is never called.
        if (p1.isDowned && p2.isDowned) {
            p1.reviveProgress = 0;
            p2.reviveProgress = 0;
            p1.visuals.setReviveProgress(0, p1.color); // Show "bleed out" or just static ring? Original: Own color if waiting
            p2.visuals.setReviveProgress(0, p2.color);
        }
    }

    hidePrompt() {
        if (this.promptEl) this.promptEl.classList.add('hidden');
    }
}
