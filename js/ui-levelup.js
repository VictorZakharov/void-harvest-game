// ==================== LEVEL UP SCREEN ====================
import { SKILLS } from './skills.js';
import { SKILL_CHOICES_BASE, SKILL_CHOICES_WITH_EXTRA } from './constants.js';

export function showLevelUpScreen(game, dom, player, onComplete) {
    game.state = 'paused';
    if (game.weather) game.weather.hideWarning();

    // State for this level-up instance
    let rerollUsed = false;
    let isAnimating = false;

    // Theme the Modal
    const modalContent = dom.levelupModal.querySelector('.modal-content');
    const color = player.color || '#44ccff'; // Default to Cyan if missing

    if (modalContent) {
        modalContent.style.border = `2px solid ${color}`;
        modalContent.style.boxShadow = `0 0 30px ${color}60`; // Semi-transparent glow
    }

    // Update Header
    const header = dom.levelupModal.querySelector('h2');
    if (game.isMultiplayer) {
        const pName = player.id === 0 ? "PLAYER 1" : "PLAYER 2";
        header.innerHTML = `<span style="color: ${color}; text-shadow: 0 0 10px ${color}">${pName}</span> LEVEL UP!`;
    } else {
        header.innerHTML = `<span style="color: ${color}; text-shadow: 0 0 10px ${color}">LEVEL UP!</span>`;
    }

    // Helper: Select Skills
    // excludeIds: Set of skill IDs to exclude (used for reroll)
    const selectSkills = (excludeIds = new Set()) => {
        // Determine number of choices
        const numChoices = player.extraChoice ? SKILL_CHOICES_WITH_EXTRA : SKILL_CHOICES_BASE;

        // Filter available skills
        let available = SKILLS.filter(skill => {
            // P2 cannot get Light Radius
            if (player.id === 1 && skill.id === 'light') return false; // ID is 'light' not 'light_radius'

            // Check Allowed ID
            if (skill.allowedPlayerId !== undefined && skill.allowedPlayerId !== player.id) return false;

            const currentLevel = player.skills[skill.id] || 0;
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
                if (player.id === 1 && skill.id === 'light') return false;
                if (skill.allowedPlayerId !== undefined && skill.allowedPlayerId !== player.id) return false;
                const currentLevel = player.skills[skill.id] || 0;
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

    // [DELETED] Cleanup previous reroll button logic (handled by static HTML now)

    // Render Function
    const render = (skills) => {
        dom.setHTML(dom.skillChoices, '');

        skills.forEach(skill => {
            const currentLevel = player.skills[skill.id] || 0;
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
                if (isAnimating) return; // Block picks during reroll/card cinematic
                isAnimating = true;
                skill.apply(player); // Apply to SPECIFIC player
                // Game stats might need to track who picked what? For now global stats.
                game.stats.skillsPicked.push({ level: player.level, skill: skill.name });
                if (game.customSkillIds && game.customSkillIds.has(skill.id)) {
                    game.customSkillIds.delete(skill.id);
                }
                game.ui.updateHUD(); // Update HUD (handles both P1/P2)
                if (game.updateGlobalLights) game.updateGlobalLights();

                // Card pick cinematic: chosen card flies to center then into
                // the player's skill HUD; onComplete fires as it descends
                if (game.skillCardEffect) {
                    game.skillCardEffect.play(div, player, onComplete);
                } else {
                    onComplete();
                }

                // [DELETED] Cleanup Reroll Button logic

                // game.setFrozen(true); // Handled by UIManager logic (resuming or next)
            };
            dom.skillChoices.appendChild(div);
        });

        // Reroll Button Logic
        const rerollBtn = dom.rerollBtn;
        if (rerollBtn) {
            // Theme the button
            const color = player.color || '#44ccff';
            rerollBtn.style.border = `2px solid ${color}`;
            rerollBtn.style.color = color;
            rerollBtn.style.boxShadow = `0 0 10px ${color}40`;
            // Add hover effect logic possibly via CSS or generic class, but inline style works for now

            rerollBtn.textContent = rerollUsed ? 'Reroll Used' : 'Reroll';
            rerollBtn.disabled = rerollUsed;

            rerollBtn.onclick = () => {
                if (rerollUsed || isAnimating) return;
                rerollUsed = true;
                isAnimating = true;

                // Phase 1: Rotate Out (0 -> 90deg)
                const oldCards = Array.from(dom.skillChoices.children);
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
                    const newCards = Array.from(dom.skillChoices.children);
                    newCards.forEach(card => {
                        // Set initial state: rotated -90deg (the "back" of the flip)
                        // We must disable transition momentarily to set this position instantly
                        card.style.transition = 'none';
                        card.style.transform = 'skewY(0deg) rotateY(-90deg)';
                    });

                    // Force Reflow
                    void dom.skillChoices.offsetWidth;

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
        } // End rerollBtn check

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
            const cards = dom.skillChoices.children;
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

    dom.levelupModal.onmousemove = (e) => {
        lastMousePos.x = e.clientX;
        lastMousePos.y = e.clientY;

        if (rafId || isAnimating) return; // Block parallax during animation

        rafId = requestAnimationFrame(() => {
            if (cardRects.length === 0 && dom.skillChoices.children.length > 0) {
                updateParallaxRects(); // Safety init
            }

            updateCardsTransforms(e.clientX, e.clientY);
            rafId = null;
        });
    };

    // Initial Render
    const initialSkills = selectSkills();
    render(initialSkills);

    dom.show(dom.levelupModal);
}
