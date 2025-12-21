// ==================== UI MANAGEMENT ====================
import { updateHUD } from './ui-hud.js';
import { showLevelUpScreen } from './ui-levelup.js';
import { showGameOverStats } from './ui-gameover.js';
import { showMetaUpgrades, showResetConfirmation, performMetaReset } from './ui-meta.js';
import { showGuide } from './ui-modals.js';
import { showPauseScreen, resumeGame } from './ui-pause.js';
import { renderCustomSkillSelection, renderCustomEnemySelection, renderCustomBiomeSelection } from './ui-custom.js';

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
        this.customBiome = { value: null }; // {value: 'id'} or null for random. Use object for ref passing.
        this.setupEventHandlers();
        this.setupSpeedControls();
        this.setupMainMenuEffects();
        this.updateMainMenuSouls(); // Initial check
    }

    setupSpeedControls() {
        // Initialize buttons based on current speed
        this.updateSpeedButtons(this.game.timeScale || 1.0);

        const speedBtns = document.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.onclick = (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.game.timeScale = speed;

                // Save to persistence
                this.game.metaProgress.gameSpeed = speed;
                this.game.saveMetaProgress();

                this.updateSpeedButtons(speed);
            };
        });
    }

    updateSpeedButtons(activeSpeed) {
        document.querySelectorAll('.speed-btn').forEach(btn => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            if (activeSpeed === btnSpeed) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateMainMenuSouls() {
        const display = document.getElementById('main-souls-display');
        const count = document.getElementById('main-souls-count');

        if (display && count) {
            const souls = this.game.totalSouls || 0;
            count.textContent = souls;

            // Only show if we have souls or history of souls? 
            // User requested "indicate unspent souls", implies we show 0 if they spent them?
            // "indicate unspent souls to user" - likely show 0 if they validly have 0.
            // Let's show it always if the UI is active, or maybe hide if 0 and never played?
            // Simpler: Always show.
            display.classList.remove('hidden');
        }
    }

    setupEventHandlers() {
        document.getElementById('start-btn').onclick = () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.game.debugWeather = false;
            // Clear any previous custom settings so we get a pure random start
            this.game.customEnemies = null;
            this.game.customSkills = null;
            this.game.customBiome = null;
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
            this.renderCustomBiomeSelection();
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
            this.game.customBiome = this.customBiome.value; // Pass selected biome
            this.game.debugWeather = document.getElementById('debug-weather-check').checked;
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
                this.game.debugWeather = false;
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
            this.updateMainMenuSouls(); // Update count on close

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
                const wasBiome = this.game.customBiome;
                this.game.reset();

                // Restore enemy selection
                this.customEnemies = { ...wasCustom };
                this.customBiome = { value: wasBiome };
                this.renderCustomEnemySelection();
                this.renderCustomSkillSelection();
                this.renderCustomBiomeSelection();

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
            this.updateMainMenuSouls(); // Update when returning to menu
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

    renderCustomBiomeSelection() {
        renderCustomBiomeSelection(this.game, this.customBiome, () => {
            this.renderCustomBiomeSelection();
        });
    }

    showFrozenMessage(show) {
        const el = document.getElementById('frozen-message');
        if (el) {
            if (show) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    }
    setupMainMenuEffects() {
        const startScreen = document.getElementById('start-screen');
        const card = startScreen.querySelector('.modal-content');

        // Ensure card keeps 3D context
        card.style.transformStyle = 'preserve-3d';
        card.style.transition = 'transform 0.1s ease-out';

        let rafId = null;

        document.addEventListener('mousemove', (e) => {
            // Only active if start screen is visible
            if (startScreen.classList.contains('hidden')) return;

            if (rafId) return; // Throttle to frame rate

            rafId = requestAnimationFrame(() => {
                const { clientX, clientY } = e;
                const { innerWidth, innerHeight } = window;

                // Caclulate normalized position (-1 to 1)
                const cx = innerWidth / 2;
                const cy = innerHeight / 2;

                const nx = (clientX - cx) / cx;
                const ny = (clientY - cy) / cy;

                // Settings
                const maxTilt = 5; // Reduced from 10 to prevent extreme clipping

                // Tilt Calculation
                const rx = -ny * maxTilt; // Rotate X (Up/Down tilt)
                const ry = nx * maxTilt;  // Rotate Y (Left/Right tilt)

                // Apply to Container
                card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;

                rafId = null;
            });
        });

        // Reset on mouse leave or idle? Not strictly necessary for fullscreen overlay
    }
}
