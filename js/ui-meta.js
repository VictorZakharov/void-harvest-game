// ==================== META PROGRESSION SCREENS ====================
import { META_UPGRADES } from './skills.js';

export function showMetaUpgrades(game) {
    // Stop screen shake when viewing upgrades
    game.camera.shake = 0;

    const modal = document.getElementById('meta-modal');
    const container = document.getElementById('meta-upgrades');
    const currencyText = document.getElementById('currency-text');

    currencyText.textContent = `Souls: ${game.totalSouls}`;
    container.innerHTML = '';

    // Check if any upgrades have been purchased
    let hasUpgrades = false;
    for (let upgrade of META_UPGRADES) {
        if ((game.metaProgress.upgrades[upgrade.id] || 0) > 0) {
            hasUpgrades = true;
            break;
        }
    }

    // Enable/disable reset button
    const resetBtn = document.getElementById('reset-meta-btn');
    resetBtn.disabled = !hasUpgrades;
    resetBtn.style.opacity = hasUpgrades ? '1' : '0.5';
    resetBtn.style.cursor = hasUpgrades ? 'pointer' : 'not-allowed';

    META_UPGRADES.forEach(upgrade => {
        const currentLevel = game.metaProgress.upgrades[upgrade.id] || 0;
        const cost = upgrade.cost * (currentLevel + 1);
        const canAfford = game.totalSouls >= cost;
        const maxed = currentLevel >= upgrade.maxLevel;

        const div = document.createElement('div');
        div.className = 'meta-upgrade';
        if (maxed) div.classList.add('unlocked');
        else if (canAfford) div.classList.add('affordable');

        div.innerHTML = `
            <div class="meta-icon">${upgrade.icon}</div>
            <h4>${upgrade.name}</h4>
            <p>${upgrade.description}</p>
            <p>Level: ${currentLevel}/${upgrade.maxLevel}</p>
            ${!maxed ? `<p class="cost">Cost: ${cost} souls</p>` : '<p style="color: #00ff00;">MAX</p>'}
        `;

        if (!maxed && canAfford) {
            div.onclick = () => {
                game.totalSouls -= cost;
                game.metaProgress.upgrades[upgrade.id] = currentLevel + 1;
                game.metaProgress.souls = game.totalSouls;
                game.saveMetaProgress();
                showMetaUpgrades(game);
            };
        }

        container.appendChild(div);
    });

    modal.classList.remove('hidden');

    // ==================== PARALLAX EFFECT ====================
    // Apply to the main container (.modal-content) like Main Menu
    const modalContent = modal.querySelector('.modal-content');

    // Init style
    modalContent.style.transition = 'transform 0.1s ease-out';
    modalContent.style.transformStyle = 'preserve-3d';

    let rafId = null;

    modal.onmousemove = (e) => {
        if (rafId) return;

        rafId = requestAnimationFrame(() => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            // Calculate normalized position from center of screen (-1 to 1)
            const cx = innerWidth / 2;
            const cy = innerHeight / 2;

            const nx = (clientX - cx) / cx;
            const ny = (clientY - cy) / cy;

            // Settings (Matches Main Menu)
            const maxTilt = 5;

            // Tilt Calculation
            const rx = -ny * maxTilt; // Rotate X (Up/Down tilt)
            const ry = nx * maxTilt;  // Rotate Y (Left/Right tilt)

            // Apply to Modal Content
            modalContent.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;

            rafId = null;
        });
    };
}

export function showResetConfirmation(game) {
    // Calculate total souls that will be refunded
    let soulsSpent = 0;
    for (let upgrade of META_UPGRADES) {
        const level = game.metaProgress.upgrades[upgrade.id] || 0;
        soulsSpent += upgrade.cost * level * (level + 1) / 2;
    }

    // Show refund amount in the modal
    document.getElementById('refund-amount').textContent = `You will receive ${soulsSpent} souls back`;

    // Show confirmation modal
    document.getElementById('reset-confirm-modal').classList.remove('hidden');
}

export function performMetaReset(game) {
    // Calculate total souls spent
    let soulsSpent = 0;
    for (let upgrade of META_UPGRADES) {
        const level = game.metaProgress.upgrades[upgrade.id] || 0;
        soulsSpent += upgrade.cost * level * (level + 1) / 2;
    }

    // Refund souls
    game.totalSouls += soulsSpent;
    game.metaProgress.souls = game.totalSouls;

    // Reset all upgrades to level 0
    game.metaProgress.upgrades = {};

    // Save and refresh
    game.saveMetaProgress();
    showMetaUpgrades(game);

    // Update main menu button if UI manager is available
    if (game.ui && game.ui.updateMainMenuSouls) {
        game.ui.updateMainMenuSouls();
    }
}
