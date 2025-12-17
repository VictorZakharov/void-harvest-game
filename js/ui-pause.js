// ==================== PAUSE SCREEN ====================
import { SKILLS } from './skills.js';

export function showPauseScreen(game) {
    const modal = document.getElementById('pause-modal');
    const statsDiv = document.getElementById('pause-stats');

    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    // Helper for stat items
    const statItem = (label, value) => `
        <div class="stat-item">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${value}</span>
        </div>
    `;

    // Calculate derived stats
    const health = `${Math.floor(game.player.health)}/${game.player.maxHealth}`;
    const damage = Math.round(game.player.damage);
    const speed = Math.round(game.player.speed);
    // Fire Rate: frames per shot. 60 frames = 1 sec.
    const attacksPerSec = (60 / game.player.fireRate).toFixed(1);
    const range = Math.round(game.player.range);
    const armor = game.player.armor;

    let html = `
        <div class="pause-section-title">Run Information</div>
        <div class="pause-stats-grid">
            ${statItem('Time', `${minutes}:${secs.toString().padStart(2, '0')}`)}
            ${statItem('Wave', game.wave)}
            ${statItem('Kills', game.kills)}
            ${statItem('Souls', game.totalSouls || 0)}
        </div>

        <div class="pause-section-title">Player Stats</div>
        <div class="pause-stats-grid" style="grid-template-columns: repeat(3, 1fr);">
             ${statItem('Level', game.player.level)}
             ${statItem('Health', health)}
             ${statItem('Speed', speed)}
             ${statItem('Damage', damage)}
             ${statItem('Atk Speed', `${attacksPerSec}/s`)}
             ${statItem('Range', range)}
             ${statItem('Armor', armor)}
             ${statItem('Regen', `${game.player.healthRegen}/s`)}
             ${statItem('Vampire', `${game.player.vampire}`)}
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
                    // Inverse: rate * 0.85^level
                    const frReduction = Math.round((1 - Math.pow(0.85, level)) * 100);
                    currentBonusText = `+${frReduction}% Fire Rate`;
                    scalingText = 'Base: ~3 shots/sec (+15% speed/lvl)';
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
            const className = isCustomSkill ? 'active-skill custom-skill' : 'active-skill';

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
