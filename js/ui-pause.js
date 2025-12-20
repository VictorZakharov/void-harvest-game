// ==================== PAUSE SCREEN ====================
import { SKILLS, ICONS } from './skills.js';
import {
    PLAYER_BASE_HEALTH, PLAYER_BASE_SPEED, PLAYER_BASE_DAMAGE,
    PLAYER_BASE_FIRE_RATE, BULLET_BASE_RANGE
} from './constants.js';

export function showPauseScreen(game) {
    const modal = document.getElementById('pause-modal');
    const statsDiv = document.getElementById('pause-stats');

    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    // Helper for stat items with detailed fancy tooltip
    const statItem = (label, base, bonus, total, skillId, desc, opts = {}) => {
        const {
            direction = 'top',
            showMath = true,
            baseLabel = 'Base Value',
            bonusLabel = 'Bonus',
            totalLabel = 'Total'
        } = opts;

        // Robust formatter for display values
        const formatVal = (v) => {
            if (typeof v === 'number') {
                if (Math.abs(v % 1) < 0.001) return Math.floor(v);
                return parseFloat(v.toFixed(1));
            }
            return v;
        };

        const dBase = formatVal(base);
        const dBonus = formatVal(bonus);
        const dTotal = formatVal(total);

        // Main display value (Right Aligned)
        // If there's a bonus, show "Base + Bonus" (Green), otherwise just Base
        let displayHtml = `<span class="stat-value">${dBase}</span>`;
        if (dBonus) {
            displayHtml += ` <span class="stat-bonus">+${dBonus}</span>`;
        } else if (typeof dTotal === 'string' && dTotal.includes(':')) {
            // For time/etc just show the value
            displayHtml = `<span class="stat-value">${dTotal}</span>`;
        }

        // Icon & Pips Logic
        let iconHtml = '';
        let pipsHtml = '';

        if (skillId && ICONS[skillId]) {
            const skillLevel = (game.player.skills && game.player.skills[skillId]) || 0;

            // Find max level for this skill
            const skillDef = SKILLS.find(s => s.id === skillId);
            const maxLevel = skillDef ? skillDef.maxLevel : 5;

            // Generate Pips only if active
            if (skillLevel > 0) {
                for (let i = 0; i < maxLevel; i++) {
                    const isFilled = i < skillLevel;
                    const bg = isFilled ? '#00ffff' : 'rgba(255,255,255,0.2)';
                    const shadow = isFilled ? 'box-shadow: 0 0 4px rgba(0,255,255,0.6);' : '';
                    pipsHtml += `<div style="width:5px; height:5px; border-radius:50%; background:${bg}; ${shadow}"></div>`;
                }
                // Wrap pips in container
                pipsHtml = `<div style="display:flex; gap:3px; margin-left:8px;">${pipsHtml}</div>`;
            }

            // Generate Icon Box (Rounded Rectangle)
            // Active: Bright Cyan Border/BG/Icon
            // Inactive: Faded, Grayscale
            const isActive = skillLevel > 0;
            const boxStyle = isActive
                ? 'border:1px solid rgba(0,255,255,0.4); background:rgba(0,255,255,0.1); box-shadow:0 0 8px rgba(0,255,255,0.2);'
                : 'border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); filter:grayscale(1); opacity:0.5;';

            const iconColor = isActive ? '#00ffff' : '#ffffff';

            iconHtml = `
                <div style="width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; ${boxStyle}">
                    <span style="display:block; width:20px; height:20px; color:${iconColor};">
                        ${ICONS[skillId]}
                    </span>
                </div>
            `;
        }

        // Tooltip Content Construction
        let tooltipContent = `<div class="tooltip-desc" style="margin-bottom:8px">${desc}</div>`;

        // Math Rows Logic
        if (showMath && dTotal !== null && dTotal !== undefined) {
            tooltipContent += `
                <div class="tooltip-divider"></div>
                <div class="tooltip-row">
                    <span>${baseLabel}:</span>
                    <span style="color:#fff">${dBase}</span>
                </div>
                <div class="tooltip-row">
                    <span>${bonusLabel}:</span>
                    <span style="color:#00ff00">${dBonus ? '+' + dBonus : '0'}</span>
                </div>
                <div class="tooltip-row total-row">
                    <span>${totalLabel}:</span>
                    <span class="stat-total">${dTotal}</span>
                </div>
             `;
        }

        // Title
        const title = label === 'Atk Spd' ? 'Attack Speed' : label;

        // Tooltip Class (Bottom vs Top)
        const tooltipClass = direction === 'bottom' ? 'stat-tooltip fancy-tooltip tooltip-bottom' : 'stat-tooltip fancy-tooltip';

        return `
        <div class="stat-item tooltip-container">
            <span class="stat-label">${label}</span>
            <div class="stat-val-wrapper">${displayHtml}</div>
            <div class="${tooltipClass}">
                <div class="tooltip-header" style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center;">
                        <span class="tooltip-title" style="margin:0">${title}</span>
                        ${pipsHtml}
                    </div>
                    ${iconHtml}
                </div>
                <div class="tooltip-content">
                    ${tooltipContent}
                </div>
            </div>
        </div>
        `;
    };

    // Calculate derived stats
    // Souls
    const originalSouls = game.metaProgress.souls || 0;
    const pendingSouls = Math.floor(game.kills / 5);
    const totalSouls = originalSouls + pendingSouls;

    // Health
    const baseHealth = 100;
    const maxHealth = Math.floor(game.player.maxHealth);
    const healthBonus = maxHealth > baseHealth ? maxHealth - baseHealth : 0;

    // Speed (Percentage)
    const baseSpeed = PLAYER_BASE_SPEED;
    const currentSpeed = game.player.speed;
    const speedMult = currentSpeed / baseSpeed;
    const totalSpeedPercent = Math.round(speedMult * 100);
    const speedBonusPercent = totalSpeedPercent - 100;

    // Damage (Percentage)
    const baseDamage = PLAYER_BASE_DAMAGE;
    const currentDamage = game.player.damage;
    const damageMult = currentDamage / baseDamage;
    const totalDamagePercent = Math.round(damageMult * 100);
    const damageBonusPercent = totalDamagePercent - 100;

    // Fire Rate (Percentage)
    const baseFireRate = PLAYER_BASE_FIRE_RATE;
    const currentFireRate = game.player.fireRate;
    // Multiplier = Base / Current (e.g. 18 / 10 = 1.8)
    const speedMultRate = baseFireRate / currentFireRate;
    const totalPercent = Math.round(speedMultRate * 100);
    const basePercent = 100;
    const bonusPercent = totalPercent - basePercent;

    // Range (Percentage)
    const baseRange = BULLET_BASE_RANGE;
    const currentRange = game.player.range;
    const rangeMult = currentRange / baseRange;
    const totalRangePercent = Math.round(rangeMult * 100);
    const rangeBonusPercent = totalRangePercent - 100;

    // Armor
    const armor = game.player.armor || 0;
    const armorBonus = armor > 0 ? armor : 0;

    // Regen
    const regen = game.player.healthRegen || 0;
    const regenBonus = regen > 0 ? regen : 0;

    // Vampire
    const vampire = game.player.vampire || 0;
    const vampireBonus = vampire > 0 ? vampire : 0;


    let html = `
        <div class="pause-section-title">Run Information</div>
        <div class="pause-stats-grid">
            ${statItem('Time', `${minutes}:${secs.toString().padStart(2, '0')}`, null, `${minutes}:${secs.toString().padStart(2, '0')}`, null, 'Time elapsed in the current survival run.', { direction: 'bottom', showMath: false })}
            ${statItem('Wave', game.wave, null, game.wave, null, 'Current difficulty wave.<br>Enemies get stronger over time.', { direction: 'bottom', showMath: false })}
            ${statItem('Kills', game.kills, null, game.kills, null, 'Total enemies defeated this run.<br>Used to calculate Bonus Souls.', { direction: 'bottom', showMath: false })}
            ${statItem('Souls', originalSouls, pendingSouls, totalSouls, 'xp', 'Currency for permanent upgrades.<br>Earned from kills (1 Soul per 5 Kills).', { direction: 'bottom', baseLabel: 'Collected', bonusLabel: 'From Kills' })}
        </div>

        <div class="pause-section-title">Player Stats</div>
        <div class="pause-stats-grid" style="grid-template-columns: repeat(3, 1fr);">
             ${statItem('Level', game.player.level, null, game.player.level, 'xp', 'Current character level.<br>Higher levels unlock new skills.')}
             ${statItem('Health', baseHealth, healthBonus, maxHealth, 'health', 'Maximum Hit Points.<br>Increase via Health Skill.')}
             ${statItem('Speed', '100%', speedBonusPercent > 0 ? `${speedBonusPercent}%` : null, `${totalSpeedPercent}%`, 'speed', `Movement speed %.<br>Base: 100% (${baseSpeed} units).`)}
             ${statItem('Damage', '100%', damageBonusPercent > 0 ? `${damageBonusPercent}%` : null, `${totalDamagePercent}%`, 'damage', `Damage multiplier.<br>Base: 100% (${baseDamage} dmg).`)}
             ${statItem('Atk Spd', '100%', bonusPercent > 0 ? `${bonusPercent}%` : null, `${totalPercent}%`, 'firerate', `Attack speed multiplier.<br>Base: 100% (${baseFireRate} frames).`)}
             ${statItem('Range', '100%', rangeBonusPercent > 0 ? `${rangeBonusPercent}%` : null, `${totalRangePercent}%`, 'range', `Range multiplier.<br>Base: 100% (${baseRange} units).`)}
             ${statItem('Armor', '0', armorBonus, armor, 'armor', 'Flat damage reduction.<br>Reduces damage taken from hits.')}
             ${statItem('Regen', '0', regenBonus, `${regen}/s`, 'regen', 'Health recovered per second.<br>Passive healing.')}
             ${statItem('Vampire', '0', vampireBonus, vampire, 'vampire', 'Health recovered per kill.<br>Sustain during combat.')}
        </div>
    `;

    // Generate skills HTML
    let skillsHtml = '';
    const customSkills = [];
    const earnedSkills = [];

    // Collect all active skills
    for (let skillId in game.player.skills) {
        const level = game.player.skills[skillId];
        if (level > 0) {
            const skillDef = SKILLS.find(s => s.id === skillId);
            if (skillDef) {
                const isCustomSkill = game.customSkillIds && game.customSkillIds.has(skillId);
                if (isCustomSkill) {
                    customSkills.push({ skillId, level, skillDef });
                } else {
                    earnedSkills.push({ skillId, level, skillDef });
                }
            }
        }
    }

    if (customSkills.length > 0 || earnedSkills.length > 0) {
        skillsHtml += `<div class="pause-section-title">Skills Overview</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">`;

        // Helper to format detailed skill info
        const getSkillDetail = (skillDef, level) => {
            let currentBonusText = '';
            let scalingText = '';
            let mechanicsText = '';

            switch (skillDef.id) {
                case 'damage':
                    // Exponential: 1.2^level
                    const dmgBonus = Math.round((Math.pow(1.2, level) - 1) * 100);
                    currentBonusText = `+${dmgBonus}% Damage`;
                    scalingText = 'Base: 10 dmg (+20% compounding/lvl)';
                    break;
                case 'firerate':
                    // Simulate actual frame logic to show TRUE Attack Speed (%)
                    let frames = PLAYER_BASE_FIRE_RATE;
                    for (let i = 0; i < level; i++) {
                        frames = Math.max(1, Math.floor(frames * 0.85));
                    }
                    // Base: 60/18 = 3.33. New: 60/frames.
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
                    scalingText = 'Base: 500px (+50% compounding/lvl)';
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
                    currentBonusText = `${Math.round(level * 10)}% Freeze Chance`;
                    scalingText = `Total: ${Math.round(level * 10)}% (0% Base + Bonus)`;
                    mechanicsText = 'Freezes enemies in place';
                    break;
                case 'berserk':
                    // Berserk has complex scaling logic
                    const threshold = 10 + (level - 1) * 5; // 10, 15, 20%
                    const dmg = 50 * level; // 50, 100, 150%
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
                    // Base 5% (0.05), Level adds +2% (0.02)
                    const totalLuck = 5 + level * 2;
                    currentBonusText = `+${level * 2}% Health Drop Rate`;
                    scalingText = `Total: ${totalLuck}% (5% Base + Bonus)`;
                    break;
                case 'magnet':
                    // Base 80px, Level adds 50% * level
                    // 1.5 ^ level ?? No, apply logic: player.magnetBonus += 0.5. Initial is 0.
                    // Range = Base * (1 + bonus)
                    const magBonus = level * 50;
                    currentBonusText = `+${magBonus}% Pickup Range`;
                    scalingText = `Total: ${Math.round(80 * (1 + level * 0.5))}px (80px Base)`;
                    break;
                case 'extrachoice':
                    currentBonusText = `+${level} Skill Choice`;
                    scalingText = `Total: ${3 + level} (3 Base + Bonus)`;
                    break;
                default:
                    currentBonusText = `Level ${level} Effect`;
                    scalingText = 'Unknown Scaling';
            }

            return { currentBonusText, scalingText, mechanicsText };
        };

        // Show earned skills first, then custom skills
        [...earnedSkills, ...customSkills].forEach(({ skillId, level, skillDef }) => {
            const isCustomSkill = game.customSkillIds && game.customSkillIds.has(skillId);
            const categoryClass = skillDef.category || 'defensive';
            const className = isCustomSkill ? `active-skill custom-skill ${categoryClass}` : `active-skill ${categoryClass}`;

            const detail = getSkillDetail(skillDef, level);

            // Generate Pips
            const maxPips = skillDef.maxLevel || 5;
            let pipsHtml = '';
            for (let i = 0; i < maxPips; i++) {
                pipsHtml += `<div class="pip ${i < level ? 'filled' : ''}"></div>`;
            }

            skillsHtml += `
                <div class="${className}" style="width: 40px; height: 40px;">
                    <div class="skill-icon">
                        ${skillDef.icon}
                        <div class="active-skill-level">${level}</div>
                    </div>
                    <div class="skill-tooltip">
                        <div class="tooltip-header">
                            <span class="tooltip-title">${skillDef.name}</span>
                            <div class="tooltip-level-pips">
                                ${pipsHtml}
                            </div>
                        </div>
                        <div class="tooltip-content">
                            <div class="tooltip-stat">
                                <span>Current:</span>
                                <span class="val">${detail.currentBonusText}</span>
                            </div>
                             <div class="tooltip-desc">
                                ${detail.scalingText}
                                ${detail.mechanicsText ? `<br><span style="color: #aaa; font-style: normal;">${detail.mechanicsText}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        skillsHtml += `</div>`;
    }

    html += skillsHtml;

    statsDiv.innerHTML = html;
    modal.classList.remove('hidden');
}

export function resumeGame(game) {
    document.getElementById('pause-modal').classList.add('hidden');
    game.state = 'playing';
    game.lastTime = performance.now(); // Reset time to avoid jump
}
