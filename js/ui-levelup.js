// ==================== LEVEL UP SCREEN ====================
import { SKILLS } from './skills.js';
import { SKILL_CHOICES_BASE, SKILL_CHOICES_WITH_EXTRA } from './constants.js';

export function showLevelUpScreen(game) {
    game.state = 'paused';

    // Determine number of choices (3 by default, 4 if player has Extra Choice)
    const numChoices = game.player.extraChoice ? SKILL_CHOICES_WITH_EXTRA : SKILL_CHOICES_BASE;

    // Filter out skills that have reached max level
    const available = SKILLS.filter(skill => {
        const currentLevel = game.player.skills[skill.id] || 0;
        return currentLevel < (skill.maxLevel || Infinity);
    });

    // Choose random skills
    const choices = [];
    const tempAvailable = [...available];
    for (let i = 0; i < numChoices; i++) {
        if (tempAvailable.length === 0) break;
        const index = Math.floor(Math.random() * tempAvailable.length);
        choices.push(tempAvailable.splice(index, 1)[0]);
    }

    // Display choices
    const modal = document.getElementById('levelup-modal');
    const choicesContainer = document.getElementById('skill-choices');
    choicesContainer.innerHTML = '';

    choices.forEach(skill => {
        const currentLevel = game.player.skills[skill.id] || 0;
        const nextLevel = currentLevel + 1;

        // Build description based on skill
        const space = skill.unit === '%' ? '' : ' ';
        let description = `+${skill.baseValue}${space}${skill.unit}`;
        if (skill.unit === 'projectile') {
            // Projectile count includes base of 1
            const currentValue = 1 + (currentLevel * skill.baseValue);
            const nextValue = 1 + (nextLevel * skill.baseValue);
            description = currentLevel > 0
                ? `${currentValue} → <span style="color: #00ff00; font-weight: bold;">${nextValue}</span> ${skill.unit}s`
                : `<span style="color: #00ff00; font-weight: bold;">+${skill.baseValue}</span> ${skill.unit}`;
        } else if (skill.unit === 'pierce') {
            // Pierce shows just the count (no base)
            const currentValue = currentLevel * skill.baseValue;
            const nextValue = nextLevel * skill.baseValue;
            description = currentLevel > 0
                ? `${currentValue} → <span style="color: #00ff00; font-weight: bold;">${nextValue}</span> ${skill.unit}`
                : `<span style="color: #00ff00; font-weight: bold;">+${skill.baseValue}</span> ${skill.unit}`;
        } else if (currentLevel > 0) {
            // For percentages and other stats
            const currentValue = currentLevel * skill.baseValue;
            const nextValue = nextLevel * skill.baseValue;
            description = `${currentValue}${space}${skill.unit} → <span style="color: #00ff00; font-weight: bold;">${nextValue}${space}${skill.unit}</span>`;
        }

        const div = document.createElement('div');
        div.className = 'skill-option';
        div.innerHTML = `
            <div class="skill-icon">
                ${skill.icon}
                ${currentLevel > 0 ? `<div class="skill-level">${currentLevel}</div>` : ''}
            </div>
            <div class="skill-info">
                <h3>${skill.name}</h3>
                <p>${description}</p>
            </div>
        `;
        div.onclick = () => {
            skill.apply(game.player);
            // Track skill selection
            game.stats.skillsPicked.push({
                level: game.player.level,
                skill: skill.name
            });
            // Remove from custom skills set when upgraded during run
            if (game.customSkillIds && game.customSkillIds.has(skill.id)) {
                game.customSkillIds.delete(skill.id);
            }
            // Update HUD immediately to show new skill
            game.ui.updateHUD();

            // Sync global lights (cursors etc)
            if (game.updateGlobalLights) game.updateGlobalLights();

            modal.classList.add('hidden');

            // Freeze game to give player a breather
            game.setFrozen(true);
        };
        choicesContainer.appendChild(div);
    });

    modal.classList.remove('hidden');
}
