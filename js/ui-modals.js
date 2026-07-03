// ==================== MODAL SCREENS ====================
import { SKILLS } from './skills.js';
import { getGuideHTML } from './ui-templates.js';
import { UI3DRenderer } from './ui/UI3DRenderer.js';

// Shared 3D portrait renderer for the enemy cards (same models as the
// custom game config). Data URLs are cached so reopening the guide
// doesn't re-render the scenes.
let guideRenderer3D = null;
const guideModelCache = {};

export function showGuide(dom) {
    dom.hide(dom.startScreen);

    dom.setHTML(dom.guideContent, getGuideHTML());

    // Fill in the enemy model portraits
    dom.guideContent.querySelectorAll('img[data-enemy-model]').forEach(img => {
        const type = img.dataset.enemyModel;
        if (!guideModelCache[type]) {
            if (!guideRenderer3D) guideRenderer3D = new UI3DRenderer(192);
            guideModelCache[type] = guideRenderer3D.renderEnemyToDataUrl(type);
        }
        img.src = guideModelCache[type];
    });

    dom.show(dom.guideModal);

    // Scroll to top when opening guide
    const modalContent = dom.guideModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}
