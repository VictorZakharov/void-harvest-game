// ==================== UI MANAGEMENT ====================
import { updateHUD } from './ui-hud.js';
import { showLevelUpScreen } from './ui-levelup.js';
import { showGameOverStats } from './ui-gameover.js';
import { showMetaUpgrades, showResetConfirmation, performMetaReset } from './ui-meta.js';
import { showGuide } from './ui-modals.js';
import { showPauseScreen, resumeGame } from './ui-pause.js';
import { renderCustomSkillSelection, renderCustomEnemySelection } from './ui-custom.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.customSkills = {}; // Store selected skill levels {skillId: level}
        this.customEnemies = { // Store selected enemy types
            basic: true,
            fast: true,
            tank: true,
            shooter: true,
            ice: true
        };
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        document.getElementById('start-btn').onclick = () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.game.start();
        };

        document.getElementById('meta-btn').onclick = () => {
            this.showMetaUpgrades();
        };

        document.getElementById('guide-btn').onclick = () => {
            this.showGuide();
        };

        document.getElementById('close-guide-btn').onclick = () => {
            document.getElementById('guide-modal').classList.add('hidden');

            // Return to start screen
            if (this.game.state === 'start') {
                document.getElementById('start-screen').classList.remove('hidden');
            }
        };

        document.getElementById('close-guide-x').onclick = () => {
            document.getElementById('guide-modal').classList.add('hidden');

            // Return to start screen
            if (this.game.state === 'start') {
                document.getElementById('start-screen').classList.remove('hidden');
            }
        };

        document.getElementById('custom-btn').onclick = () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.renderCustomEnemySelection();
            this.renderCustomSkillSelection();
            document.getElementById('custom-modal').classList.remove('hidden');
        };

        document.getElementById('start-custom-btn').onclick = () => {
            // Check that at least one type is selected
            if (!Object.values(this.customEnemies).some(v => v)) {
                alert('Please select at least one enemy type!');
                return;
            }

            document.getElementById('custom-modal').classList.add('hidden');
            this.game.customEnemies = { ...this.customEnemies };
            this.game.customSkills = { ...this.customSkills }; // Pass selected skills
            this.game.start();
        };

        document.getElementById('cancel-custom-btn').onclick = () => {
            document.getElementById('custom-modal').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        };

        document.getElementById('restart-btn').onclick = () => {
            document.getElementById('gameover-modal').classList.add('hidden');

            // If custom game, return to custom config screen
            if (this.game.customEnemies) {
                const wasCustom = this.game.customEnemies;
                this.game.reset();

                // Restore enemy selection
                this.customEnemies = { ...wasCustom };
                this.renderCustomEnemySelection();
                this.renderCustomSkillSelection();

                document.getElementById('custom-modal').classList.remove('hidden');
            } else {
                this.game.reset();
                this.game.start();
            }
        };

        document.getElementById('upgrades-btn').onclick = () => {
            document.getElementById('gameover-modal').classList.add('hidden');
            this.showMetaUpgrades();
        };

        document.getElementById('reset-meta-btn').onclick = () => {
            this.showResetConfirmation();
        };

        document.getElementById('confirm-reset-btn').onclick = () => {
            document.getElementById('reset-confirm-modal').classList.add('hidden');
            this.performMetaReset();
        };

        document.getElementById('cancel-reset-btn').onclick = () => {
            document.getElementById('reset-confirm-modal').classList.add('hidden');
        };

        document.getElementById('close-meta-btn').onclick = () => {
            document.getElementById('meta-modal').classList.add('hidden');

            // Return to appropriate screen
            if (this.game.state === 'gameover') {
                document.getElementById('gameover-modal').classList.remove('hidden');
            } else if (this.game.state === 'start') {
                document.getElementById('start-screen').classList.remove('hidden');
            }
        };

        // Pause screen buttons
        document.getElementById('resume-btn').onclick = () => {
            this.resumeGame();
        };

        document.getElementById('restart-pause-btn').onclick = () => {
            document.getElementById('pause-modal').classList.add('hidden');

            // If custom game, return to custom config screen
            if (this.game.customEnemies) {
                const wasCustom = this.game.customEnemies;
                this.game.reset();

                // Restore enemy selection
                this.customEnemies = { ...wasCustom };
                this.renderCustomEnemySelection();
                this.renderCustomSkillSelection();

                document.getElementById('custom-modal').classList.remove('hidden');
            } else {
                this.game.reset();
                this.game.start();
            }
        };

        document.getElementById('exit-pause-btn').onclick = () => {
            document.getElementById('pause-modal').classList.add('hidden');
            this.game.reset();
            this.game.state = 'start';
            document.getElementById('start-screen').classList.remove('hidden');
        };
    }

    // Delegate to imported functions
    updateHUD() {
        updateHUD(this.game);
    }

    showLevelUpScreen() {
        showLevelUpScreen(this.game);
    }

    showGameOverStats(souls, isVictory = false) {
        showGameOverStats(this.game, souls, isVictory);
    }

    showResetConfirmation() {
        showResetConfirmation(this.game);
    }

    performMetaReset() {
        performMetaReset(this.game);
    }

    showMetaUpgrades() {
        showMetaUpgrades(this.game);
    }

    showPauseScreen() {
        showPauseScreen(this.game);
    }

    resumeGame() {
        resumeGame(this.game);
    }

    showGuide() {
        showGuide();
    }

    renderCustomSkillSelection() {
        renderCustomSkillSelection(this.game, this.customSkills, () => {
            this.renderCustomSkillSelection();
        });
    }

    renderCustomEnemySelection() {
        renderCustomEnemySelection(this.game, this.customEnemies, () => {
            this.renderCustomEnemySelection();
        });
    }

    showFrozenMessage(show) {
        const el = document.getElementById('frozen-message');
        if (el) {
            if (show) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    }
}
