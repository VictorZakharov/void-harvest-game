// ==================== META PROGRESSION SCREENS ====================
import { META_UPGRADES } from './skills.js';

export function showMetaUpgrades(game, dom) {
    // Stop screen shake when viewing upgrades
    game.camera.shake = 0;

    dom.setText(dom.currencyText, `${game.totalSouls}`);
    dom.setHTML(dom.metaUpgrades, '');

    // Check if any upgrades have been purchased
    let hasUpgrades = false;
    for (let upgrade of META_UPGRADES) {
        if ((game.metaProgress.upgrades[upgrade.id] || 0) > 0) {
            hasUpgrades = true;
            break;
        }
    }

    // Enable/disable reset button
    dom.resetMetaBtn.disabled = !hasUpgrades;
    dom.resetMetaBtn.style.opacity = hasUpgrades ? '1' : '0.5';
    dom.resetMetaBtn.style.cursor = hasUpgrades ? 'pointer' : 'not-allowed';

    META_UPGRADES.forEach(upgrade => {
        const currentLevel = game.metaProgress.upgrades[upgrade.id] || 0;
        const cost = upgrade.cost * (currentLevel + 1);
        const canAfford = game.totalSouls >= cost;
        const maxed = currentLevel >= upgrade.maxLevel;
        const progressPct = (currentLevel / upgrade.maxLevel) * 100;

        const div = document.createElement('div');
        div.className = 'meta-upgrade';
        if (maxed) div.classList.add('unlocked');
        else if (canAfford) div.classList.add('affordable');

        div.innerHTML = `
            <div class="meta-icon">${upgrade.icon}</div>
            <div class="meta-content">
                <h4>${upgrade.name}</h4>
                <p class="description">${upgrade.description}</p>
                
                <div class="meta-progress-container">
                    <div class="meta-row-spread">
                        <span class="meta-label">Level ${currentLevel}/${upgrade.maxLevel}</span>
                        ${!maxed ? `<span class="cost">${cost} Souls</span>` : '<span class="maxed">MAX</span>'}
                    </div>
                    <div class="meta-progress-track">
                        <div class="meta-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                </div>
            </div>
        `;

        if (!maxed && canAfford) {
            div.onclick = () => {
                game.totalSouls -= cost;
                game.metaProgress.upgrades[upgrade.id] = currentLevel + 1;
                game.metaProgress.souls = game.totalSouls;
                game.saveMetaProgress();
                showMetaUpgrades(game, dom);
            };
        }

        dom.metaUpgrades.appendChild(div);
    });

    dom.show(dom.metaModal);


}

export function showResetConfirmation(game, dom) {
    // Calculate total souls that will be refunded
    let soulsSpent = 0;
    for (let upgrade of META_UPGRADES) {
        const level = game.metaProgress.upgrades[upgrade.id] || 0;
        soulsSpent += upgrade.cost * level * (level + 1) / 2;
    }

    // Show refund amount in the modal
    dom.setText(dom.refundAmount, `You will receive ${soulsSpent} souls back`);

    // Show confirmation modal
    dom.show(dom.resetConfirmModal);
}

export function performMetaReset(game, dom) {
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
    showMetaUpgrades(game, dom);

    // Update main menu button if UI manager is available
    if (game.ui && game.ui.updateMainMenuSouls) {
        game.ui.updateMainMenuSouls();
    }
}
