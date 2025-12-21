import { PLAYER_BASE_FIRE_RATE, SKILL_FREEZE_CHANCE_PER_LEVEL } from '../constants.js';

/**
 * Logic for calculating and formatting skill details.
 */
export class UISkillDetail {
    /**
     * Gets detailed information for a skill at a specific level.
     * @param {Object} skillDef - Skill definition object.
     * @param {number} level - Current skill level.
     * @returns {Object} { currentBonusText, scalingText, mechanicsText }
     */
    static get(skillDef, level) {
        let currentBonusText = '';
        let scalingText = '';
        let mechanicsText = '';

        switch (skillDef.id) {
            case 'damage':
                const dmgBonus = Math.round((Math.pow(1.2, level) - 1) * 100);
                currentBonusText = `+${dmgBonus}% Damage`;
                scalingText = 'Base: 10 dmg (+20% compounding/lvl)';
                break;
            case 'firerate':
                let frames = PLAYER_BASE_FIRE_RATE;
                for (let i = 0; i < level; i++) {
                    frames = Math.max(1, Math.floor(frames * 0.85));
                }
                const baseAPS = 60 / PLAYER_BASE_FIRE_RATE;
                const newAPS = 60 / frames;
                const effectiveBonus = Math.round(((newAPS / baseAPS) - 1) * 100);
                currentBonusText = `+${effectiveBonus}% Attack Speed`;
                scalingText = 'Rapid Fire: Reduces shot delay by 15% (compounding)';
                break;
            case 'speed':
                const speedBonus = Math.round((Math.pow(1.08, level) - 1) * 100);
                currentBonusText = `+${speedBonus}% Move Speed`;
                scalingText = 'Base: 3 units (+8% compounding/lvl)';
                break;
            case 'health':
                currentBonusText = `+${30 * level} Max HP`;
                scalingText = `Total: ${100 + 30 * level} (100 Base + Bonus)`;
                break;
            case 'multishot':
                currentBonusText = `+${level} Projectile${level > 1 ? 's' : ''}`;
                scalingText = `Total: ${1 + level} (1 Base + Bonus)`;
                break;
            case 'piercing':
                currentBonusText = `+${level} Pierce Count`;
                scalingText = `Total: ${level} (0 Base + Bonus)`;
                break;
            case 'bulletspeed':
                const velBonus = Math.round((Math.pow(1.25, level) - 1) * 100);
                currentBonusText = `+${velBonus}% Bullet Velocity`;
                scalingText = 'Base: 8 units (+25% compounding/lvl)';
                break;
            case 'range':
                const rangeBonus = Math.round((Math.pow(1.5, level) - 1) * 100);
                currentBonusText = `+${rangeBonus}% Attack Range`;
                scalingText = 'Base: 300px (+50% compounding/lvl)';
                break;
            case 'regen':
                currentBonusText = `+${level} HP/sec`;
                scalingText = `Total: ${level} HP/sec (0 Base + Bonus)`;
                break;
            case 'vampire':
                currentBonusText = `+${level} HP per Kill`;
                scalingText = `Total: ${level} HP/kill (0 Base + Bonus)`;
                break;
            case 'freeze':
                const freezePct = Math.round(SKILL_FREEZE_CHANCE_PER_LEVEL * 100);
                currentBonusText = `${Math.round(level * freezePct)}% Freeze Chance`;
                scalingText = `Total: ${Math.round(level * freezePct)}% (0% Base + Bonus)`;
                mechanicsText = 'Freezes enemies in place';
                break;
            case 'berserk':
                const threshold = 10 + (level - 1) * 5;
                const dmg = 50 * level;
                currentBonusText = `+${dmg}% DMG at <${threshold}% HP`;
                scalingText = 'Base: 0% (+50% DMG/lvl)';
                mechanicsText = 'deal massive damage when low health';
                break;
            case 'armor':
                currentBonusText = `-${level} Damage Taken`;
                scalingText = `Total: -${level} (0 Base + Bonus)`;
                mechanicsText = 'Flat damage reduction';
                break;
            case 'luck':
                const totalLuck = 5 + level * 5;
                currentBonusText = `+${level * 5}% Health Drop Rate`;
                scalingText = `Total: ${totalLuck}% (5% Base + Bonus)`;
                break;
            case 'magnet':
                const magBonus = level * 50;
                currentBonusText = `+${magBonus}% Pickup Range`;
                scalingText = `Total: ${Math.round(80 * (1 + level * 0.5))}px (80px Base)`;
                break;
            case 'extrachoice':
                currentBonusText = `+${level} Skill Choice`;
                scalingText = `Total: ${3 + level} (3 Base + Bonus)`;
                break;
            case 'light':
                const lightBonus = level * 50;
                currentBonusText = `+${lightBonus}% Light Radius`;
                scalingText = `Total: ${100 + lightBonus}% (100% Base + Bonus)`;
                break;
            default:
                currentBonusText = `Level ${level} Effect`;
                scalingText = 'Unknown Scaling';
        }

        return { currentBonusText, scalingText, mechanicsText };
    }
}
