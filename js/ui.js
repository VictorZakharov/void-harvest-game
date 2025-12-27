// ==================== UI MANAGEMENT ====================
import { updateHUD } from './ui-hud.js';
import { showLevelUpScreen } from './ui-levelup.js';
import { showGameOverStats } from './ui-gameover.js';
import { showMetaUpgrades, showResetConfirmation, performMetaReset } from './ui-meta.js';
import { showGuide } from './ui-modals.js';
import { showPauseScreen, resumeGame } from './ui-pause.js';
import { CustomGameUI } from './ui-custom.js';
import { DOMCache } from './DOMCache.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.dom = new DOMCache();
    this.customGameUI = new CustomGameUI(game, this.dom);
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
    this.setupMainParallax();
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
    if (this.dom.mainSoulsDisplay && this.dom.mainSoulsCount) {
      const souls = this.game.totalSouls || 0;
      this.dom.setText(this.dom.mainSoulsCount, souls);
      this.dom.show(this.dom.mainSoulsDisplay);
    }
  }

  setupEventHandlers() {
    this.dom.startBtn.onclick = () => {
      this.dom.hide(this.dom.startScreen);
      this.game.debugWeather = false;
      // Clear any previous custom settings so we get a pure random start
      this.game.customEnemies = null;
      this.game.customSkills = null;
      this.game.customSkills = null;
      this.game.customBiome = null;
      this.game.customSpawnRate = null;
      this.game.customMaxEnemies = null;
      this.game.start();
    };

    this.dom.metaBtn.onclick = () => {
      this.showMetaUpgrades();
    };

    this.dom.guideBtn.onclick = () => {
      this.showGuide();
    };

    this.dom.closeGuideBtn.onclick = () => {
      this.dom.hide(this.dom.guideModal);

      // Return to start screen
      if (this.game.state === 'start') {
        this.dom.show(this.dom.startScreen);
      }
    };

    this.dom.closeGuideX.onclick = () => {
      this.dom.hide(this.dom.guideModal);

      // Return to start screen
      if (this.game.state === 'start') {
        this.dom.show(this.dom.startScreen);
      }
    };

    this.dom.customBtn.onclick = () => {
      this.dom.hide(this.dom.startScreen);
      this.renderCustomEnemySelection();
      this.renderCustomSkillSelection();
      this.renderCustomBiomeSelection();
      this.dom.show(this.dom.customModal);
    };

    this.dom.startCustomBtn.onclick = () => {
      // Check that at least one type is selected
      // if (!Object.values(this.customEnemies).some(v => v)) {
      //   alert('Please select at least one enemy type!');
      //   return;
      // }

      this.dom.hide(this.dom.customModal);
      this.game.customEnemies = { ...this.customEnemies };
      this.game.customSkills = { ...this.customSkills }; // Pass selected skills
      this.game.customBiome = this.customBiome.value; // Pass selected biome
      this.game.customBiome = this.customBiome.value; // Pass selected biome
      this.game.debugWeather = this.dom.debugWeatherCheck.checked; // Existing

      const rateVal = parseFloat(this.dom.customSpawnRateInput.value);
      this.game.customSpawnRate = isNaN(rateVal) ? null : rateVal;

      const maxVal = parseInt(this.dom.customMaxEnemiesInput.value);
      this.game.customMaxEnemies = isNaN(maxVal) ? null : maxVal;

      this.game.start();
    };

    // Close Button (X)
    if (this.dom.closeCustomModal) {
      this.dom.closeCustomModal.onclick = () => {
        this.dom.hide(this.dom.customModal);
        this.dom.show(this.dom.startScreen); // Return to start
      };
    }

    // Custom Game Speed Buttons are handled globally by setupSpeedControls()

    this.dom.restartBtn.onclick = () => {
      this.dom.hide(this.dom.gameoverModal);

      // If custom game, return to custom config screen
      if (this.game.customEnemies) {
        const wasCustom = this.game.customEnemies;
        this.game.reset();

        // Restore enemy selection
        this.customEnemies = { ...wasCustom };
        this.renderCustomEnemySelection();
        this.renderCustomSkillSelection();

        this.dom.show(this.dom.customModal);
      } else {
        this.game.debugWeather = false;
        this.game.reset();
        this.game.start();
      }
    };

    this.dom.upgradesBtn.onclick = () => {
      this.dom.hide(this.dom.gameoverModal);
      this.showMetaUpgrades();
    };

    // Game Over Exit Buttons
    const exitGameOver = () => {
      this.dom.hide(this.dom.gameoverModal);
      this.game.reset();
      this.game.state = 'start';
      this.dom.show(this.dom.startScreen);
      this.updateMainMenuSouls();
    };

    this.dom.gameoverExitBtn.onclick = exitGameOver;
    this.dom.closeGameoverX.onclick = exitGameOver;

    this.dom.resetMetaBtn.onclick = () => {
      this.showResetConfirmation();
    };

    this.dom.confirmResetBtn.onclick = () => {
      this.dom.hide(this.dom.resetConfirmModal);
      this.performMetaReset();
    };

    this.dom.cancelResetBtn.onclick = () => {
      this.dom.hide(this.dom.resetConfirmModal);
    };

    this.dom.closeMetaBtn.onclick = () => {
      this.dom.hide(this.dom.metaModal);
      this.updateMainMenuSouls(); // Update count on close

      // Return to appropriate screen
      if (this.game.state === 'gameover') {
        this.dom.show(this.dom.gameoverModal);
      } else if (this.game.state === 'start') {
        this.dom.show(this.dom.startScreen);
      }
    };

    // Pause screen buttons
    this.dom.resumeBtn.onclick = () => {
      this.resumeGame();
    };

    this.dom.restartPauseBtn.onclick = () => {
      this.dom.hide(this.dom.pauseModal);

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

        this.dom.show(this.dom.customModal);
      } else {
        this.game.reset();
        this.game.start();
      }
    };

    this.dom.exitPauseBtn.onclick = () => {
      this.dom.hide(this.dom.pauseModal);
      this.game.reset();
      this.game.state = 'start';
      this.dom.show(this.dom.startScreen);
      this.updateMainMenuSouls(); // Update when returning to menu
    };

    // Keyboard Navigation (Escape to close overlays)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {

        // 1. Reset Confirmation (Highest Priority)
        if (this.dom.resetConfirmModal && !this.dom.resetConfirmModal.classList.contains('hidden')) {
          this.dom.hide(this.dom.resetConfirmModal);
          return;
        }

        // 2. Permanent Upgrades (Meta)
        if (this.dom.metaModal && !this.dom.metaModal.classList.contains('hidden')) {
          this.dom.hide(this.dom.metaModal);
          this.updateMainMenuSouls();

          if (this.game.state === 'gameover') {
            this.dom.show(this.dom.gameoverModal);
          } else if (this.game.state === 'start') {
            this.dom.show(this.dom.startScreen);
          }
          return;
        }

        // 3. Custom Game Config
        if (this.dom.customModal && !this.dom.customModal.classList.contains('hidden')) {
          this.dom.hide(this.dom.customModal);
          this.dom.show(this.dom.startScreen);
          return;
        }

        // 4. Guide Modal
        if (this.dom.guideModal && !this.dom.guideModal.classList.contains('hidden')) {
          this.dom.hide(this.dom.guideModal);
          if (this.game.state === 'start') {
            this.dom.show(this.dom.startScreen);
          }
          return;
        }

        // 5. Game Over Screen -> Main Menu
        if (this.dom.gameoverModal && !this.dom.gameoverModal.classList.contains('hidden')) {
          // Reuse the exit logic
          this.dom.hide(this.dom.gameoverModal);
          this.game.reset();
          this.game.state = 'start';
          this.dom.show(this.dom.startScreen);
          this.updateMainMenuSouls();
          return;
        }
      }
    });
  }

  // Delegate to imported functions
  updateHUD() {
    updateHUD(this.game, this.dom);
  }

  showLevelUpScreen() {
    showLevelUpScreen(this.game, this.dom);


  }

  showGameOverStats(souls, isVictory = false) {
    showGameOverStats(this.game, this.dom, souls, isVictory);
  }

  showResetConfirmation() {
    showResetConfirmation(this.game, this.dom);
  }

  performMetaReset() {
    performMetaReset(this.game, this.dom);
  }

  showMetaUpgrades() {
    showMetaUpgrades(this.game, this.dom);
  }

  showPauseScreen() {
    // Hide status message immediately to prevent overlap
    if (this.dom.statusMessage) {
      this.dom.statusMessage.style.transition = 'none';
      this.dom.statusMessage.style.opacity = '0';
    }
    if (this.statusMessageTimer) {
      clearTimeout(this.statusMessageTimer);
      this.statusMessageTimer = null;
    }
    showPauseScreen(this.game, this.dom);
  }

  resumeGame() {
    resumeGame(this.game, this.dom);
  }

  showGuide() {
    showGuide(this.dom);
  }

  showHint(message, duration = 3000) {
    if (this.game.weather) {
      this.game.weather.showWarning(message, duration);
    }
  }

  showStatusMessage(message, duration = 2000) {
    const el = this.dom.statusMessage;
    if (el) {
      el.style.transition = 'opacity 0.5s';
      el.textContent = message;
      el.style.opacity = '1';

      // Clear existing timer if any
      if (this.statusMessageTimer) clearTimeout(this.statusMessageTimer);

      this.statusMessageTimer = setTimeout(() => {
        el.style.opacity = '0';
      }, duration);
    }
  }


  showFrozenMessage(show) {
    if (this.dom.frozenMessage) {
      if (show) this.dom.show(this.dom.frozenMessage);
      else this.dom.hide(this.dom.frozenMessage);
    }
  }

  setupMainParallax() {
    // List of modals in priority order (Foreground -> Background)
    // The system will only apply parallax to the FIRST visible modal found.
    const parallaxTargets = [
      'reset-confirm-modal', // Topmost
      'guide-modal',
      'meta-modal',
      'gameover-modal',
      'pause-modal',
      'custom-modal',
      'start-screen'          // Bottom (Main Menu)
    ];

    // Cache elements
    const modals = {};
    parallaxTargets.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const content = el.querySelector('.modal-content');
        if (content) {
          // Init styles
          content.style.transformStyle = 'preserve-3d';
          content.style.transition = 'transform 0.1s ease-out';
          modals[id] = { el, content };
        }
      }
    });

    let rafId = null;

    document.addEventListener('mousemove', (e) => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        // Find the active modal (highest priority visible)
        let activeTarget = null;
        for (const id of parallaxTargets) {
          const m = modals[id];
          if (m && m.el && !m.el.classList.contains('hidden')) {
            activeTarget = m;
            break; // Stop at the first visible one
          }
        }

        if (activeTarget) {
          const { clientX, clientY } = e;
          const { innerWidth, innerHeight } = window;

          // Normalized position (-1 to 1)
          const cx = innerWidth / 2;
          const cy = innerHeight / 2;
          const nx = (clientX - cx) / cx;
          const ny = (clientY - cy) / cy;

          const maxTilt = 5;
          const rx = -ny * maxTilt;
          const ry = nx * maxTilt;

          activeTarget.content.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        }

        rafId = null;
      });
    });
  }
}
