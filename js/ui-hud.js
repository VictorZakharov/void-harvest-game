// ==================== HUD UPDATES ====================
import { SKILLS } from './skills.js';

export function updateHUD(game) {
    const healthBar = document.getElementById('health-bar');
    const healthText = document.getElementById('health-text');
    const xpBar = document.getElementById('xp-bar');
    const levelText = document.getElementById('level-text');
    const timeVal = document.getElementById('time-val');
    const killsVal = document.getElementById('kills-val');
    const soulsBankedText = document.getElementById('souls-banked-text');
    const soulsRunText = document.getElementById('souls-run-text');
    const waveVal = document.getElementById('wave-val');
    const waveIcons = document.getElementById('wave-icons');

    const healthPercent = (game.player.health / game.player.maxHealth) * 100;
    healthBar.style.width = healthPercent + '%';
    healthText.textContent = `${Math.max(0, Math.floor(game.player.health))}/${game.player.maxHealth}`;

    const xpPercent = (game.player.xp / game.player.xpToLevel) * 100;
    xpBar.style.width = xpPercent + '%';
    levelText.textContent = `Lv ${game.player.level}`;

    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timeVal.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

    killsVal.textContent = `${game.kills}`;

    if (soulsBankedText && soulsRunText) {
        soulsBankedText.textContent = `${game.totalSouls}`;
        const runSouls = game.getRunSouls ? game.getRunSouls() : Math.floor(game.kills / 5);
        soulsRunText.textContent = `(+${runSouls})`;
    }

    // Determine which enemies can spawn this wave
    const wave = game.wave;
    let enemyIconsHtml = '';

    // Custom game mode: show only enabled enemies
    if (game.customEnemies) {
        if (game.customEnemies.basic) {
            enemyIconsHtml += '<span class="enemy-indicator basic">●</span> ';
        }
        if (game.customEnemies.fast) {
            enemyIconsHtml += '<span class="enemy-indicator fast">●</span> ';
        }
        if (game.customEnemies.shooter) {
            enemyIconsHtml += '<span class="enemy-indicator shooter">●</span> ';
        }
        if (game.customEnemies.tank) {
            enemyIconsHtml += '<span class="enemy-indicator tank">●</span> ';
        }
        if (game.customEnemies.ice) {
            enemyIconsHtml += '<span class="enemy-indicator ice">●</span> ';
        }
        enemyIconsHtml = enemyIconsHtml.trim();
    } else {
        // Normal mode: show enemies based on wave progression
        enemyIconsHtml = '<span class="enemy-indicator basic">●</span>';

        if (wave >= 3) {
            enemyIconsHtml += ' <span class="enemy-indicator fast">●</span>';
        }
        if (wave >= 5) {
            enemyIconsHtml += ' <span class="enemy-indicator shooter">●</span>';
        }
        if (wave >= 7) {
            enemyIconsHtml += ' <span class="enemy-indicator tank">●</span>';
        }
        if (wave >= 8) {
            enemyIconsHtml += ' <span class="enemy-indicator ice">●</span>';
        }
    }

    waveVal.textContent = `${game.wave}`;
    if (waveIcons) waveIcons.innerHTML = enemyIconsHtml;

    // Update status effects
    const statusEffectsContainer = document.getElementById('status-effects');
    statusEffectsContainer.innerHTML = '';

    // Ice slow effect
    if (game.player.slowEffects.length > 0) {
        const iceEffect = document.createElement('div');
        iceEffect.className = 'status-effect ice';
        iceEffect.textContent = `❄ ${game.player.slowEffects.length}`;
        iceEffect.title = `Slowed ${Math.round(game.player.slowEffects.reduce((sum, e) => sum + e.amount, 0) * 100)}%`;
        statusEffectsContainer.appendChild(iceEffect);
    }

    // Passive Heal (Regen)
    const regenLevel = game.player.skills.regen || 0;
    if (regenLevel > 0) {
        const regenSkill = SKILLS.find(s => s.id === 'regen');
        const regenEffect = document.createElement('div');
        regenEffect.className = 'status-effect passive';
        regenEffect.innerHTML = `<div class="status-icon">${regenSkill.icon}</div><span class="status-level">${regenLevel}</span>`;
        regenEffect.title = `Passive Heal: ${game.player.healthRegen} HP per second`;
        statusEffectsContainer.appendChild(regenEffect);
    }

    // Vampiric Touch
    const vampireLevel = game.player.skills.vampire || 0;
    if (vampireLevel > 0) {
        const vampireSkill = SKILLS.find(s => s.id === 'vampire');
        const vampireEffect = document.createElement('div');
        vampireEffect.className = 'status-effect passive';
        vampireEffect.innerHTML = `<div class="status-icon">${vampireSkill.icon}</div><span class="status-level">${vampireLevel}</span>`;
        vampireEffect.title = `Vampiric Touch: ${game.player.vampire} HP per kill`;
        statusEffectsContainer.appendChild(vampireEffect);
    }

    // Armor
    const armorLevel = game.player.skills.armor || 0;
    if (armorLevel > 0) {
        const armorSkill = SKILLS.find(s => s.id === 'armor');
        const armorEffect = document.createElement('div');
        armorEffect.className = 'status-effect passive';
        armorEffect.innerHTML = `<div class="status-icon">${armorSkill.icon}</div><span class="status-level">${armorLevel}</span>`;
        armorEffect.title = `Armor: -${game.player.armor} damage reduction`;
        statusEffectsContainer.appendChild(armorEffect);
    }

    // Berserk Mode (only show when active)
    const berserkLevel = game.player.skills.berserk || 0;
    if (berserkLevel > 0) {
        const healthPercent = game.player.health / game.player.maxHealth;
        const berserkThreshold = game.player.berserkBonus * 0.1 + 0.05;
        if (healthPercent <= berserkThreshold) {
            const berserkSkill = SKILLS.find(s => s.id === 'berserk');
            const berserkEffect = document.createElement('div');
            berserkEffect.className = 'status-effect passive';
            const damageBonus = Math.round(game.player.berserkBonus * 100);
            berserkEffect.innerHTML = `<div class="status-icon">${berserkSkill.icon}</div><span class="status-level">${berserkLevel}</span>`;
            berserkEffect.title = `Berserk Mode: +${damageBonus}% damage`;
            statusEffectsContainer.appendChild(berserkEffect);
        }
    }

    // Update active skills
    const activeSkillsContainer = document.getElementById('active-skills');
    activeSkillsContainer.innerHTML = '';

    // Separate skills into custom (grey) and earned (colored)
    const customSkills = [];
    const earnedSkills = [];

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

    // Display earned skills first, then custom skills (reversed due to flex-direction: row-reverse)
    // This results in: grey custom skills on left, colored earned skills on right
    [...earnedSkills, ...customSkills].forEach(({ skillId, level, skillDef }) => {
        const skillBadge = document.createElement('div');
        const isCustomSkill = game.customSkillIds && game.customSkillIds.has(skillId);
        const categoryClass = skillDef.category || 'defensive';
        skillBadge.className = isCustomSkill ? `active-skill custom-skill ${categoryClass}` : `active-skill ${categoryClass}`;

        skillBadge.innerHTML = `
            <div class="skill-icon">
                ${skillDef.icon}
                <div class="active-skill-level">${level}</div>
            </div>
        `;
        skillBadge.title = `${skillDef.name} (Level ${level}/${skillDef.maxLevel})${isCustomSkill ? ' - Starting skill' : ''}`;
        activeSkillsContainer.appendChild(skillBadge);
    });
}
