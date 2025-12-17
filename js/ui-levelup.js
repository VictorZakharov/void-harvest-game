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

    // Add Parallax Effect
    let cardRects = [];
    let rafId = null;

    // Init rects after layout stabilises
    setTimeout(() => {
        const cards = choicesContainer.children;
        cardRects = Array.from(cards).map(card => {
            const rect = card.getBoundingClientRect();
            return {
                card: card,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            };
        });
    }, 50);

    modal.onmousemove = (e) => {
        if (rafId) return;

        rafId = requestAnimationFrame(() => {
            // Safety check if rects are missing
            if (cardRects.length === 0 && choicesContainer.children.length > 0) {
                const cards = choicesContainer.children;
                cardRects = Array.from(cards).map(card => {
                    const rect = card.getBoundingClientRect();
                    return {
                        card: card,
                        centerX: rect.left + rect.width / 2,
                        centerY: rect.top + rect.height / 2
                    };
                });
            }

            for (let item of cardRects) {
                const { card, centerX, centerY } = item;

                const mouseX = e.clientX - centerX;
                const mouseY = e.clientY - centerY;

                // Sensitivity reduced to 60% (Divisor 35)
                const rotateY = (mouseX / 35).toFixed(2);
                const rotateX = (-mouseY / 35).toFixed(2);

                const isHovered = card.matches(':hover');
                const scale = 0.90; // Reduced to 90% per user request
                const translateZ = '0px';

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale}) translateZ(${translateZ})`;
            }
            rafId = null;
        });
    };

    // Reset on mouse leave or when closing? 
    // Not strictly necessary as modal closes/reopens freshly

    modal.classList.remove('hidden');
}
