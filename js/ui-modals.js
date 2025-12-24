// ==================== MODAL SCREENS ====================
import { SKILLS } from './skills.js';
import { getGuideHTML } from './ui-templates.js';



export function showGuide(dom) {
    dom.hide(dom.startScreen);

    dom.setHTML(dom.guideContent, getGuideHTML());

    dom.show(dom.guideModal);

    // Scroll to top when opening guide
    const modalContent = dom.guideModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}
