// ==================== INPUT HANDLER ====================
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

export class InputHandler {
    constructor(canvas) {
        this.keys = {};
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;

        this.escapePressed = false;
        this.spacePressed = false;

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            // Handle ESC separately for pause
            if (e.key === 'Escape') {
                this.escapePressed = true;
            }
            // Handle Space for pause
            if (e.key === ' ') {
                this.spacePressed = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.updateMousePosition(e, canvas);
        });

        canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e, canvas);
        });

        canvas.addEventListener('mouseleave', () => {
            this.mouseDown = false;
        });
    }

    updateMousePosition(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        this.mouseX = (e.clientX - rect.left) * scaleX;
        this.mouseY = (e.clientY - rect.top) * scaleY;
    }
}
