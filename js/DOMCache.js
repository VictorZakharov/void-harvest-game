/**
 * Centralized DOM element cache to avoid repeated getElementById calls.
 * All UI elements are queried once during initialization and cached for reuse.
 */
export class DOMCache {
    constructor() {
        // Modals & Screens
        this.startScreen = document.getElementById('start-screen');
        this.pauseModal = document.getElementById('pause-modal');
        this.levelupModal = document.getElementById('levelup-modal');
        this.gameoverModal = document.getElementById('gameover-modal');
        this.metaModal = document.getElementById('meta-modal');
        this.resetConfirmModal = document.getElementById('reset-confirm-modal');
        this.guideModal = document.getElementById('guide-modal');
        this.customModal = document.getElementById('custom-modal');
        this.uiOverlay = document.getElementById('ui-overlay');

        // Main Menu Buttons
        this.startBtn = document.getElementById('start-btn');
        this.metaBtn = document.getElementById('meta-btn');
        this.guideBtn = document.getElementById('guide-btn');
        this.customBtn = document.getElementById('custom-btn');

        // Pause Modal Buttons
        this.resumeBtn = document.getElementById('resume-btn');
        this.restartPauseBtn = document.getElementById('restart-pause-btn');
        this.exitPauseBtn = document.getElementById('exit-pause-btn');

        // Game Over Modal
        this.closeGameoverX = document.getElementById('close-gameover-x');
        this.finalStats = document.getElementById('final-stats');

        // Level Up Modal
        this.skillChoices = document.getElementById('skill-choices');
        this.rerollBtn = document.getElementById('reroll-btn');

        // Meta Modal
        this.closeMetaBtn = document.getElementById('close-meta-btn');
        this.metaUpgrades = document.getElementById('meta-upgrades');
        this.resetMetaBtn = document.getElementById('reset-meta-btn');
        this.refundAmount = document.getElementById('refund-amount');
        this.soulsBankedText = document.getElementById('souls-banked-text');
        this.soulsRunText = document.getElementById('souls-run-text');

        // Reset Confirmation Modal
        this.confirmResetBtn = document.getElementById('confirm-reset-btn');
        this.cancelResetBtn = document.getElementById('cancel-reset-btn');

        // Guide Modal
        this.closeGuideBtn = document.getElementById('close-guide-btn');
        this.closeGuideX = document.getElementById('close-guide-x');
        this.guideContent = document.getElementById('guide-content');

        // Custom Game Modal
        this.closeCustomModal = document.getElementById('close-custom-modal');
        this.startCustomBtn = document.getElementById('start-custom-btn');
        this.enemyTypeConfig = document.getElementById('enemy-type-config');
        this.enemySelectAll = document.getElementById('enemy-select-all');
        this.customSkillConfig = document.getElementById('custom-skill-config');
        this.customBiomeConfig = document.getElementById('custom-biome-config');
        this.customBiomeConfig = document.getElementById('custom-biome-config');
        this.debugWeatherCheck = document.getElementById('debug-weather-check');
        this.customSpawnRateInput = document.getElementById('custom-spawn-rate');
        this.customMaxEnemiesInput = document.getElementById('custom-max-enemies');

        // HUD Elements
        this.p1Panel = document.getElementById('p1-panel');
        this.p1HealthBar = document.getElementById('p1-health-bar');
        this.p1HealthText = document.getElementById('p1-health-text');
        this.p1XpBar = document.getElementById('p1-xp-bar');
        this.p1LevelText = document.getElementById('p1-level-text');
        this.p1StatusEffects = document.getElementById('p1-status-effects');
        this.p1ActiveSkills = document.getElementById('p1-active-skills');

        this.p2Panel = document.getElementById('p2-panel');
        this.p2HealthBar = document.getElementById('p2-health-bar');
        this.p2HealthText = document.getElementById('p2-health-text');
        this.p2XpBar = document.getElementById('p2-xp-bar');
        this.p2LevelText = document.getElementById('p2-level-text');
        this.p2StatusEffects = document.getElementById('p2-status-effects');
        this.p2ActiveSkills = document.getElementById('p2-active-skills');

        // Game Stats (Central)
        this.waveVal = document.getElementById('wave-val');
        this.waveIcons = document.getElementById('wave-icons');
        this.timeVal = document.getElementById('time-val');
        this.killsVal = document.getElementById('kills-val');
        this.soulsBankedText = document.getElementById('souls-banked-text'); // Fixed ID reference
        this.soulsRunText = document.getElementById('souls-run-text');       // Fixed ID reference

        this.weatherWarning = document.getElementById('weather-warning');
        this.frozenMessage = document.getElementById('frozen-message');

        // Lobby Modal
        this.lobbyModal = document.getElementById('lobby-modal');
        this.startCoopBtn = document.getElementById('start-coop-btn');
        this.closeLobbyModal = document.getElementById('close-lobby-modal');
        this.multiplayerBtn = document.getElementById('multiplayer-btn');

        // Pause Stats
        this.pauseStats = document.getElementById('pause-stats');

        // Main Menu Souls Display
        this.mainSoulsDisplay = document.getElementById('main-souls-display');
        this.mainSoulsDisplay = document.getElementById('main-souls-display');
        this.mainSoulsDisplay = document.getElementById('main-souls-display');
        this.mainSoulsCount = document.getElementById('main-souls-count');
        this.fpsCounter = document.getElementById('fps-counter');

        // Minimap
        this.minimapContainer = document.getElementById('minimap-container');
        this.minimapCanvas = document.getElementById('minimap-canvas');

        // Game Canvas
        this.gameCanvas = document.getElementById('gameCanvas');

        // Dynamic Status Message (Autoshoot, etc)
        this.statusMessage = document.getElementById('status-message');
        if (!this.statusMessage) {
            this.statusMessage = document.createElement('div');
            this.statusMessage.id = 'status-message';
            // Anchored under the player each frame by
            // UIManager.updateStatusMessagePosition(); these are fallbacks.
            Object.assign(this.statusMessage.style, {
                position: 'absolute',
                top: '60%',
                left: '50%',
                transform: 'translate(-50%, 0)',
                color: '#aaaaaa', // Grey as requested
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '16px',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                textShadow: '0 0 5px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                opacity: '0',
                transition: 'opacity 0.5s',
                zIndex: '900' // Below modals (1000+)
            });
            document.body.appendChild(this.statusMessage);
        }

        // Floating GAME OVER banner (SP death sequence). Styled in
        // _gameover.scss; positioned above the player each frame by
        // UIManager.updateGameOverBannerPosition().
        this.gameoverBanner = document.getElementById('gameover-banner');
        if (!this.gameoverBanner) {
            this.gameoverBanner = document.createElement('div');
            this.gameoverBanner.id = 'gameover-banner';
            this.gameoverBanner.textContent = 'Game Over';
            document.body.appendChild(this.gameoverBanner);
        }
    }

    /**
     * Helper method to show an element by removing the 'hidden' class.
     * @param {HTMLElement} element - The element to show.
     */
    show(element) {
        if (element) element.classList.remove('hidden');
    }

    /**
     * Helper method to hide an element by adding the 'hidden' class.
     * @param {HTMLElement} element - The element to hide.
     */
    hide(element) {
        if (element) element.classList.add('hidden');
    }

    /**
     * Helper method to toggle an element's visibility.
     * @param {HTMLElement} element - The element to toggle.
     */
    toggle(element) {
        if (element) element.classList.toggle('hidden');
    }

    /**
     * Helper method to set text content safely.
     * @param {HTMLElement} element - The element to update.
     * @param {string} text - The text to set.
     */
    setText(element, text) {
        if (element) element.textContent = text;
    }

    /**
     * Helper method to set HTML content safely.
     * @param {HTMLElement} element - The element to update.
     * @param {string} html - The HTML to set.
     */
    setHTML(element, html) {
        if (element) element.innerHTML = html;
    }

    /**
     * Helper method to add a CSS class to an element.
     * @param {HTMLElement} element - The element to modify.
     * @param {string} className - The class name to add.
     */
    addClass(element, className) {
        if (element) element.classList.add(className);
    }

    /**
     * Helper method to remove a CSS class from an element.
     * @param {HTMLElement} element - The element to modify.
     * @param {string} className - The class name to remove.
     */
    removeClass(element, className) {
        if (element) element.classList.remove(className);
    }
}
