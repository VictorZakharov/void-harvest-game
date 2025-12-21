import * as THREE from 'three';

/**
 * Manages the Three.js rendering pipeline, including scene setup, 
 * camera control, and the render loop.
 */
export class RenderingManager {
    /**
     * @param {HTMLCanvasElement} canvas - The canvas to render onto.
     * @param {number} canvasWidth - Logical width of the game area.
     * @param {number} canvasHeight - Logical height of the game area.
     */
    constructor(canvas, canvasWidth, canvasHeight) {
        this.canvas = canvas;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.scene = new THREE.Scene();
        this.camera3D = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // Camera Orbital State
        this.camYaw = 0;
        this.camPitch = Math.PI / 4;
        this.camDist = 1000;

        this.init();
    }

    /**
     * Initializes the Three.js renderer and camera.
     */
    init() {
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0);

        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera3D = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Handles canvas resizing and updates camera aspect ratio.
     */
    onResize() {
        if (!this.canvas) return;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (this.camera3D) {
            this.camera3D.aspect = width / height;
            this.camera3D.updateProjectionMatrix();
        }
        if (this.renderer) {
            this.renderer.setSize(width, height, false);
        }
    }

    /**
     * Projects a 2D screen coordinate into a 3D world position on the ground plane.
     * @param {number} mouseX - Screen X coordinate.
     * @param {number} mouseY - Screen Y coordinate.
     * @returns {THREE.Vector3} The 3D world position.
     */
    getMouseWorldPosition(mouseX, mouseY) {
        const ndcX = (mouseX / this.canvasWidth) * 2 - 1;
        const ndcY = -(mouseY / this.canvasHeight) * 2 + 1;
        this.mouse.set(ndcX, ndcY);

        this.raycaster.setFromCamera(this.mouse, this.camera3D);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.groundPlane, target);
        return target;
    }

    /**
     * Updates camera position and rotation based on player movement and input.
     * @param {Object} player - The player entity.
     * @param {Object} input - The input handler.
     */
    updateCamera(player, input) {
        if (!player) return;

        // Handle Camera Rotation
        if (input.rightMouseDown) {
            const deltas = input.getDeltas();
            const sensitivity = 0.01;
            this.camYaw -= deltas.x * sensitivity;
            this.camPitch -= deltas.y * sensitivity;

            const minPitch = 0.5;
            const maxPitch = Math.PI / 2 - 0.1;
            this.camPitch = Math.max(minPitch, Math.min(maxPitch, this.camPitch));
        } else {
            input.getDeltas();
        }

        // Handle Camera Zoom
        const zoomDelta = input.getZoomDelta();
        if (zoomDelta !== 0) {
            const zoomSpeed = 50;
            this.camDist += zoomDelta * zoomSpeed;
            this.camDist = Math.max(400, Math.min(1500, this.camDist));
        }

        const hRadius = this.camDist * Math.cos(this.camPitch);
        const camY = this.camDist * Math.sin(this.camPitch);
        const camX = player.x + hRadius * Math.sin(this.camYaw);
        const camZ = player.y + hRadius * Math.cos(this.camYaw);

        this.camera3D.position.set(camX, camY, camZ);
        this.camera3D.lookAt(player.x + player.width / 2, 10, player.y + player.height / 2);
    }

    /**
     * Applies a shake offset to the camera position.
     * @param {number} amount - Intensity of the shake.
     * @param {string} state - Current game state.
     */
    applyShake(amount, state) {
        if (amount > 0 && state !== 'gameover') {
            this.camera3D.position.x += (Math.random() - 0.5) * amount * 2;
            this.camera3D.position.z += (Math.random() - 0.5) * amount * 2;
        }
    }

    /**
     * Adjusts fog density based on camera height to maintain visual clarity.
     * @param {number} baseFogDensity - The configured fog density for the current biome.
     * @param {number} baseCameraHeight - Reference camera height.
     * @param {number} defaultFogDensity - Fallback fog density.
     */
    updateFog(baseFogDensity, baseCameraHeight, defaultFogDensity) {
        if (this.scene.fog) {
            const currentHeight = this.camera3D.position.y;
            const height = Math.max(100, currentHeight);
            const scale = baseCameraHeight / height;
            const base = (typeof baseFogDensity !== 'undefined') ? baseFogDensity : defaultFogDensity;
            this.scene.fog.density = base * scale;
        }
    }

    /**
     * Renders the current frame.
     */
    render() {
        this.renderer.render(this.scene, this.camera3D);
    }
}
