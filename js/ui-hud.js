// ==================== HUD UPDATES ====================
import { SKILLS } from './skills.js';

export function updateHUD(game, dom) {
    const healthPercent = (game.player.health / game.player.maxHealth) * 100;
    dom.healthBar.style.width = healthPercent + '%';
    dom.setText(dom.healthText, `${Math.max(0, Math.floor(game.player.health))}/${game.player.maxHealth}`);

    const xpPercent = (game.player.xp / game.player.xpToLevel) * 100;
    dom.xpBar.style.width = xpPercent + '%';
    dom.setText(dom.levelText, `Lv ${game.player.level}`);

    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    dom.setText(dom.timeVal, `${minutes}:${secs.toString().padStart(2, '0')}`);

    dom.setText(dom.killsVal, `${game.kills}`);

    if (dom.soulsBankedText && dom.soulsRunText) {
        dom.setText(dom.soulsBankedText, `${game.totalSouls}`);
        const runSouls = game.getRunSouls ? game.getRunSouls() : Math.floor(game.kills / 5);
        dom.setText(dom.soulsRunText, `(+${runSouls})`);
    }

    // Count active enemies by type
    const counts = { basic: 0, fast: 0, shooter: 0, tank: 0, ice: 0 };
    if (game.enemies) { // Ensure enemies array exists
        for (const enemy of game.enemies) {
            if (counts[enemy.type] !== undefined) {
                counts[enemy.type]++;
            }
        }
    }

    // Determine which enemies can spawn this wave
    const wave = game.wave;
    let enemyIconsHtml = '';

    // Helper to generate icon HTML with count
    const getIcon = (type) => `<span class="enemy-indicator ${type}">● <span style="font-size: 0.8em; color: #fff;">${counts[type]}</span></span>`;

    // Custom game mode: show only enabled enemies
    if (game.customEnemies) {
        if (game.customEnemies.basic) enemyIconsHtml += getIcon('basic') + ' ';
        if (game.customEnemies.fast) enemyIconsHtml += getIcon('fast') + ' ';
        if (game.customEnemies.shooter) enemyIconsHtml += getIcon('shooter') + ' ';
        if (game.customEnemies.tank) enemyIconsHtml += getIcon('tank') + ' ';
        if (game.customEnemies.ice) enemyIconsHtml += getIcon('ice') + ' ';
        enemyIconsHtml = enemyIconsHtml.trim();
    } else {
        // Normal mode: show enemies based on wave progression
        enemyIconsHtml = getIcon('basic');

        if (wave >= 3) enemyIconsHtml += ' ' + getIcon('fast');
        if (wave >= 5) enemyIconsHtml += ' ' + getIcon('shooter');
        if (wave >= 7) enemyIconsHtml += ' ' + getIcon('tank');
        if (wave >= 8) enemyIconsHtml += ' ' + getIcon('ice');
    }

    dom.setText(dom.waveVal, `${game.wave}`);
    if (dom.waveIcons) dom.setHTML(dom.waveIcons, enemyIconsHtml);

    // Update status effects
    dom.setHTML(dom.statusEffects, '');

    // Ice slow effect
    if (game.player.slowEffects.length > 0) {
        const iceEffect = document.createElement('div');
        iceEffect.className = 'status-effect ice';
        iceEffect.textContent = `❄ ${game.player.slowEffects.length}`;
        iceEffect.title = `Slowed ${Math.round(game.player.slowEffects.reduce((sum, e) => sum + e.amount, 0) * 100)}%`;
        dom.statusEffects.appendChild(iceEffect);
    }

    // Passive Heal (Regen)
    const regenLevel = game.player.skills.regen || 0;
    if (regenLevel > 0) {
        const regenSkill = SKILLS.find(s => s.id === 'regen');
        const regenEffect = document.createElement('div');
        regenEffect.className = 'status-effect passive';
        regenEffect.innerHTML = `<div class="status-icon">${regenSkill.icon}</div><span class="status-level">${regenLevel}</span>`;
        regenEffect.title = `Passive Heal: ${game.player.healthRegen} HP per second`;
        dom.statusEffects.appendChild(regenEffect);
    }

    // Vampiric Touch
    const vampireLevel = game.player.skills.vampire || 0;
    if (vampireLevel > 0) {
        const vampireSkill = SKILLS.find(s => s.id === 'vampire');
        const vampireEffect = document.createElement('div');
        vampireEffect.className = 'status-effect passive';
        vampireEffect.innerHTML = `<div class="status-icon">${vampireSkill.icon}</div><span class="status-level">${vampireLevel}</span>`;
        vampireEffect.title = `Vampiric Touch: ${game.player.vampire} HP per kill`;
        dom.statusEffects.appendChild(vampireEffect);
    }

    // Armor
    const armorLevel = game.player.skills.armor || 0;
    if (armorLevel > 0) {
        const armorSkill = SKILLS.find(s => s.id === 'armor');
        const armorEffect = document.createElement('div');
        armorEffect.className = 'status-effect passive';
        armorEffect.innerHTML = `<div class="status-icon">${armorSkill.icon}</div><span class="status-level">${armorLevel}</span>`;
        armorEffect.title = `Armor: -${game.player.armor} damage reduction`;
        dom.statusEffects.appendChild(armorEffect);
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
            dom.statusEffects.appendChild(berserkEffect);
        }
    }

    // Update active skills
    dom.setHTML(dom.activeSkills, '');

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
        dom.activeSkills.appendChild(skillBadge);
    });
}
