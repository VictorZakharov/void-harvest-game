// ==================== INPUT HANDLER ====================
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

export class InputHandler {
    constructor(canvas) {
        this.keys = {};
        this.mouseDown = false;
        this.rightMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;

        // Manual Delta Tracking
        this.lastClientX = 0;
        this.lastClientY = 0;

        // Accumulators for per-frame processing
        this._accumDeltaX = 0;
        this._accumDeltaY = 0;

        this.escapePressed = false;
        this.spacePressed = false;

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === 'Escape') this.escapePressed = true;
            if (e.key === ' ') this.spacePressed = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouseDown = true;
            if (e.button === 2) this.rightMouseDown = true;

            // Reset last pos on click start to avoid large jump
            this.lastClientX = e.clientX;
            this.lastClientY = e.clientY;

            this.updateMousePosition(e, canvas);
        });

        // Use WINDOW for mouseup/move to handle dragging outside canvas
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseDown = false;
            if (e.button === 2) this.rightMouseDown = false;
        });

        canvas.addEventListener('contextmenu', e => e.preventDefault());

        window.addEventListener('mousemove', (e) => {
            // Only update canvas-relative pos if on canvas? 
            // Actually updateMousePosition relies on canvas rect. 
            // If mouse is outside, it will produce coords outside bounds. This is fine.
            this.updateMousePosition(e, canvas);

            // Calculate manual delta
            if (this.rightMouseDown) {
                const dx = e.clientX - this.lastClientX;
                const dy = e.clientY - this.lastClientY;
                this._accumDeltaX += dx;
                this._accumDeltaY += dy;
            }

            this.lastClientX = e.clientX;
            this.lastClientY = e.clientY;
        });

        // Only clear flag if leaving window? 
        // Or if leaving canvas?
        // If we track on window, we don't need mouseleave on canvas as much.
        // But let's keep it for safety if they switch apps.
        canvas.addEventListener('mouseleave', () => {
            // Actually, if we use window listeners, canvas mouseleave is bad because it stops dragging 
            // if you slip off the edge. 
            // So REMOVE mouseleave handler for button state clearing.
        });

        this.zoomDelta = 0;
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoomDelta += Math.sign(e.deltaY);
        });
    }

    updateMousePosition(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        this.mouseX = (e.clientX - rect.left) * scaleX;
        this.mouseY = (e.clientY - rect.top) * scaleY;
    }

    getDeltas() {
        // Return accumulated deltas and reset
        const dx = this._accumDeltaX;
        const dy = this._accumDeltaY;
        this._accumDeltaX = 0;
        this._accumDeltaY = 0;
        return { x: dx, y: dy };
    }

    getZoomDelta() {
        const z = this.zoomDelta;
        this.zoomDelta = 0;
        return z;
    }
}
