// ==================== PAUSE SCREEN ====================
import { SKILLS } from './skills.js';
import {
    PLAYER_BASE_HEALTH, PLAYER_BASE_SPEED, PLAYER_BASE_DAMAGE,
    PLAYER_BASE_FIRE_RATE, BULLET_BASE_RANGE, SKILL_FREEZE_CHANCE_PER_LEVEL
} from './constants.js';
import { UIStatItem } from './ui/UIStatItem.js';
import { UISkillDetail } from './ui/UISkillDetail.js';

/**
 * Displays the pause screen with current run information and player stats.
 * Orchestrates rendering using specialized UI components.
 * @param {Object} game - The main game instance.
 * @param {Object} dom - The DOMCache instance.
 */
export function showPauseScreen(game, dom) {

    // Time calculations
    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;

    // Calculate derived stats for tooltips and display
    const originalSouls = game.metaProgress.souls || 0;
    const pendingSouls = Math.floor(game.kills / 5);
    const totalSouls = originalSouls + pendingSouls;

    const baseHealth = PLAYER_BASE_HEALTH || 100;
    const maxHealth = Math.floor(game.player.maxHealth);
    const healthBonus = maxHealth > baseHealth ? maxHealth - baseHealth : 0;

    const baseSpeed = PLAYER_BASE_SPEED;
    const speedMult = game.player.speed / baseSpeed;
    const totalSpeedPercent = Math.round(speedMult * 100);
    const speedBonusPercent = totalSpeedPercent - 100;

    const baseDamage = PLAYER_BASE_DAMAGE;
    const damageMult = game.player.damage / baseDamage;
    const totalDamagePercent = Math.round(damageMult * 100);
    const damageBonusPercent = totalDamagePercent - 100;

    const baseFireRate = PLAYER_BASE_FIRE_RATE;
    const speedMultRate = baseFireRate / game.player.fireRate;
    const totalFireRatePercent = Math.round(speedMultRate * 100);
    const fireRateBonusPercent = totalFireRatePercent - 100;

    const baseRange = BULLET_BASE_RANGE;
    const rangeMult = game.player.range / baseRange;
    const totalRangePercent = Math.round(rangeMult * 100);
    const rangeBonusPercent = totalRangePercent - 100;

    const armor = game.player.armor || 0;
    const regen = game.player.healthRegen || 0;

    // Build the Pause Screen HTML
    let html = `
        <div class="pause-section-title">Run Information</div>
        <div class="pause-stats-grid">
            ${UIStatItem.render(game, 'Time', timeStr, null, timeStr, null, 'Time elapsed in the current survival run.', { direction: 'bottom', showMath: false })}
            ${UIStatItem.render(game, 'Wave', game.wave, null, game.wave, null, 'Current difficulty wave.<br>Enemies get stronger over time.', { direction: 'bottom', showMath: false })}
            ${UIStatItem.render(game, 'Kills', game.kills, null, game.kills, null, 'Total enemies defeated this run.<br>Used to calculate Bonus Souls.', { direction: 'bottom', showMath: false })}
            ${UIStatItem.render(game, 'Souls', originalSouls, pendingSouls, totalSouls, 'xp', 'Currency for permanent upgrades.<br>Earned from kills (1 Soul per 5 Kills).', { direction: 'bottom', baseLabel: 'Collected', bonusLabel: 'From Kills' })}
        </div>
    `;

    if (game.isMultiplayer) {
        // Multi-Column Layout
        html += `<div class="pause-columns">`;

        // Player columns, tinted with each player's chosen lobby color
        game.players.forEach((player, i) => {
            const accent = player.color || (i === 0 ? '#44ccff' : '#ffaa44');
            html += `<div class="pause-player-column" style="--player-accent: ${accent};">`;
            html += `<div class="pause-section-title player-accent">Player ${i + 1}</div>`;
            html += renderStatsBlock(game, player);
            html += renderSkillsBlock(game, player, true);
            html += `</div>`;
        });

        html += `</div>`; // End Grid
    } else {
        // Single Player Layout
        html += `<div class="pause-section-title">Player Stats</div>`;
        html += renderStatsBlock(game, game.player || game.players[0], 3);
        html += renderSkillsBlock(game, game.player || game.players[0]);
    }

    dom.setHTML(dom.pauseStats, html);
    dom.show(dom.pauseModal);
}

function renderStatsBlock(game, player, columns = 2) {
    const baseHealth = PLAYER_BASE_HEALTH || 100;
    const maxHealth = Math.floor(player.maxHealth);
    const healthBonus = maxHealth > baseHealth ? maxHealth - baseHealth : 0;

    const baseSpeed = PLAYER_BASE_SPEED;
    const speedMult = player.speed / baseSpeed;
    const totalSpeedPercent = Math.round(speedMult * 100);
    const speedBonusPercent = totalSpeedPercent - 100;

    const baseDamage = PLAYER_BASE_DAMAGE;
    const damageMult = player.damage / baseDamage;
    const totalDamagePercent = Math.round(damageMult * 100);
    const damageBonusPercent = totalDamagePercent - 100;

    const baseFireRate = PLAYER_BASE_FIRE_RATE;
    const speedMultRate = baseFireRate / player.fireRate;
    const totalFireRatePercent = Math.round(speedMultRate * 100);
    const fireRateBonusPercent = totalFireRatePercent - 100;

    const baseRange = BULLET_BASE_RANGE;
    const rangeMult = player.range / baseRange;
    const totalRangePercent = Math.round(rangeMult * 100);
    const rangeBonusPercent = totalRangePercent - 100;

    const armor = player.armor || 0;
    const regen = player.healthRegen || 0;

    const pierce = player.piercing || 0;

    // Use default columns style if columns > 2, else compact grid
    const style = columns > 2 ? `style="grid-template-columns: repeat(${columns}, 1fr);"` : `style="grid-template-columns: 1fr 1fr;"`;

    return `
        <div class="pause-stats-grid" ${style}>
             ${UIStatItem.render(game, 'Level', player.level, null, player.level, 'xp', 'Current character level.<br>Higher levels unlock new skills.')}
             ${UIStatItem.render(game, 'Health', baseHealth, healthBonus, maxHealth, 'health', 'Maximum Hit Points.<br>Increase via Health Skill.')}
             ${UIStatItem.render(game, 'Speed', '100%', speedBonusPercent > 0 ? `${speedBonusPercent}%` : null, `${totalSpeedPercent}%`, 'speed', `Movement speed %.<br>Base: 100% (${baseSpeed} units).`)}
             ${UIStatItem.render(game, 'Damage', '100%', damageBonusPercent > 0 ? `${damageBonusPercent}%` : null, `${totalDamagePercent}%`, 'damage', `Damage multiplier.<br>Base: 100% (${baseDamage} dmg).`)}
             ${UIStatItem.render(game, 'Atk Spd', '100%', fireRateBonusPercent > 0 ? `${fireRateBonusPercent}%` : null, `${totalFireRatePercent}%`, 'firerate', `Attack speed multiplier.<br>Base: 100% (${baseFireRate} frames).`)}
             ${UIStatItem.render(game, 'Range', '100%', rangeBonusPercent > 0 ? `${rangeBonusPercent}%` : null, `${totalRangePercent}%`, 'range', `Range multiplier.<br>Base: 100% (${baseRange} units).`)}
             ${UIStatItem.render(game, 'Armor', '0', armor > 0 ? armor : null, armor, 'armor', 'Flat damage reduction.<br>Reduces damage taken from hits.')}
             ${UIStatItem.render(game, 'Regen', '0', regen > 0 ? regen : null, `${regen}/s`, 'regen', 'Health recovered per second.<br>Passive healing.')}

             ${UIStatItem.render(game, 'Pierce', '0', pierce > 0 ? pierce : null, pierce, 'pierce', 'Number of enemies bullets pass through.<br>Base: 0.')}
        </div>
    `;
}

function renderSkillsBlock(game, player, accent = false) {
    let skillsHtml = '';
    const activeSkills = [];

    // Collect all active skills
    for (let skillId in player.skills) {
        const level = player.skills[skillId];
        if (level > 0) {
            const skillDef = SKILLS.find(s => s.id === skillId);
            if (skillDef) {
                const isCustom = game.customSkillIds && game.customSkillIds.has(skillId);
                activeSkills.push({ skillId, level, skillDef, isCustom });
            }
        }
    }

    // Sort: Earned skills first, then custom skills
    activeSkills.sort((a, b) => (a.isCustom === b.isCustom ? 0 : a.isCustom ? 1 : -1));

    if (activeSkills.length > 0) {
        skillsHtml += `<div class="pause-section-title${accent ? ' player-accent' : ''}" style="margin-top: 15px;">Skills</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">`;

        activeSkills.forEach(({ skillId, level, skillDef, isCustom }) => {
            const categoryClass = skillDef.category || 'defensive';
            const className = isCustom ? `active-skill custom-skill ${categoryClass}` : `active-skill ${categoryClass}`;
            const detail = UISkillDetail.get(skillDef, level);

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

    return skillsHtml;
}

/**
 * Resumes the game and hides the pause modal.
 * @param {Object} game - The main game instance.
 * @param {Object} dom - The DOMCache instance.
 */
export function resumeGame(game, dom) {
    dom.hide(dom.pauseModal);
    game.state = 'playing';
    game.lastTime = performance.now();
}
