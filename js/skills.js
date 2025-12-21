// ==================== ICON SYSTEM ====================
import { MAX_SKILL_LEVEL, EXTRA_CHOICE_MAX_LEVEL, POLAR_VORTEX_RADIUS, POLAR_VORTEX_SLOW_BASE } from './constants.js';

export const ICONS = {
    damage: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="rotate(45 12 12)"><rect x="8" y="2" width="8" height="6" rx="1"/><rect x="11" y="8" width="2" height="14" rx="0.5"/></g></svg>',
    firerate: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6" cy="10" rx="3" ry="1.5"/><ellipse cx="12" cy="12" rx="3" ry="1.5"/><ellipse cx="18" cy="14" rx="3" ry="1.5"/></svg>',
    speed: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(12, 12) scale(0.8) translate(-12, -12)"><path d="M13.5 5.5C14.59 5.5 15.5 4.58 15.5 3.5C15.5 2.38 14.59 1.5 13.5 1.5C12.39 1.5 11.5 2.38 11.5 3.5C11.5 4.58 12.39 5.5 13.5 5.5M9.89 19.38L10.89 15L13 17V23H15V15.5L12.89 13.5L13.5 10.5C14.79 12 16.79 13 19 13V11C17.09 11 15.5 10 14.69 8.58L13.69 7C13.29 6.38 12.69 6 12 6C11.69 6 11.5 6.08 11.19 6.08L6 8.28V13H8V9.58L9.79 8.88L8.19 17L3.29 16L2.89 18L9.89 19.38Z"/></g></svg>',
    health: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(12, 12) scale(0.8) translate(-12, -12)"><path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z"/></g></svg>',
    multishot: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="10" cy="6" rx="2.5" ry="3"/><ellipse cx="16" cy="12" rx="2.5" ry="3"/><ellipse cx="10" cy="18" rx="2.5" ry="3"/></svg>',
    piercing: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 13L9 6L16 13L9 20L2 13M9 9L5 13L9 17L13 13L9 9Z"/><path d="M14 9L18 5L22 9L18 13L14 9Z"/></svg>',
    bulletspeed: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="18" cy="12" r="4"/><path d="M14 12L2 8L6 12L2 16L14 12Z"/></svg>',
    range: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(12, 12) scale(0.8) translate(-12, -12)"><path d="M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22 2 17.5 2 12 6.5 2 12 2M12 4C7.58 4 4 7.58 4 12S7.58 20 12 20 20 16.42 20 12 16.42 4 12 4M12 7C14.76 7 17 9.24 17 12S14.76 17 12 17 7 14.76 7 12 9.24 7 12 7M12 9C10.34 9 9 10.34 9 12S10.34 15 12 15 15 13.66 15 12 13.66 9 12 9Z"/></g></svg>',
    xp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.62L12 2L9.19 8.62L2 9.24L7.45 13.97L5.82 21L12 17.27Z"/></svg>',
    freeze: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(12, 12) scale(0.8) translate(-12, -12)"><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2"/></g></svg>',
    regen: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(12, 12) scale(0.8) translate(-12, -12)"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2M11 17L11 13L7 13L7 11L11 11L11 7L13 7L13 11L17 11L17 13L13 13L13 17L11 17Z"/></g></svg>',

    extrachoice: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="6" height="6" rx="1"/><rect x="5" y="13" width="6" height="6" rx="1"/><rect x="13" y="5" width="6" height="6" rx="1"/><rect x="13" y="13" width="6" height="6" rx="1"/></svg>',

    armor: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(12, 12) scale(0.8) translate(-12, -12)"><path d="M12 2L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 2M12 4.18L19 6.3V11.22C19 15.54 16.25 19.5 12 20.5C7.75 19.5 5 15.54 5 11.22V6.3L12 4.18Z"/></g></svg>',
    magnet: '<svg viewBox="0 0 70 70" fill="currentColor"><g transform="translate(35, 35) scale(0.8) translate(-35, -35)"><path d="M28.034,67.583c0,0-0.001,0-0.002,0c-6.566,0-12.757-2.835-17.432-7.509l-0.263-0.392c-9.815-9.814-9.815-25.845-0.003-35.655l15.58-15.613c0.375-0.375,0.884-0.602,1.414-0.602l0,0c0.53,0,1.039,0.203,1.414,0.578l11.473,11.47c0.781,0.781,0.781,2.045,0,2.827L26.899,36.001c-0.887,0.887-1.362,2.095-1.339,3.405c0.022,1.303,0.556,2.57,1.462,3.477c0.93,0.93,2.229,1.462,3.563,1.462c1.276,0,2.455-0.476,3.319-1.339l13.315-13.317c0.75-0.75,2.078-0.75,2.828,0l11.474,11.474c0.375,0.375,0.586,0.884,0.586,1.414s-0.211,1.039-0.586,1.414l-15.58,15.838C41.109,64.662,34.749,67.583,28.034,67.583z M27.329,12.624L13.163,26.79c-8.252,8.253-8.252,21.68,0,29.933l0.263,0.262c3.922,3.921,9.108,6.079,14.607,6.08h0.001c5.647,0,11.002-2.245,15.08-6.323L57.28,42.576l-8.646-8.646L36.733,45.834c-1.619,1.619-3.803,2.511-6.147,2.511c-2.389,0.001-4.719-0.96-6.392-2.634c-1.657-1.656-2.593-3.87-2.634-6.234c-0.042-2.406,0.85-4.645,2.511-6.305L35.974,21.27L27.329,12.624z"/><path d="M15.331,55.977c-0.255,0-0.511-0.097-0.705-0.291l-0.209-0.208c-3.644-3.644-5.649-8.485-5.649-13.635s2.006-9.991,5.647-13.632l5.113-5.114c0.391-0.391,1.023-0.391,1.414,0s0.391,1.023,0,1.414l-5.113,5.114c-3.264,3.264-5.062,7.603-5.062,12.218s1.798,8.955,5.062,12.219l0.207,0.206c0.392,0.39,0.394,1.023,0.004,1.414C15.845,55.878,15.588,55.977,15.331,55.977z"/><path d="M25.111,19.929c-0.256,0-0.512-0.098-0.707-0.293c-0.391-0.391-0.391-1.023,0-1.414l2.304-2.305c0.391-0.391,1.023-0.391,1.414,0s0.391,1.023,0,1.414l-2.304,2.305C25.623,19.831,25.367,19.929,25.111,19.929z"/><path d="M43.718,18.353c-0.512,0-1.023-0.195-1.414-0.586L30.831,6.294c-0.781-0.781-0.781-2.047,0-2.828s2.047-0.781,2.828,0l11.473,11.473c0.781,0.781,0.781,2.047,0,2.828C44.741,18.157,44.229,18.353,43.718,18.353z"/><path d="M65.024,39.659c-0.512,0-1.023-0.195-1.414-0.586L52.138,27.601c-0.781-0.781-0.781-2.047,0-2.828s2.047-0.781,2.828,0l11.473,11.473c0.781,0.781,0.781,2.047,0,2.828C66.048,39.464,65.536,39.659,65.024,39.659z"/></g></svg>',
    luck: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9 2 6 4 6 6L8 10L12 8L16 10L18 6C18 4 15 2 12 2Z"/><line x1="8" y1="10" x2="9" y2="14" stroke="currentColor" stroke-width="1"/><line x1="12" y1="8" x2="12" y2="14" stroke="currentColor" stroke-width="1"/><line x1="16" y1="10" x2="15" y2="14" stroke="currentColor" stroke-width="1"/><rect x="9" y="14" width="6" height="6" rx="1"/><path d="M11 16H13V18H11V16M11 18H13V20H11V18" fill="white"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" stroke-width="2"/><line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" stroke-width="2"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="4" y2="12" stroke="currentColor" stroke-width="2"/><line x1="20" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" stroke-width="2"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>',
    shockwave: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/></svg>',
    stasis: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6L16,12L12,18V6Z"/></svg>',
};

// ==================== SKILLS SYSTEM ====================
export const SKILLS = [
    {
        id: 'damage',
        name: 'Increased Damage',
        baseValue: 20,
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'offensive',
        icon: ICONS.damage,
        apply: (player) => {
            // Compounding damage (Multiplicative) is REQUIRED to keep up with enemy scaling.
            // Enemies scale to ~5x HP by Wave 30.
            // Compounding (1.2^10 = 6.2x) keeps pace.
            // Additive (1 + 0.2*10 = 3.0x) would fall behind drastically in late game.
            player.damage *= 1.2;
            player.skills.damage = (player.skills.damage || 0) + 1;
        }
    },
    {
        id: 'firerate',
        name: 'Rapid Fire',
        baseValue: 15,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'offensive',
        icon: ICONS.firerate,
        apply: (player) => {
            player.fireRate = Math.max(1, Math.floor(player.fireRate * 0.85));
            player.skills.firerate = (player.skills.firerate || 0) + 1;
        }
    },
    {
        id: 'speed',
        name: 'Movement Speed',
        baseValue: 8,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.speed,
        apply: (player) => {
            player.speed *= 1.08;
            player.skills.speed = (player.skills.speed || 0) + 1;
        }
    },
    {
        id: 'health',
        name: 'Max Health',
        baseValue: 30,
        unit: 'HP',
        unit: 'HP',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'defensive',
        icon: ICONS.health,
        apply: (player) => {
            player.maxHealth += 30;
            player.health += 30;
            player.skills.health = (player.skills.health || 0) + 1;
        }
    },
    {
        id: 'multishot',
        name: 'Multi-Shot',
        baseValue: 1,
        unit: 'projectile',
        unit: 'projectile',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'offensive',
        icon: ICONS.multishot,
        apply: (player) => {
            player.projectileCount++;
            player.skills.multishot = (player.skills.multishot || 0) + 1;
        }
    },
    {
        id: 'piercing',
        name: 'Piercing Shots',
        baseValue: 1,
        unit: 'pierce',
        unit: 'pierce',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'offensive',
        icon: ICONS.piercing,
        apply: (player) => {
            player.piercing++;
            player.skills.piercing = (player.skills.piercing || 0) + 1;
        }
    },
    {
        id: 'bulletspeed',
        name: 'Bullet Velocity',
        baseValue: 25,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'offensive',
        icon: ICONS.bulletspeed,
        apply: (player) => {
            player.bulletSpeed *= 1.25;
            player.skills.bulletspeed = (player.skills.bulletspeed || 0) + 1;
        }
    },
    {
        id: 'range',
        name: 'Extended Range',
        baseValue: 50,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'offensive',
        icon: ICONS.range,
        apply: (player) => {
            player.range *= 1.5;
            player.skills.range = (player.skills.range || 0) + 1;
        }
    },
    {
        id: 'regen',
        name: 'Passive Heal',
        baseValue: 1,
        unit: 'HP/sec',
        unit: 'HP/sec',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'defensive',
        icon: ICONS.regen,
        apply: (player) => {
            player.healthRegen += 1;
            player.skills.regen = (player.skills.regen || 0) + 1;
        }
    },
    {
        id: 'freeze',
        name: 'Freeze Chance',
        baseValue: 10,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.freeze,
        apply: (player) => {
            player.freezeChance += 0.1; // 10% per level
            player.skills.freeze = (player.skills.freeze || 0) + 1;
        }
    },
    {
        id: 'extrachoice',
        name: 'Extra Choice',
        baseValue: 1,
        unit: 'slot',
        unit: 'slot',
        maxLevel: EXTRA_CHOICE_MAX_LEVEL,
        category: 'survival',
        icon: ICONS.extrachoice,
        apply: (player) => {
            player.extraChoice = true;
            player.skills.extrachoice = 1;
        }
    },
    {
        id: 'armor',
        name: 'Armor',
        baseValue: 1,
        unit: 'armor',
        unit: 'armor',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'defensive',
        icon: ICONS.armor,
        apply: (player) => {
            player.armor = (player.armor || 0) + 1;
            player.skills.armor = (player.skills.armor || 0) + 1;
        }
    },
    {
        id: 'magnet',
        name: 'Magnet Range',
        baseValue: 50,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.magnet,
        apply: (player) => {
            player.magnetBonus = (player.magnetBonus || 0) + 0.5; // +50% magnet range per level
            player.skills.magnet = (player.skills.magnet || 0) + 1;
        }
    },
    {
        id: 'luck',
        name: 'Lucky Drops',
        baseValue: 2,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.luck,
        apply: (player) => {
            player.dropBonus = (player.dropBonus || 0) + 0.05; // +5% drop rate per level
            player.skills.luck = (player.skills.luck || 0) + 1;
        }
    },
    {
        id: 'light',
        name: 'Light Radius',
        baseValue: 50,
        unit: '%',
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.light,
        apply: (player) => {
            player.lightRadiusBonus = (player.lightRadiusBonus || 0) + 0.5; // +50% range per level
            player.skills.light = (player.skills.light || 0) + 1;
            // Immediate update for player-owned lights
            if (player.updateLights) player.updateLights();
        }
    },
    {
        id: "stasis",
        name: "Polar Vortex",
        description: `A freezing storm surrounds you, slowing nearby enemies within ${POLAR_VORTEX_RADIUS} units.`,
        icon: "❄️",
        tier: 1,
        maxLevel: 3,
        stat: "Slow",
        rarity: "Rare",
        baseValue: 15,
        unit: "%",
        color: "#00ffff",
        type: "Defensive",
        category: 'defensive',
        apply: (player) => {
            player.skills.stasis = (player.skills.stasis || 0) + 1;
            player.stasisSlow = (player.skills.stasis * POLAR_VORTEX_SLOW_BASE) + POLAR_VORTEX_SLOW_BASE;
            player.stasisUnlocked = true;
        }
    },
    {
        id: 'shield',
        name: 'Energy Shield',
        description: 'Blocks 1 hit of damage. Recharges every 10s.',
        baseValue: 1,
        unit: 'Block',
        maxLevel: 1,
        category: 'defensive',
        icon: ICONS.shield,
        apply: (player) => {
            player.shieldUnlocked = true;
            player.skills.shield = 1;
        }
    },
    {
        id: 'shockwave',
        name: 'Shockwave',
        description: 'Pushes nearby enemies away every 3s.',
        baseValue: 10,
        unit: 'Force',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'defensive',
        icon: ICONS.shockwave,
        apply: (player) => {
            player.shockwaveForce = (player.shockwaveForce || 0) + 10;
            player.skills.shockwave = (player.skills.shockwave || 0) + 1;
            player.shockwaveUnlocked = true;
        }
    }
];

// ==================== META PROGRESSION ====================
export const META_UPGRADES = [
    {
        id: 'start_damage',
        name: 'Base Damage I',
        description: 'Start with +10% damage',
        cost: 10,
        maxLevel: 5,
        icon: ICONS.damage,
        apply: (player, level) => { player.damage *= (1 + 0.1 * level); }
    },
    {
        id: 'start_health',
        name: 'Base Health I',
        description: 'Start with +10 max HP',
        cost: 15,
        maxLevel: 5,
        icon: ICONS.health,
        apply: (player, level) => {
            player.maxHealth += 10 * level;
            player.health = player.maxHealth;
        }
    },
    {
        id: 'start_speed',
        name: 'Base Speed I',
        description: 'Start with +5% speed',
        cost: 20,
        maxLevel: 3,
        icon: ICONS.speed,
        apply: (player, level) => { player.speed *= (1 + 0.05 * level); }
    },
    {
        id: 'xp_gain',
        name: 'XP Boost',
        description: 'Gain +20% more XP',
        cost: 20,
        maxLevel: 3,
        icon: ICONS.xp,
        apply: () => { } // Applied when gaining XP
    }
];
