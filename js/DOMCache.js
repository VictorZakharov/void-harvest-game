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
        this.gameoverExitBtn = document.getElementById('gameover-exit-btn');
        this.closeGameoverX = document.getElementById('close-gameover-x');
        this.restartBtn = document.getElementById('restart-btn');
        this.upgradesBtn = document.getElementById('upgrades-btn');
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
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
        this.xpBar = document.getElementById('xp-bar');
        this.levelText = document.getElementById('level-text');
        this.waveVal = document.getElementById('wave-val');
        this.waveIcons = document.getElementById('wave-icons');
        this.timeVal = document.getElementById('time-val');
        this.killsVal = document.getElementById('kills-val');
        this.currencyText = document.getElementById('currency-text');
        this.statusEffects = document.getElementById('status-effects');
        this.activeSkills = document.getElementById('active-skills');
        this.weatherWarning = document.getElementById('weather-warning');
        this.frozenMessage = document.getElementById('frozen-message');

        // Pause Stats
        this.pauseStats = document.getElementById('pause-stats');

        // Main Menu Souls Display
        this.mainSoulsDisplay = document.getElementById('main-souls-display');
        this.mainSoulsDisplay = document.getElementById('main-souls-display');
        this.mainSoulsDisplay = document.getElementById('main-souls-display');
        this.mainSoulsCount = document.getElementById('main-souls-count');
        this.fpsCounter = document.getElementById('fps-counter');

        // Game Canvas
        this.gameCanvas = document.getElementById('gameCanvas');
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
