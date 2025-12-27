import {
    WEATHER_DURATION, WEATHER_WARNING_TIME, WEATHER_FADE_TIME,
    WEATHER_INTERVAL_MIN, WEATHER_INTERVAL_MAX, WEATHER_SLOW_AMOUNT
} from './constants.js';
import { WEATHER_TYPES } from './biomes.js';

/**
 * Manages weather state, transitions, and timers.
 * Coordinates with the WeatherSystem for visual effects.
 */
export class WeatherManager {
    /**
     * @param {WeatherSystem} weatherSystem - The component that handles visual weather effects (particles, etc).
     * @param {Object} dom - The DOMCache instance for UI element access.
     */
    constructor(weatherSystem, dom) {
        this.weatherSystem = weatherSystem;
        this.dom = dom;
        this.weatherState = 'none'; // 'none' or 'active'
        this.weatherTimer = 0;
        this.nextWeatherTimer = Math.random() * (WEATHER_INTERVAL_MAX - WEATHER_INTERVAL_MIN) + WEATHER_INTERVAL_MIN;

        // Custom warning state
        this.customWarningText = null;
        this.warningTimer = 0;
    }

    /**
     * Updates weather timers and state.
     * @param {Object} player - The player entity (to apply slow effects).
     * @param {Object} currentBiome - Data for the current biome.
     * @param {number} defaultFogDensity - Global default fog density.
     * @param {number} timeScale - Time delta factor (1.0 = 60fps).
     * @returns {number|null} New fog density if weather state changed, otherwise null.
     */
    update(player, currentBiome, defaultFogDensity, timeScale = 1.0) {
        if (!currentBiome || currentBiome.weather === WEATHER_TYPES.NONE) return null;

        // Custom Warning Timer
        if (this.warningTimer > 0) {
            this.warningTimer -= (timeScale * 16.666); // Convert frame-scale to ms approx
            if (this.dom.weatherWarning) {
                this.dom.show(this.dom.weatherWarning);
                this.dom.setText(this.dom.weatherWarning, this.customWarningText);
            }
        }

        let newFogDensity = null;
        let showWeatherWarn = false;

        if (this.weatherState === 'none') {
            this.nextWeatherTimer -= timeScale;

            if (this.nextWeatherTimer <= WEATHER_WARNING_TIME) {
                showWeatherWarn = true;
            }

            if (this.nextWeatherTimer <= 0) {
                this.triggerWeather(currentBiome);
                newFogDensity = currentBiome.weatherFogDensity || defaultFogDensity * 3;
            }
        } else if (this.weatherState === 'active') {
            this.weatherTimer -= timeScale;

            let fadeFactor = 1.0;
            const timeElapsed = WEATHER_DURATION - this.weatherTimer;
            const timeRemaining = this.weatherTimer;

            if (timeElapsed < WEATHER_FADE_TIME) {
                fadeFactor = timeElapsed / WEATHER_FADE_TIME;
            } else if (timeRemaining < WEATHER_FADE_TIME) {
                fadeFactor = timeRemaining / WEATHER_FADE_TIME;
            }

            if (player && this.weatherSystem) {
                this.weatherSystem.update(player.x, player.y, fadeFactor);
            }

            if (player) {
                player.slowEffects.push({
                    amount: WEATHER_SLOW_AMOUNT * fadeFactor,
                    timer: 1
                });
            }

            if (this.weatherTimer <= 0) {
                this.endWeather(currentBiome);
                newFogDensity = currentBiome.fogDensity || defaultFogDensity;
            }
        }

        // Draw Priority: Custom Warning > Weather Warning > Hide
        if (this.warningTimer <= 0) {
            if (showWeatherWarn && this.weatherState === 'none') {
                if (this.dom.weatherWarning) {
                    this.dom.show(this.dom.weatherWarning);
                    this.dom.setText(this.dom.weatherWarning, `WARNING: ${currentBiome.weather.toUpperCase()} APPROACHING`);
                }
            } else {
                if (this.dom.weatherWarning) this.dom.hide(this.dom.weatherWarning);
            }
        }

        return newFogDensity;
    }

    /**
     * Starts a weather event.
     * @param {Object} currentBiome - The biome data containing weather type.
     */
    triggerWeather(currentBiome) {
        this.weatherState = 'active';
        this.weatherTimer = WEATHER_DURATION;
        if (this.weatherSystem) {
            this.weatherSystem.startWeather(currentBiome.weather);
        }
    }

    /**
     * Ends a weather event and sets timer for the next one.
     * @param {Object} currentBiome - The biome data.
     */
    endWeather(currentBiome) {
        this.weatherState = 'none';
        this.nextWeatherTimer = Math.random() * (WEATHER_INTERVAL_MAX - WEATHER_INTERVAL_MIN) + WEATHER_INTERVAL_MIN;
        if (this.weatherSystem) {
            this.weatherSystem.stopWeather();
        }
    }

    /**
     * Shows a generic warning or hint in the weather warning box.
     * @param {string} text - The text to display.
     * @param {number} duration - Duration in milliseconds.
     */
    showWarning(text, duration = 3000) {
        this.customWarningText = text;
        this.warningTimer = duration;
        // Immediate update to ensure responsiveness
        if (this.dom.weatherWarning) {
            this.dom.show(this.dom.weatherWarning);
            this.dom.setText(this.dom.weatherWarning, text);
        }
    }
}
