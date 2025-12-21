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
     */
    constructor(weatherSystem) {
        this.weatherSystem = weatherSystem;
        this.weatherState = 'none'; // 'none' or 'active'
        this.weatherTimer = 0;
        this.nextWeatherTimer = Math.random() * (WEATHER_INTERVAL_MAX - WEATHER_INTERVAL_MIN) + WEATHER_INTERVAL_MIN;
    }

    /**
     * Updates weather timers and state.
     * @param {Object} player - The player entity (to apply slow effects).
     * @param {Object} currentBiome - Data for the current biome.
     * @param {number} defaultFogDensity - Global default fog density.
     * @returns {number|null} New fog density if weather state changed, otherwise null.
     */
    update(player, currentBiome, defaultFogDensity) {
        if (!currentBiome || currentBiome.weather === WEATHER_TYPES.NONE) return null;

        const warningUI = document.getElementById('weather-warning');
        let newFogDensity = null;

        if (this.weatherState === 'none') {
            this.nextWeatherTimer--;

            if (this.nextWeatherTimer <= WEATHER_WARNING_TIME) {
                if (warningUI) {
                    warningUI.classList.remove('hidden');
                    warningUI.textContent = `WARNING: ${currentBiome.weather.toUpperCase()} APPROACHING`;
                }
            } else {
                if (warningUI) warningUI.classList.add('hidden');
            }

            if (this.nextWeatherTimer <= 0) {
                this.triggerWeather(currentBiome);
                newFogDensity = currentBiome.weatherFogDensity || defaultFogDensity * 3;
            }
        } else if (this.weatherState === 'active') {
            if (warningUI) warningUI.classList.add('hidden');

            this.weatherTimer--;

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
}
