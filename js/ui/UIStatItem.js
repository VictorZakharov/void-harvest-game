import { ICONS, SKILLS } from '../skills.js';
import { formatVal } from './UIUtils.js';

/**
 * Component for rendering a single stat item with a detailed fancy tooltip.
 */
export class UIStatItem {
    /**
     * Renders a stat item HTML string.
     * @param {Object} game - The game instance.
     * @param {string} label - Display label (e.g., "Health").
     * @param {number|string} base - Base value.
     * @param {number|string} bonus - Bonus value.
     * @param {number|string} total - Total value.
     * @param {string} skillId - Associated skill ID for icon/pips.
     * @param {string} desc - Tooltip description.
     * @param {Object} opts - Rendering options.
     * @returns {string} HTML string.
     */
    static render(game, label, base, bonus, total, skillId, desc, opts = {}) {
        const {
            direction = 'top',
            showMath = true,
            baseLabel = 'Base Value',
            bonusLabel = 'Bonus',
            totalLabel = 'Total'
        } = opts;

        const dBase = formatVal(base);
        const dBonus = formatVal(bonus);
        const dTotal = formatVal(total);

        // Main display value
        let displayHtml = `<span class="stat-value">${dBase}</span>`;
        if (dBonus) {
            displayHtml += ` <span class="stat-bonus">+${dBonus}</span>`;
        } else if (typeof dTotal === 'string' && dTotal.includes(':')) {
            displayHtml = `<span class="stat-value">${dTotal}</span>`;
        }

        // Icon & Pips Logic
        let iconHtml = '';
        let pipsHtml = '';

        if (skillId && ICONS[skillId]) {
            const skillLevel = (game.player.skills && game.player.skills[skillId]) || 0;
            const skillDef = SKILLS.find(s => s.id === skillId);
            const maxLevel = skillDef ? skillDef.maxLevel : 5;

            if (skillLevel > 0) {
                for (let i = 0; i < maxLevel; i++) {
                    const isFilled = i < skillLevel;
                    const bg = isFilled ? '#00ffff' : 'rgba(255,255,255,0.2)';
                    const shadow = isFilled ? 'box-shadow: 0 0 4px rgba(0,255,255,0.6);' : '';
                    pipsHtml += `<div style="width:5px; height:5px; border-radius:50%; background:${bg}; ${shadow}"></div>`;
                }
                pipsHtml = `<div style="display:flex; gap:3px; margin-left:8px;">${pipsHtml}</div>`;
            }

            const isActive = skillLevel > 0;
            const boxStyle = isActive
                ? 'border:1px solid rgba(0,255,255,0.4); background:rgba(0,255,255,0.1); box-shadow:0 0 8px rgba(0,255,255,0.2);'
                : 'border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); filter:grayscale(1); opacity:0.5;';
            const iconColor = isActive ? '#00ffff' : '#ffffff';

            iconHtml = `
                <div style="width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; ${boxStyle}">
                    <span style="display:block; width:20px; height:20px; color:${iconColor};">
                        ${ICONS[skillId]}
                    </span>
                </div>
            `;
        }

        // Tooltip Content
        let tooltipContent = `<div class="tooltip-desc" style="margin-bottom:8px">${desc}</div>`;
        if (showMath && dTotal !== null && dTotal !== undefined) {
            tooltipContent += `
                <div class="tooltip-divider"></div>
                <div class="tooltip-row">
                    <span>${baseLabel}:</span>
                    <span style="color:#fff">${dBase}</span>
                </div>
                <div class="tooltip-row">
                    <span>${bonusLabel}:</span>
                    <span style="color:#00ff00">${dBonus ? '+' + dBonus : '0'}</span>
                </div>
                <div class="tooltip-row total-row">
                    <span>${totalLabel}:</span>
                    <span class="stat-total">${dTotal}</span>
                </div>
            `;
        }

        const title = label === 'Atk Spd' ? 'Attack Speed' : label;
        const tooltipClass = direction === 'bottom' ? 'stat-tooltip fancy-tooltip tooltip-bottom' : 'stat-tooltip fancy-tooltip';

        return `
        <div class="stat-item tooltip-container">
            <span class="stat-label">${label}</span>
            <div class="stat-val-wrapper">${displayHtml}</div>
            <div class="${tooltipClass}">
                <div class="tooltip-header" style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center;">
                        <span class="tooltip-title" style="margin:0">${title}</span>
                        ${pipsHtml}
                    </div>
                    ${iconHtml}
                </div>
                <div class="tooltip-content">
                    ${tooltipContent}
                </div>
            </div>
        </div>
        `;
    }
}
