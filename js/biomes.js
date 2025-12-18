export const WEATHER_TYPES = {
    NONE: 'none',
    RAIN: 'rain',
    SNOW: 'snow',
    SANDSTORM: 'sandstorm'
};

export const BIOMES = {
    NEUTRAL: {
        id: 'neutral',
        name: 'Plains',
        groundColor: 0x224422, // Darkish Green
        fogColor: 0x051005,    // Very dark green/black
        weather: WEATHER_TYPES.RAIN,
        weatherParticleColor: 0x88aaaa,
        weatherFogDensity: 0.0015 // Reduced from 0.003
    },
    SNOW: {
        id: 'snow',
        name: 'Tundra',
        groundColor: 0xddddff, // White-ish Blue
        fogColor: 0x8888aa,    // Light grey/blue fog (brighter night)
        weather: WEATHER_TYPES.SNOW,
        weatherParticleColor: 0xffffff,
        weatherFogDensity: 0.0012 // Reduced from 0.0025
    },
    DESERT: {
        id: 'desert',
        name: 'Wasteland',
        groundColor: 0xccaa66, // Sand
        fogColor: 0x886644,    // Brightened orange/brown for better visibility in thick fog
        weather: WEATHER_TYPES.SANDSTORM,
        weatherParticleColor: 0xddbb88,
        weatherFogDensity: 0.0025 // Balanced for 1000-unit camera distance
    }
};

export const DEFAULT_FOG_DENSITY = 0; // Pure clarity by default
