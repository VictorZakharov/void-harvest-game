import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Cinematic finishing pass: smooth radial vignette.
 * Applied after bloom, before the output (tone mapping / color space) pass.
 */
const CinematicShader = {
    uniforms: {
        tDiffuse: { value: null },
        vignetteDarkness: { value: 0.85 },
        vignetteOffset: { value: 1.15 }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float vignetteDarkness;
        uniform float vignetteOffset;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);

            // Vignette (smooth radial falloff toward corners)
            vec2 uv = (vUv - 0.5) * 2.0;
            float vignette = smoothstep(vignetteOffset + 0.5, vignetteOffset - 0.6, length(uv));
            color.rgb *= mix(1.0 - vignetteDarkness, 1.0, vignette);

            gl_FragColor = color;
        }
    `
};

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
        this.composer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // Camera Orbital State
        this.camYaw = 0;
        this.camPitch = Math.PI / 4;
        this.camDist = 500; // Started 2x closer (was 1000)

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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;

        this.initPostProcessing();

        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Builds the post-processing chain: scene render -> bloom -> vignette/grain -> output.
     * Bloom only picks up HDR emissives (toneMapped:false materials) and hot light spots.
     */
    initPostProcessing() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.composer.setSize(width, height);

        this.composer.addPass(new RenderPass(this.scene, this.camera3D));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.55,   // strength: noticeable neon glow without washing out
            0.6,    // radius: soft halo spread
            0.85    // threshold: only genuinely bright pixels bloom
        );
        this.composer.addPass(this.bloomPass);

        this.cinematicPass = new ShaderPass(CinematicShader);
        this.composer.addPass(this.cinematicPass);

        this.composer.addPass(new OutputPass());
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
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        if (this.bloomPass) {
            this.bloomPass.resolution.set(width, height);
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
     * Updates camera position and rotation based on target position and input.
     * @param {number} targetX - The target center X.
     * @param {number} targetZ - The target center Z (Y in 2D).
     * @param {Object} input - The input handler.
     */
    updateCamera(targetX, targetZ, input) {
        if (!input) return;

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
            this.camDist = Math.max(100, Math.min(750, this.camDist)); // Scaled limits (was 200/1500)
        }

        const hRadius = this.camDist * Math.cos(this.camPitch);
        const camY = this.camDist * Math.sin(this.camPitch);
        const camX = targetX + hRadius * Math.sin(this.camYaw);
        const camZ = targetZ + hRadius * Math.cos(this.camYaw);

        this.camera3D.position.set(camX, camY, camZ);
        this.camera3D.lookAt(targetX, 10, targetZ);
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
     * Renders the current frame through the post-processing chain.
     */
    render() {
        this.composer.render();
    }
}
