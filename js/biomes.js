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
        weatherFogDensity: 0.001 // ~50% visibility at 800-1500 height
    },
    SNOW: {
        id: 'snow',
        name: 'Tundra',
        groundColor: 0xddddff, // White-ish Blue
        fogColor: 0x8888aa,    // Light grey/blue fog (brighter night)
        weather: WEATHER_TYPES.SNOW,
        weatherParticleColor: 0xffffff,
        weatherFogDensity: 0.001 // ~50% visibility
    },
    DESERT: {
        id: 'desert',
        name: 'Wasteland',
        groundColor: 0xccaa66, // Sand
        fogColor: 0x886644,    // Brightened orange/brown for better visibility in thick fog
        weather: WEATHER_TYPES.SANDSTORM,
        weatherParticleColor: 0xddbb88,
        weatherFogDensity: 0.0012 // Slightly denser for sandstorm
    },
};

export const DEFAULT_FOG_DENSITY = 0.00015; // ~97% visibility (slight atmosphere)
