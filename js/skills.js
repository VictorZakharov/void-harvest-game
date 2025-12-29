import { MAX_SKILL_LEVEL, EXTRA_CHOICE_MAX_LEVEL, POLAR_VORTEX_RADIUS, POLAR_VORTEX_SLOW_BASE, SKILL_FREEZE_CHANCE_PER_LEVEL } from './constants.js';
import { ICONS } from './icons.js';
export { ICONS };

// ==================== SKILLS SYSTEM ====================
export const SKILLS = [
    {
        id: 'damage',
        name: 'Increased Damage',
        description: 'Increases your total damage output by 50% (Additive).',
        baseValue: 50,
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'offensive',
        icon: ICONS.damage,
        apply: (player) => {
            // "50/100/150" logic (Additive 50% per level)
            // Multiplicative equivalent: Current * (NewTotal / OldTotal)
            const currentLvl = player.skills.damage || 0;
            const oldMult = 1 + (0.5 * currentLvl);
            const newMult = 1 + (0.5 * (currentLvl + 1));

            player.damage = (player.damage / oldMult) * newMult;
            player.skills.damage = currentLvl + 1;
        }
    },
    {
        id: 'firerate',
        name: 'Rapid Fire',
        description: 'Decreases the time between shots by 15%.',
        baseValue: 15,
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
        description: 'Increases your movement speed by 8%.',
        baseValue: 8,
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
        description: 'Increase your maximum health by 30 points.',
        baseValue: 30,
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
        description: 'Adds an additional projectile to every shot.',
        baseValue: 1,
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
        description: 'Projectiles pass through one additional enemy.',
        baseValue: 1,
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
        id: 'explosive',
        name: 'Explosive Rounds',
        description: 'Bullets emit an explosion on impact, dealing area damage.',
        baseValue: 10, // For display purposes in UI if needed, though custom logic handles it
        unit: '% Dmg',
        maxLevel: 3,
        category: 'offensive',
        icon: ICONS.explosive,
        apply: (player) => {
            const currentLvl = player.skills.explosive || 0;
            const nextLvl = currentLvl + 1;

            player.skills.explosive = nextLvl;

            // Level 1: 10% dmg, 40px
            // Level 2: 20% dmg, 50px
            // Level 3: 30% dmg, 60px
            if (nextLvl === 1) {
                player.splashDamageRatio = 0.10;
                player.splashRadius = 40;
            } else if (nextLvl === 2) {
                player.splashDamageRatio = 0.20;
                player.splashRadius = 50;
            } else {
                player.splashDamageRatio = 0.30;
                player.splashRadius = 60;
            }
        }
    },
    {
        id: 'range',
        name: 'Extended Range',
        description: 'Increases the maximum distance projectiles travel by 50%.',
        baseValue: 50,
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
        description: 'Restore 1 health point every second.',
        baseValue: 1,
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
        description: `Projectiles have a ${Math.round(SKILL_FREEZE_CHANCE_PER_LEVEL * 100)}% chance to freeze enemies in place.`,
        baseValue: Math.round(SKILL_FREEZE_CHANCE_PER_LEVEL * 100),
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.freeze,
        apply: (player) => {
            player.freezeChance += SKILL_FREEZE_CHANCE_PER_LEVEL;
            player.skills.freeze = (player.skills.freeze || 0) + 1;
        }
    },
    {
        id: 'extrachoice',
        name: 'Extra Choice',
        description: 'Adds one additional skill option to the level-up screen.',
        baseValue: 1,
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
        description: 'Flat reduction to damage taken from all sources.',
        baseValue: 1,
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
        description: 'Increases the collection radius for XP orbs and items by 50%.',
        baseValue: 50,
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.magnet,
        apply: (player) => {
            player.magnetBonus = (player.magnetBonus || 0) + 0.5;
            player.skills.magnet = (player.skills.magnet || 0) + 1;
        }
    },
    {
        id: 'luck',
        name: 'Lucky Drops',
        description: 'Increases the drop rate of health packs and rare items by 5%.',
        baseValue: 5,
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.luck,
        apply: (player) => {
            player.dropBonus = (player.dropBonus || 0) + 0.05;
            player.skills.luck = (player.skills.luck || 0) + 1;
        }
    },
    {
        id: 'light',
        name: 'Light Radius',
        description: 'Increases your flashlight and cursor light size by 50%.',
        baseValue: 50,
        unit: '%',
        maxLevel: MAX_SKILL_LEVEL,
        category: 'survival',
        icon: ICONS.light,
        apply: (player) => {
            player.lightRadiusBonus = (player.lightRadiusBonus || 0) + 0.5;
            player.skills.light = (player.skills.light || 0) + 1;
            if (player.updateLights) player.updateLights();
        }
    },
    {
        id: 'p2_light',
        name: 'Personal Light',
        description: 'Activates a personal light source around you.',
        baseValue: 1,
        unit: 'Toggle',
        maxLevel: 1,
        category: 'survival',
        icon: ICONS.light,
        // Only for Player 2 (ID 1)
        allowedPlayerId: 1,
        apply: (player) => {
            player.hasPersonalLight = true;
            player.skills.p2_light = 1;
        }
    },
    {
        id: "stasis",
        name: "Polar Vortex",
        description: `A freezing storm surrounds you, slowing nearby enemies within ${POLAR_VORTEX_RADIUS} units. At Level 3, it also slows enemy projectiles.`,
        baseValue: 15,
        unit: "%",
        maxLevel: 3,
        category: 'defensive',
        icon: ICONS.stasis,
        apply: (player) => {
            player.skills.stasis = (player.skills.stasis || 0) + 1;
            player.stasisSlow = (player.skills.stasis * POLAR_VORTEX_SLOW_BASE) + POLAR_VORTEX_SLOW_BASE;
            player.stasisUnlocked = true;
            if (player.skills.stasis >= 3) {
                player.stasisBulletSlow = true;
            }
        }
    },
    {
        id: 'shield',
        name: 'Energy Shield',
        description: 'Blocks 1 hit of damage. Recharges every 10 seconds.',
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
        id: 'deflect',
        name: 'Deflect',
        description: 'Charges up to 3 energy shields that deflect enemy projectiles.',
        baseValue: 1, // 1 Hz
        unit: 'Shields',
        maxLevel: 3,
        category: 'defensive',
        icon: ICONS.shield,
        apply: (player) => {
            player.deflectUnlocked = true;

            const level = (player.skills.deflect || 0) + 1;
            player.skills.deflect = level;

            // Charges System
            player.deflectMaxCharges = level; // Level 1=1, 2=2, 3=3

            // Recharge Rate: Constant 1.0s (60 frames)
            // Level only helps retaining more charges
            player.deflectRechargeInterval = 60;

            // Fill charges immediately on upgrade
            player.deflectCharges = player.deflectMaxCharges;
            player.deflectRechargeTimer = player.deflectRechargeInterval;
        }
    }
];

// ==================== META PROGRESSION ====================
export const META_UPGRADES = [
    {
        id: 'start_damage',
        name: 'Base Damage I',
        description: 'Start every run with +10% damage.',
        cost: 10,
        maxLevel: 5,
        icon: ICONS.damage,
        apply: (player, level) => { player.damage *= (1 + 0.1 * level); }
    },
    {
        id: 'start_health',
        name: 'Base Health I',
        description: 'Start every run with +10 maximum HP.',
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
        description: 'Start every run with +5% movement speed.',
        cost: 20,
        maxLevel: 3,
        icon: ICONS.speed,
        apply: (player, level) => { player.speed *= (1 + 0.05 * level); }
    },
    {
        id: 'xp_gain',
        name: 'XP Boost',
        description: 'Permanently gain 20% more XP from all sources.',
        cost: 20,
        maxLevel: 3,
        icon: ICONS.xp,
        apply: () => { } // Applied when gaining XP in XPManager
    }
];
