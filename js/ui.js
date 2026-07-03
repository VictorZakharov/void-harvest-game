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
    this.setupSpeedControls();
    this.setupMainParallax();
    this.updateMainMenuSouls();

    // Multiplayer Queue
    this.levelUpQueue = [];
    this.isLevelUpActive = false;
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
      this.game.customMaxEnemies = null;
      this.game.isMultiplayer = false; // Reset to single player
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

    if (this.dom.multiplayerBtn) {
      this.dom.multiplayerBtn.onclick = () => {
        this.dom.hide(this.dom.startScreen);
        this.dom.show(this.dom.lobbyModal);
      };
    }

    if (this.dom.startCoopBtn) {
      this.dom.startCoopBtn.onclick = () => {
        this.dom.hide(this.dom.lobbyModal);
        this.game.debugWeather = false;
        // Clear custom stuffs
        this.game.customEnemies = null;
        this.game.customSkills = null;
        this.game.customBiome = null;
        this.game.customSpawnRate = null;
        this.game.customMaxEnemies = null;

        // Enable Multiplayer Flag
        this.game.isMultiplayer = true;

        // Custom Colors
        const p1Color = document.getElementById('p1-color').value;
        const p2Color = document.getElementById('p2-color').value;
        this.game.playerColors = [p1Color, p2Color];

        this.game.start();
      };
    }

    if (this.dom.closeLobbyModal) {
      this.dom.closeLobbyModal.onclick = () => {
        this.dom.hide(this.dom.lobbyModal);
        this.dom.show(this.dom.startScreen);
      };
    }

    this.dom.startCustomBtn.onclick = () => {
      this.dom.hide(this.dom.customModal);
      this.game.customEnemies = { ...this.customEnemies };
      this.game.customSkills = { ...this.customSkills }; // Pass selected skills
      this.game.customBiome = this.customBiome.value; // Pass selected biome
      this.game.debugWeather = this.dom.debugWeatherCheck.checked;

      // New Game Mode Flags
      const is2P = document.getElementById('custom-2p-check').checked;
      const friendlyFire = document.getElementById('custom-friendly-fire-check').checked;

      this.game.isMultiplayer = is2P;
      this.game.friendlyFire = is2P && friendlyFire;

      const rateVal = parseFloat(this.dom.customSpawnRateInput.value);
      this.game.customSpawnRate = isNaN(rateVal) ? null : rateVal;

      const maxVal = parseInt(this.dom.customMaxEnemiesInput.value);
      this.game.customMaxEnemies = isNaN(maxVal) ? null : maxVal;

      this.game.start();
    };

    // Toggle Friendly Fire based on 2P check
    const p2Check = document.getElementById('custom-2p-check');
    const ffCheck = document.getElementById('custom-friendly-fire-check');
    if (p2Check && ffCheck) {
      p2Check.onchange = () => {
        ffCheck.disabled = !p2Check.checked;
        if (!p2Check.checked) ffCheck.checked = false;
      };
    }

    // Close Button (X)
    if (this.dom.closeCustomModal) {
      this.dom.closeCustomModal.onclick = () => {
        this.dom.hide(this.dom.customModal);
        this.dom.show(this.dom.startScreen); // Return to start
      };
    }

    // Custom Game Speed Buttons are handled globally by setupSpeedControls()

    // Game Over Exit Buttons
    const exitGameOver = () => {
      this.dom.hide(this.dom.gameoverModal);
      this.game.reset();
      this.game.state = 'start';
      this.dom.show(this.dom.startScreen);
      this.updateMainMenuSouls();
    };

    if (this.dom.closeGameoverX) {
      this.dom.closeGameoverX.onclick = exitGameOver;
    }

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

        // 5. Lobby Modal
        if (this.dom.lobbyModal && !this.dom.lobbyModal.classList.contains('hidden')) {
          this.dom.hide(this.dom.lobbyModal);
          this.dom.show(this.dom.startScreen);
          return;
        }

        // 6. Game Over Screen -> Main Menu
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

  showLevelUpScreen(player) {
    if (!player) player = this.game.players ? this.game.players[0] : this.game.player;

    if (this.isLevelUpActive) {
      this.levelUpQueue.push(player);
      return;
    }

    this.isLevelUpActive = true;

    // Play the invigoration animation (freeze + heal-to-full sweep) first,
    // then present the skill choices.
    const beginFor = (p) => {
      if (this.game.levelUpEffect) {
        this.game.levelUpEffect.play(p, () => showLevelUpScreen(this.game, this.dom, p, onComplete));
      } else {
        showLevelUpScreen(this.game, this.dom, p, onComplete);
      }
    };

    const onComplete = () => {
      if (this.levelUpQueue.length > 0) {
        const nextPlayer = this.levelUpQueue.shift();
        // Small delay to prevent instant flash or allow UI update
        setTimeout(() => {
          beginFor(nextPlayer);
        }, 100);
      } else {
        this.isLevelUpActive = false;
        this.dom.hide(this.dom.levelupModal);

        // Resume ONLY if not paused by ESC
        if (this.game.state === 'paused' && this.dom.pauseModal.classList.contains('hidden')) {
          if (this.game.gameInputSystem) this.game.gameInputSystem.setFrozen(false);
          this.game.state = 'playing';
        }
      }
    };

    beginFor(player);
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

  hidePauseScreen() {
    this.dom.hide(this.dom.pauseModal);
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
      'lobby-modal',
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
