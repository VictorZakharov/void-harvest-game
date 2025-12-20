// ==================== LEVEL UP SCREEN ====================
import { SKILLS } from './skills.js';
import { SKILL_CHOICES_BASE, SKILL_CHOICES_WITH_EXTRA } from './constants.js';

export function showLevelUpScreen(game) {
    game.state = 'paused';

    // State for this level-up instance
    let rerollUsed = false;
    let isAnimating = false;

    // Helper: Select Skills
    // excludeIds: Set of skill IDs to exclude (used for reroll)
    const selectSkills = (excludeIds = new Set()) => {
        // Determine number of choices
        const numChoices = game.player.extraChoice ? SKILL_CHOICES_WITH_EXTRA : SKILL_CHOICES_BASE;

        // Filter available skills
        let available = SKILLS.filter(skill => {
            const currentLevel = game.player.skills[skill.id] || 0;
            // Check max level
            if (currentLevel >= (skill.maxLevel || Infinity)) return false;
            // Check exclusions
            if (excludeIds.has(skill.id)) return false;
            return true;
        });

        // Fallback: If not enough unique choices, try again without exclusions
        // This ensures the player always gets options even if their pool is small
        if (available.length < numChoices && excludeIds.size > 0) {
            available = SKILLS.filter(skill => {
                const currentLevel = game.player.skills[skill.id] || 0;
                return currentLevel < (skill.maxLevel || Infinity);
            });
        }

        // Random Selection
        const choices = [];
        const tempAvailable = [...available];
        for (let i = 0; i < numChoices; i++) {
            if (tempAvailable.length === 0) break;
            const index = Math.floor(Math.random() * tempAvailable.length);
            choices.push(tempAvailable.splice(index, 1)[0]);
        }
        return choices;
    };

    const modal = document.getElementById('levelup-modal');
    const choicesContainer = document.getElementById('skill-choices');
    const modalContent = modal.querySelector('.modal-content');

    // Cleanup previous reroll button if it exists
    const existingBtn = document.getElementById('reroll-btn');
    if (existingBtn) existingBtn.remove();

    // Render Function
    const render = (skills) => {
        choicesContainer.innerHTML = '';

        skills.forEach(skill => {
            const currentLevel = game.player.skills[skill.id] || 0;
            const nextLevel = currentLevel + 1;

            // Build description
            const space = skill.unit === '%' ? '' : ' ';
            let description = `+${skill.baseValue}${space}${skill.unit}`;

            if (skill.unit === 'projectile') {
                const currentValue = 1 + (currentLevel * skill.baseValue);
                const nextValue = 1 + (nextLevel * skill.baseValue);
                description = currentLevel > 0
                    ? `${currentValue} → <span style="color: #00ff00; font-weight: bold;">${nextValue}</span> ${skill.unit}s`
                    : `<span style="color: #00ff00; font-weight: bold;">+${skill.baseValue}</span> ${skill.unit}`;
            } else if (skill.unit === 'pierce') {
                const currentValue = currentLevel * skill.baseValue;
                const nextValue = nextLevel * skill.baseValue;
                description = currentLevel > 0
                    ? `${currentValue} → <span style="color: #00ff00; font-weight: bold;">${nextValue}</span> ${skill.unit}`
                    : `<span style="color: #00ff00; font-weight: bold;">+${skill.baseValue}</span> ${skill.unit}`;
            } else if (currentLevel > 0) {
                const currentValue = currentLevel * skill.baseValue;
                const nextValue = nextLevel * skill.baseValue;
                description = `${currentValue}${space}${skill.unit} → <span style="color: #00ff00; font-weight: bold;">${nextValue}${space}${skill.unit}</span>`;
            }

            const div = document.createElement('div');
            div.className = `skill-option ${skill.category || 'defensive'}`;
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
                game.stats.skillsPicked.push({ level: game.player.level, skill: skill.name });
                if (game.customSkillIds && game.customSkillIds.has(skill.id)) {
                    game.customSkillIds.delete(skill.id);
                }
                game.ui.updateHUD();
                if (game.updateGlobalLights) game.updateGlobalLights();

                modal.classList.add('hidden');

                // Cleanup Reroll Button
                const btn = document.getElementById('reroll-btn');
                if (btn) btn.remove();

                game.setFrozen(true);
            };
            choicesContainer.appendChild(div);
        });

        // Reroll Button Logic
        let rerollBtn = document.getElementById('reroll-btn');
        if (!rerollBtn) {
            rerollBtn = document.createElement('button');
            rerollBtn.id = 'reroll-btn';
            // Use standard .btn style (blue/cyan theme) instead of custom .btn-reroll
            rerollBtn.className = 'btn btn-large';
            rerollBtn.style.marginTop = '20px'; // Add spacing manually since we removed custom CSS
            rerollBtn.style.display = 'block';
            rerollBtn.style.marginLeft = 'auto';
            rerollBtn.style.marginRight = 'auto';
            modalContent.appendChild(rerollBtn);
        }

        rerollBtn.textContent = rerollUsed ? 'Reroll Used' : 'Reroll';
        rerollBtn.disabled = rerollUsed;

        rerollBtn.onclick = () => {
            if (rerollUsed || isAnimating) return;
            rerollUsed = true;
            isAnimating = true;

            // Phase 1: Rotate Out (0 -> 90deg)
            const oldCards = Array.from(choicesContainer.children);
            oldCards.forEach(card => {
                card.classList.add('flip-out');
                card.style.transform = 'skewY(0deg) rotateY(90deg)'; // Rotate to edge
            });

            // Wait for rotation to finish (400ms matches CSS)
            setTimeout(() => {
                // Reroll Logic - Get new skills
                const excludeIds = new Set(skills.map(s => s.id));
                const newSkills = selectSkills(excludeIds);

                // render() destroys old DOM nodes and creates new ones
                render(newSkills);

                // Phase 2: Rotate In (-90deg -> 0)
                const newCards = Array.from(choicesContainer.children);
                newCards.forEach(card => {
                    // Set initial state: rotated -90deg (the "back" of the flip)
                    // We must disable transition momentarily to set this position instantly
                    card.style.transition = 'none';
                    card.style.transform = 'skewY(0deg) rotateY(-90deg)';
                });

                // Force Reflow
                void choicesContainer.offsetWidth;

                // Animate to 0
                newCards.forEach(card => {
                    // Re-enable transition using our CSS class
                    card.style.transition = '';
                    card.classList.add('flip-in');

                    // Trigger the animation
                    card.style.transform = 'skewY(0deg) rotateY(0deg)';
                });

                // cleanup after Phase 2 (400ms)
                setTimeout(() => {
                    newCards.forEach(card => {
                        card.classList.remove('flip-in');
                        // Reset transform to be clean for parallax
                        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(0.90) translateZ(0px)';
                    });

                    isAnimating = false;

                    if (lastMousePos.x !== null) {
                        updateCardsTransforms(lastMousePos.x, lastMousePos.y);
                    }
                }, 400);

            }, 400);
        };

        // Parallax Update
        updateParallaxRects();
    };

    // Parallax Effect Logic
    let cardRects = [];
    let rafId = null;
    let lastMousePos = { x: null, y: null }; // Track last mouse position

    const updateCardsTransforms = (x, y) => {
        if (cardRects.length === 0) return;

        for (let item of cardRects) {
            const { card, centerX, centerY } = item;
            const mouseX = x - centerX;
            const mouseY = y - centerY;
            const rotateY = (mouseX / 35).toFixed(2);
            const rotateX = (-mouseY / 35).toFixed(2);

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(0.90) translateZ(0px)`;
        }
    };

    const updateParallaxRects = () => {
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

            // Immediately apply transform if we have mouse position
            if (lastMousePos.x !== null && lastMousePos.y !== null) {
                updateCardsTransforms(lastMousePos.x, lastMousePos.y);
            }
        }, 50);
    };

    modal.onmousemove = (e) => {
        lastMousePos.x = e.clientX;
        lastMousePos.y = e.clientY;

        if (rafId || isAnimating) return; // Block parallax during animation

        rafId = requestAnimationFrame(() => {
            if (cardRects.length === 0 && choicesContainer.children.length > 0) {
                updateParallaxRects(); // Safety init
            }

            updateCardsTransforms(e.clientX, e.clientY);
            rafId = null;
        });
    };

    // Initial Render
    const initialSkills = selectSkills();
    render(initialSkills);

    modal.classList.remove('hidden');
}
