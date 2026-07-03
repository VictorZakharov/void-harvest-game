// ==================== HUD UPDATES ====================
import { SKILLS } from './skills.js';

export function updateHUD(game, dom) {
    // Game Globals Update (Time, Wave, Kills, Souls)
    const seconds = Math.floor(game.gameTime / 60);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    dom.setText(dom.timeVal, `${minutes}:${secs.toString().padStart(2, '0')}`);

    dom.setText(dom.killsVal, `${game.kills}`);

    if (dom.soulsBankedText && dom.soulsRunText) {
        dom.setText(dom.soulsBankedText, `${game.totalSouls}`);
        const runBonus = game.getRunSouls ? game.getRunSouls() : Math.floor(game.kills / 5);
        const currentRunTotal = (game.runSouls || 0) + runBonus;
        dom.setText(dom.soulsRunText, `(+${currentRunTotal})`);
    }

    // Wave & Enemy Icons
    // Count active enemies by type
    const counts = { basic: 0, fast: 0, shooter: 0, tank: 0, ice: 0 };
    if (game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.isDying) continue; // corpses don't count as active
            if (counts[enemy.type] !== undefined) {
                counts[enemy.type]++;
            }
        }
    }

    const wave = game.wave;
    let enemyIconsHtml = '';
    const getIcon = (type) => `<span class="enemy-indicator ${type}"><span class="dot"></span><span class="count">${counts[type]}</span></span>`;

    if (game.customEnemies) {
        if (game.customEnemies.basic) enemyIconsHtml += getIcon('basic') + ' ';
        if (game.customEnemies.fast) enemyIconsHtml += getIcon('fast') + ' ';
        if (game.customEnemies.shooter) enemyIconsHtml += getIcon('shooter') + ' ';
        if (game.customEnemies.tank) enemyIconsHtml += getIcon('tank') + ' ';
        if (game.customEnemies.ice) enemyIconsHtml += getIcon('ice') + ' ';
        enemyIconsHtml = enemyIconsHtml.trim();
    } else {
        enemyIconsHtml = getIcon('basic');
        if (wave >= 3) enemyIconsHtml += ' ' + getIcon('fast');
        if (wave >= 5) enemyIconsHtml += ' ' + getIcon('shooter');
        if (wave >= 7) enemyIconsHtml += ' ' + getIcon('tank');
        if (wave >= 8) enemyIconsHtml += ' ' + getIcon('ice');
    }

    dom.setText(dom.waveVal, `${game.wave}`);
    if (dom.waveIcons) dom.setHTML(dom.waveIcons, enemyIconsHtml);

    // Update Player Panels
    // If game has 'players' array, use it. Otherwise fallback to 'player' property (single player legacy/compat)
    const p1 = game.players ? game.players[0] : game.player;
    const p2 = game.players ? game.players[1] : null;

    if (p1) updatePlayerStats(p1, game, dom, 'p1');

    // Toggle Multiplayer Class & P2 Panel
    if (game.isMultiplayer) {
        dom.addClass(dom.uiOverlay, 'multiplayer');
        dom.show(dom.p2Panel);
        // Only update P2 if it exists (it should in MP)
        if (p2) updatePlayerStats(p2, game, dom, 'p2');
    } else {
        dom.removeClass(dom.uiOverlay, 'multiplayer');
        dom.hide(dom.p2Panel);
    }
}

function updatePlayerStats(player, game, dom, prefix) {
    // Bled-out players read as inert: their whole panel greys out
    const panel = dom[prefix + 'Panel'];
    if (panel) {
        if (player.isBledOut) dom.addClass(panel, 'bled-out');
        else dom.removeClass(panel, 'bled-out');
    }

    const healthPercent = (player.health / player.maxHealth) * 100;
    const hpBar = dom[prefix + 'HealthBar'];
    const hpText = dom[prefix + 'HealthText'];

    if (hpBar) hpBar.style.width = healthPercent + '%';
    if (hpText) dom.setText(hpText, `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`);

    const xpPercent = (player.xp / player.xpToLevel) * 100;
    const xpBar = dom[prefix + 'XpBar'];
    const lvlText = dom[prefix + 'LevelText'];

    if (xpBar) xpBar.style.width = xpPercent + '%';
    if (lvlText) dom.setText(lvlText, `Lv ${player.level}`);

    // Dynamic Color Theming (UX Polish)
    // A single CSS variable drives label color, XP fill, level badge and glow
    // (see --player-color usage in styles/_hud.scss)
    if (player.color) {
        const panel = dom[prefix + 'Panel'];
        if (panel) {
            panel.style.setProperty('--player-color', player.color);
            const label = panel.querySelector('.panel-label');
            if (label) {
                label.style.color = player.color;
                label.style.textShadow = `0 0 10px ${player.color}`;
            }
        }
    }

    // Status Effects
    // Bled-out players are inert: no debuffs, no passives, nothing ticks
    const statusContainer = dom[prefix + 'StatusEffects'];
    if (statusContainer && player.isBledOut) {
        dom.setHTML(statusContainer, '');
    } else if (statusContainer) {
        let statusHtml = '';

        // Ice Slow
        if (player.slowEffects && player.slowEffects.length > 0) {
            const amount = Math.round(player.slowEffects.reduce((sum, e) => sum + e.amount, 0) * 100);
            statusHtml += `<div class="status-effect ice" title="Slowed ${amount}%">❄ ${player.slowEffects.length}</div>`;
        }

        // Skills that show as passives
        if (player.skills.regen > 0) {
            const skill = SKILLS.find(s => s.id === 'regen');
            statusHtml += createPassiveBadge(skill, player.skills.regen, `Passive Heal: ${player.healthRegen} HP/s`);
        }
        if (player.skills.armor > 0) {
            const skill = SKILLS.find(s => s.id === 'armor');
            statusHtml += createPassiveBadge(skill, player.skills.armor, `Armor: -${player.armor} dmg red.`);
        }

        // Revive Progress (Downed State) — revive is 2P-only; in SP the
        // death sequence handles it, so no countdown badge
        if (player.isDowned && player.canBeRevived) {
            // Same second definition as the top clock (60 game units,
            // see game.gameTime) so both timers tick at one speed
            const timeLeft = Math.max(0, Math.ceil(player.downedTimer / 60));
            statusHtml += `<div class="status-effect" style="border-color: #ff0000; color: #ff0000; background: rgba(50,0,0,0.8);">DOWNED (${timeLeft}s)</div>`;
        }

        dom.setHTML(statusContainer, statusHtml);
    }

    // Active Skills
    const skillsContainer = dom[prefix + 'ActiveSkills'];
    if (skillsContainer) {
        dom.setHTML(skillsContainer, '');

        const customSkills = [];
        const earnedSkills = [];

        for (let skillId in player.skills) {
            const level = player.skills[skillId];
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

        // Render
        [...earnedSkills, ...customSkills].forEach(({ skillId, level, skillDef }) => {
            const badge = document.createElement('div');
            const isCustom = game.customSkillIds && game.customSkillIds.has(skillId);
            const cat = skillDef.category || 'defensive';

            badge.className = isCustom ? `active-skill custom-skill ${cat}` : `active-skill ${cat}`;

            // DYNAMIC COLOR OVERRIDE
            if (player.color) {
                // Determine contrast for text/icon (basic check)
                // Use white icon with colored background for visibility.
                // The CSS sets border color and background tint.
                // Apply player color to skill badge.

                // Need to hex to RGB for background opacity
                // Helper to convert hex to rgba
                const hexToRgba = (hex, alpha) => {
                    let r = 0, g = 0, b = 0;
                    if (hex.length === 7) {
                        r = parseInt(hex.substr(1, 2), 16);
                        g = parseInt(hex.substr(3, 2), 16);
                        b = parseInt(hex.substr(5, 2), 16);
                    }
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };

                // Override styles (using !important logic or direct style)
                badge.style.borderColor = player.color;
                badge.style.background = hexToRgba(player.color, 0.25);
                badge.style.color = player.color; // Text/Icon color
            }

            badge.innerHTML = `<div class="skill-icon" ${player.color ? `style="color: ${player.color}"` : ''}>${skillDef.icon}<div class="active-skill-level">${level}</div></div>`;
            badge.title = `${skillDef.name} (Lv ${level})`;
            skillsContainer.appendChild(badge);
        });
    }
}

function createPassiveBadge(skill, level, title) {
    return `<div class="status-effect passive" title="${title}">
        <div class="status-icon">${skill.icon}</div>
        <span class="status-level">${level}</span>
    </div>`;
}

