import * as THREE from 'three';
import {
    POLAR_VORTEX_RADIUS, POLAR_VORTEX_INNER_RADIUS_RATIO
} from '../constants.js';

/**
 * Manages all 3D visual components for the Player character, 
 * including the mesh, lights, and special effect visuals.
 */
export class PlayerVisuals {
    /**
     * @param {THREE.Scene} scene - The main game scene.
     * @param {Object} player - The player logical instance.
     */
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Visual Objects
        this.mesh = null;
        this.vortexMesh = new THREE.Group(); // Non-rotating group for Polar Vortex
        this.selfLight = null;
        this.spotLight = null;
        this.shieldMesh = null;
        this.shockwaveMesh = null;
        this.stasisParticles = [];
        this.shockwaveVisualTimer = 0;

        this.init();
    }

    /**
     * Initializes all 3D models and lights.
     */
    init() {
        this.mesh = this.createMesh();
        if (this.scene) {
            this.scene.add(this.mesh);
            this.scene.add(this.vortexMesh);
        }
    }

    /**
     * Constructs the player's 3D model, weapon, and attached lights.
     * @returns {THREE.Group}
     */
    createMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(this.player.width, 20, this.player.height);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(this.player.width * 0.6, 15, this.player.height * 0.4);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 10;
        head.position.z = -5;
        head.castShadow = true;
        group.add(head);

        // Weapon/Pointer
        const gunGeo = new THREE.BoxGeometry(30, 10, 10);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.position.set(25, 10, 10);
        gun.castShadow = true;
        group.add(gun);

        // Player Self-Light
        this.selfLight = new THREE.PointLight(0xffaa00, 1.0, 400, 2);
        this.selfLight.position.set(0, 50, 0);
        group.add(this.selfLight);

        // Flashlight (Directional SpotLight)
        this.spotLight = new THREE.SpotLight(0xffffff, 1.5);
        this.spotLight.position.set(0, 50, 0);
        this.spotLight.angle = Math.PI / 3;
        this.spotLight.penumbra = 0.2;
        this.spotLight.decay = 2;
        this.spotLight.distance = 2500;
        this.spotLight.castShadow = true;
        this.spotLight.shadow.mapSize.width = 1024;
        this.spotLight.shadow.mapSize.height = 1024;

        // Target for Spotlight
        const target = new THREE.Object3D();
        target.position.set(100, 0, 0);
        group.add(target);
        this.spotLight.target = target;
        group.add(this.spotLight);

        // Shield Mesh
        const shieldGeo = new THREE.SphereGeometry(this.player.width, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.visible = false;
        group.add(this.shieldMesh);

        // Shockwave Mesh (Ring)
        const ringGeo = new THREE.RingGeometry(1, 2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        this.shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
        this.shockwaveMesh.rotation.x = -Math.PI / 2;
        this.shockwaveMesh.position.y = 5;
        this.shockwaveMesh.visible = false;
        group.add(this.shockwaveMesh);

        // Polar Vortex Effects
        this.createVortexParticles();

        return group;
    }

    createVortexParticles() {
        this.stasisParticles = [];
        const particleCount = 400;
        const particleGeo = new THREE.BoxGeometry(0.8, 0.8, 6);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xccffff,
            transparent: true,
            opacity: 0.9
        });

        for (let i = 0; i < particleCount; i++) {
            const mesh = new THREE.Mesh(particleGeo, particleMat);
            mesh.visible = false;
            const lenScale = 0.8 + Math.random() * 1.5;
            mesh.scale.set(1, 1, lenScale);

            const innerR = POLAR_VORTEX_RADIUS * POLAR_VORTEX_INNER_RADIUS_RATIO;
            this.vortexMesh.add(mesh);
            this.stasisParticles.push({
                mesh: mesh,
                angle: Math.random() * Math.PI * 2,
                radius: innerR + Math.random() * (POLAR_VORTEX_RADIUS - innerR),
                radiusDrift: (Math.random() - 0.5) * 0.25,
                speed: 0.01 + Math.random() * 0.02,
                drift: 0.1 + Math.random() * 0.2
            });
        }
    }

    /**
     * Updates all visual components based on player logical state.
     */
    update() {
        if (!this.mesh) return;

        // Position & Main Rotation
        this.mesh.position.set(this.player.x + this.player.width / 2, 10, this.player.y + this.player.height / 2);
        this.mesh.rotation.y = -this.player.angle;

        // Vortex Mesh Position
        if (this.vortexMesh) {
            this.vortexMesh.position.copy(this.mesh.position);
        }

        // Shield Visual Update
        if (this.shieldMesh) {
            this.shieldMesh.visible = this.player.shieldActive;
            if (this.player.shieldActive) {
                const scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
                this.shieldMesh.scale.set(scale, scale, scale);
            }
        }

        // Shockwave Animation Update
        if (this.player.triggerShockwave) {
            this.player.triggerShockwave = false;
            if (this.shockwaveMesh) {
                this.shockwaveMesh.visible = true;
                this.shockwaveMesh.scale.set(1, 1, 1);
                this.shockwaveMesh.material.opacity = 1;
                this.shockwaveVisualTimer = 30; // 0.5s animation
            }
        }

        if (this.shockwaveVisualTimer > 0) {
            this.shockwaveVisualTimer--;
            const progress = 1 - (this.shockwaveVisualTimer / 30);
            const maxRadius = (this.player.shockwaveForce || 10) * 10;
            const scale = 1 + progress * maxRadius;
            this.shockwaveMesh.scale.set(scale, scale, 1);
            this.shockwaveMesh.material.opacity = 1 - progress;
            if (this.shockwaveVisualTimer <= 0) {
                this.shockwaveMesh.visible = false;
            }
        }

        // Polar Vortex Particle Update
        if (this.player.stasisUnlocked && this.stasisParticles) {
            const r = this.player.stasisRadius || POLAR_VORTEX_RADIUS;
            const innerR = r * POLAR_VORTEX_INNER_RADIUS_RATIO;

            this.stasisParticles.forEach(p => {
                p.mesh.visible = true;
                p.angle += p.speed;
                p.radius += (p.radiusDrift || 0);
                if (p.radius > r || p.radius < innerR) p.radiusDrift *= -1;

                const time = Date.now() * 0.001;
                const verticalPhase = p.radius * 0.1;
                const relativeY = -10 + (Math.sin(time * 2 + verticalPhase + p.angle) * 15 + 15);

                const x = Math.cos(p.angle) * p.radius;
                const z = Math.sin(p.angle) * p.radius;

                p.mesh.position.set(x, relativeY, z);
                p.mesh.rotation.y = -p.angle;
            });
        }
    }

    /**
     * Updates light radius based on player stats.
     */
    updateLights() {
        const radiusMultiplier = 1 + this.player.lightRadiusBonus;
        if (this.selfLight) this.selfLight.distance = 400 * radiusMultiplier;
        if (this.spotLight) this.spotLight.distance = 2500 * radiusMultiplier;
    }

    /**
     * Cleans up all visual objects from the scene.
     */
    dispose() {
        if (this.scene) {
            this.scene.remove(this.mesh);
            this.scene.remove(this.vortexMesh);
        }
    }
}
