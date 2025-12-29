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
        this.p2Light = null; // New P2 Light
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

        // Player 2 Personal Light (Hidden by default)
        this.p2Light = new THREE.SpotLight(0xffaa44, 2.0); // Orange tint for P2
        this.p2Light.position.set(0, 200, 0);
        this.p2Light.angle = Math.PI / 3;
        this.p2Light.penumbra = 0.5;
        this.p2Light.decay = 1.0;
        this.p2Light.distance = 3000;
        this.p2Light.castShadow = true;
        this.p2Light.shadow.mapSize.width = 1024; // Lower res for secondary light
        this.p2Light.shadow.mapSize.height = 1024;
        this.p2Light.shadow.bias = -0.0005;
        this.p2Light.visible = false; // Initially hidden
        this.scene.add(this.p2Light);
        this.p2Light.target.position.set(0, 0, 0);
        this.scene.add(this.p2Light.target);

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
    /**
     * Updates the position and scale of lights and reticle based on player state and mouse target.
     * @param {THREE.Vector3} target - The 3D world position under the mouse cursor.
     * @param {Object} p1 - Player 1 entity.
     * @param {Object} p2 - Player 2 entity (optional).
     */
    update(target, p1, p2) {
        // Update cursor light and glow (P1 Control)
        if (target) {
            const radiusMultiplier = p1 ? (1 + p1.lightRadiusBonus) : 1;
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

            // Update P2 Personal Light
            if (this.p2Light) {
                if (p2 && p2.hasPersonalLight && !p2.isDowned && p2.health > 0) {
                    this.p2Light.visible = true;
                    // Follow P2
                    this.p2Light.position.set(p2.x + p2.width / 2, lightHeight, p2.y + p2.height / 2);
                    this.p2Light.target.position.set(p2.x + p2.width / 2, 0, p2.y + p2.height / 2);

                    // Match P1 Stats
                    this.p2Light.intensity = 800 * radiusMultiplier;
                    this.p2Light.distance = 3000 * radiusMultiplier;
                } else {
                    this.p2Light.visible = false;
                }
            }

            // Update reticle (P1)
            if (this.reticle && p1) {
                this.reticle.position.set(target.x, 2, target.z);
                const dx = target.x - (p1.x + p1.width / 2);
                const dz = target.z - (p1.y + p1.height / 2);
                const dist = Math.sqrt(dx * dx + dz * dz);
                const spreadRadius = Math.max(10, dist * Math.tan(p1.currentSpread));
                this.reticle.scale.set(spreadRadius, spreadRadius, 1);

                if (dist > p1.range) {
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

    /**
     * Checks if a point in the world (Ground plane) is illuminated.
     * @param {number} x - World X
     * @param {number} z - World Z (Game Y)
     * @returns {boolean}
     */
    isPointLit(x, z) {
        // 1. Check P1/Cursor Light
        if (this.cursorLight) {
            const tx = this.cursorLight.target.position.x;
            const tz = this.cursorLight.target.position.z;
            const dx = x - tx;
            const dz = z - tz;
            // Calculate effective light radius including penumbra.
            // Angle is PI/3 (60 deg), tan(60) ~ 1.73. 
            // Using factor 1.8 to ensure coverage of the spotlight cone and penumbra falloff.
            const lightY = this.cursorLight.position.y;
            const radius = lightY * 1.8;

            if ((dx * dx + dz * dz) < (radius * radius)) return true;
        }

        // 2. Check P2 Personal Light
        if (this.p2Light && this.p2Light.visible) {
            const tx = this.p2Light.target.position.x;
            const tz = this.p2Light.target.position.z;
            const dx = x - tx;
            const dz = z - tz;
            const lightY = this.p2Light.position.y;
            const radius = lightY * 1.8;

            if ((dx * dx + dz * dz) < (radius * radius)) return true;
        }

        return false;
    }
}
