import * as THREE from 'three';

/**
 * Manages game lighting, including the cursor spotlight, 
 * ambient light, and the interactive aiming reticle.
 */
export class LightingManager {
    /**
     * @param {THREE.Scene} scene - The Three.js scene to add lights and reticles to.
     */
    constructor(scene) {
        this.scene = scene;
        this.cursorLight = null;
        this.cursorGlow = null;
        this.reticle = null;
        this.reticleShadow = null;
        this.dirLight = null;
        this.ambientLight = null;

        this.init();
    }

    /**
     * Initializes all light sources and visual reticle elements.
     */
    init() {
        // Cursor Light (Follows mouse)
        this.cursorLight = new THREE.SpotLight(0xffffff, 2.0);
        this.cursorLight.position.set(0, 200, 0);
        this.cursorLight.angle = Math.PI / 3;
        this.cursorLight.penumbra = 0.5;
        this.cursorLight.decay = 1.0;
        this.cursorLight.distance = 3000;
        this.cursorLight.castShadow = true;
        this.cursorLight.shadow.mapSize.width = 2048;
        this.cursorLight.shadow.mapSize.height = 2048;
        this.cursorLight.shadow.bias = -0.0005;
        this.cursorLight.shadow.normalBias = 0.02;
        this.scene.add(this.cursorLight);
        this.cursorLight.target.position.set(0, 0, 0);
        this.scene.add(this.cursorLight.target);

        // Cursor Glow (Bright point source)
        this.cursorGlow = new THREE.PointLight(0xffffff, 1.5, 900, 2);
        this.scene.add(this.cursorGlow);

        // Reticle (Spread Indicator)
        // 1. Shadow/Outline
        const reticleShadowGeo = new THREE.RingGeometry(0.75, 1.05, 32);
        const reticleShadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
            depthTest: true,
            depthWrite: false
        });
        this.reticleShadow = new THREE.Mesh(reticleShadowGeo, reticleShadowMat);
        this.reticleShadow.rotation.x = -Math.PI / 2;
        this.scene.add(this.reticleShadow);

        // 2. Main Glow
        const reticleGeo = new THREE.RingGeometry(0.8, 1.0, 32);
        const reticleMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false
        });
        this.reticle = new THREE.Mesh(reticleGeo, reticleMat);
        this.reticle.rotation.x = -Math.PI / 2;
        this.reticle.position.y = 0.5;
        this.scene.add(this.reticle);

        // Ambient Light
        this.ambientLight = new THREE.AmbientLight(0x000000, 0.0);
        this.scene.add(this.ambientLight);

        // Directional Light
        this.dirLight = new THREE.DirectionalLight(0xaaccff, 0.05);
        this.dirLight.position.set(500, 1000, 500);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.bias = -0.0005;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 2500;
        this.dirLight.shadow.camera.left = -1000;
        this.dirLight.shadow.camera.right = 1000;
        this.dirLight.shadow.camera.top = 1000;
        this.dirLight.shadow.camera.bottom = -1000;
        this.scene.add(this.dirLight);
    }

    /**
     * Updates the position and scale of lights and reticle based on player state and mouse target.
     * @param {THREE.Vector3} target - The 3D world position under the mouse cursor.
     * @param {Object} player - The player entity.
     */
    update(target, player) {
        // Update cursor light and glow
        if (target) {
            const radiusMultiplier = player ? (1 + player.lightRadiusBonus) : 1;
            const lightHeight = 300 * radiusMultiplier;

            if (this.cursorLight) {
                this.cursorLight.position.set(target.x, lightHeight, target.z);
                this.cursorLight.target.position.set(target.x, 0, target.z);
                this.cursorLight.intensity = 800 * radiusMultiplier;
                this.cursorLight.distance = 3000 * radiusMultiplier;
            }
            if (this.cursorGlow) {
                this.cursorGlow.position.set(target.x, 20, target.z);
            }

            // Update reticle
            if (this.reticle && player) {
                this.reticle.position.set(target.x, 2, target.z);
                const dx = target.x - (player.x + player.width / 2);
                const dz = target.z - (player.y + player.height / 2);
                const dist = Math.sqrt(dx * dx + dz * dz);
                const spreadRadius = Math.max(10, dist * Math.tan(player.currentSpread));
                this.reticle.scale.set(spreadRadius, spreadRadius, 1);

                if (dist > player.range) {
                    this.reticle.material.color.setHex(0x888888);
                } else {
                    this.reticle.material.color.setHex(0x00ffff);
                }

                if (this.reticleShadow) {
                    this.reticleShadow.position.copy(this.reticle.position);
                    this.reticleShadow.scale.set(spreadRadius, spreadRadius, 1);
                }
            }
        }
    }

    /**
     * Updates global light intensities based on player stats.
     * @param {Object} player - The player entity.
     */
    updateGlobalLights(player) {
        if (!player) return;
        const radiusMultiplier = 1 + player.lightRadiusBonus;

        if (this.cursorLight) {
            this.cursorLight.position.y = 300 * radiusMultiplier;
            this.cursorLight.intensity = 800 * radiusMultiplier;
            this.cursorLight.distance = 3000 * radiusMultiplier;
        }

        if (this.cursorGlow) {
            this.cursorGlow.distance = 900 * radiusMultiplier;
        }
    }

    /**
     * Gets the current 3D position of the cursor light target.
     * @returns {THREE.Vector3|null}
     */
    getCursorTarget() {
        return this.cursorLight ? this.cursorLight.target.position : null;
    }
}
