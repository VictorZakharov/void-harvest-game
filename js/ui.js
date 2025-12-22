// ==================== UI MANAGEMENT ====================
import { updateHUD } from './ui-hud.js';
import { showLevelUpScreen } from './ui-levelup.js';
import { showGameOverStats } from './ui-gameover.js';
import { showMetaUpgrades, showResetConfirmation, performMetaReset } from './ui-meta.js';
import { showGuide } from './ui-modals.js';
import { showPauseScreen, resumeGame } from './ui-pause.js';
import { CustomGameUI } from './ui-custom.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.customGameUI = new CustomGameUI(game);
    this.customSkills = {};
    this.customEnemies = {
      basic: true,
      fast: true,
      tank: true,
      shooter: true,
      ice: true
    };
    this.customBiome = { value: null };
    this.setupEventHandlers();
    this.setupSpeedControls();
    this.setupMainMenuEffects();
    this.updateMainMenuSouls();
  }

  // ... (unchanged methods)

  // Replaced loose function calls with method calls
  renderCustomSkillSelection() {
    this.customGameUI.renderSkillSelection(this.customSkills, () => {
      this.renderCustomSkillSelection();
    });
  }

  renderCustomEnemySelection() {
    this.customGameUI.renderEnemySelection(this.customEnemies, () => {
      this.renderCustomEnemySelection();
    });
  }

  renderCustomBiomeSelection() {
    this.customGameUI.renderBiomeSelection(this.customBiome, () => {
      this.renderCustomBiomeSelection();
    });
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

    // Close Button (X)
    const closeBtn = document.getElementById('close-custom-modal');
    if (closeBtn) {
      closeBtn.onclick = () => {
        document.getElementById('custom-modal').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden'); // Return to start
      };
    }

    // Custom Game Speed Buttons are handled globally by setupSpeedControls()

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

    // Game Over Exit Buttons
    const exitGameOver = () => {
      document.getElementById('gameover-modal').classList.add('hidden');
      this.game.reset();
      this.game.state = 'start';
      document.getElementById('start-screen').classList.remove('hidden');
      this.updateMainMenuSouls();
    };

    document.getElementById('gameover-exit-btn').onclick = exitGameOver;
    document.getElementById('close-gameover-x').onclick = exitGameOver;

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

    // Keyboard Navigation (Escape to close overlays)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {

        // 1. Reset Confirmation (Highest Priority)
        const resetModal = document.getElementById('reset-confirm-modal');
        if (resetModal && !resetModal.classList.contains('hidden')) {
          resetModal.classList.add('hidden');
          return;
        }

        // 2. Permanent Upgrades (Meta)
        const metaModal = document.getElementById('meta-modal');
        if (metaModal && !metaModal.classList.contains('hidden')) {
          metaModal.classList.add('hidden');
          this.updateMainMenuSouls();

          if (this.game.state === 'gameover') {
            document.getElementById('gameover-modal').classList.remove('hidden');
          } else if (this.game.state === 'start') {
            document.getElementById('start-screen').classList.remove('hidden');
          }
          return;
        }

        // 3. Custom Game Config
        const customModal = document.getElementById('custom-modal');
        if (customModal && !customModal.classList.contains('hidden')) {
          customModal.classList.add('hidden');
          document.getElementById('start-screen').classList.remove('hidden');
          return;
        }

        // 4. Guide Modal
        const guideModal = document.getElementById('guide-modal');
        if (guideModal && !guideModal.classList.contains('hidden')) {
          guideModal.classList.add('hidden');
          if (this.game.state === 'start') {
            document.getElementById('start-screen').classList.remove('hidden');
          }
          return;
        }

        // 5. Game Over Screen -> Main Menu
        const gameoverModal = document.getElementById('gameover-modal');
        if (gameoverModal && !gameoverModal.classList.contains('hidden')) {
          // Reuse the exit logic
          document.getElementById('gameover-modal').classList.add('hidden');
          this.game.reset();
          this.game.state = 'start';
          document.getElementById('start-screen').classList.remove('hidden');
          this.updateMainMenuSouls();
          return;
        }
      }
    });
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


  showFrozenMessage(show) {
    const el = document.getElementById('frozen-message');
    if (el) {
      if (show) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  setupMainMenuEffects() {
    const startScreen = document.getElementById('start-screen');
    const startCard = startScreen.querySelector('.modal-content');
    const customModal = document.getElementById('custom-modal');
    const customCard = customModal.querySelector('.modal-content');

    // Ensure cards keep 3D context
    [startCard, customCard].forEach(card => {
      if (card) {
        card.style.transformStyle = 'preserve-3d';
        card.style.transition = 'transform 0.1s ease-out';
      }
    });

    let rafId = null;

    document.addEventListener('mousemove', (e) => {
      // Check active modal
      let activeCard = null;

      // Disable main menu parallax if meta modal is open
      const metaModal = document.getElementById('meta-modal');
      if (metaModal && !metaModal.classList.contains('hidden')) {
        return;
      }

      if (!startScreen.classList.contains('hidden')) {
        activeCard = startCard;
      } else if (!customModal.classList.contains('hidden')) {
        activeCard = customCard;
      }

      if (!activeCard) return;

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
        const maxTilt = 5;

        // Tilt Calculation
        const rx = -ny * maxTilt; // Rotate X (Up/Down tilt)
        const ry = nx * maxTilt;  // Rotate Y (Left/Right tilt)

        // Apply to Active Card
        activeCard.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;

        rafId = null;
      });
    });

    // Reset transforms when mouse leaves? Optional, but keeping simple for now.
  }
}
