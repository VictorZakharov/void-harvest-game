import * as THREE from 'three';
import {
    POLAR_VORTEX_RADIUS, POLAR_VORTEX_INNER_RADIUS_RATIO
} from '../constants.js';

/**
 * Manages all 3D visual components for the Player character, 
 * including the stick figure mesh, lights, and special effect visuals.
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

        // Animation parts
        this.torso = null;
        this.head = null;
        this.leftArm = null;
        this.rightArm = null;
        this.leftLeg = null;
        this.rightLeg = null;
        this.gun = null;

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
     * Constructs the player's 3D stick model, weapon, and attached lights.
     * @returns {THREE.Group}
     */
    createMesh() {
        const group = new THREE.Group();

        // Stick Figure Materials
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x00ffff }); // Cyan stick figure
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });

        // --- Torso ---
        // A thin vertical box/line
        const torsoGeo = new THREE.BoxGeometry(4, 25, 4);
        this.torso = new THREE.Mesh(torsoGeo, skinMat);
        this.torso.position.y = 20; // Center of torso raised up
        this.torso.castShadow = true;
        group.add(this.torso);

        // --- Head ---
        const headGeo = new THREE.SphereGeometry(8, 16, 16);
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 15; // Relative to torso center
        this.head.castShadow = true;
        this.torso.add(this.head);

        // --- Eyes ---
        const eyeGeo = new THREE.SphereGeometry(1.5, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black eyes

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-3, 2, 7); // Left, Up, Front (+Z is front)
        this.head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(3, 2, 7); // Right, Up, Front
        this.head.add(rightEye);

        // --- Limbs Helper Function ---
        const createLimb = (w, h, d, x, y, z) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, skinMat);
            const container = new THREE.Group();
            container.position.set(x, y, z);

            // Offset mesh so pivot is at the top
            mesh.position.y = -h / 2;
            mesh.castShadow = true;

            container.add(mesh);
            return { container, mesh };
        };

        // --- Arms ---
        // Attached to upper torso
        const armLength = 18;

        // Left Arm
        const lArm = createLimb(3, armLength, 3, -6, 10, 0);
        this.leftArm = lArm.container;
        this.torso.add(this.leftArm);

        // Right Arm
        const rArm = createLimb(3, armLength, 3, 6, 10, 0);
        this.rightArm = rArm.container;
        this.torso.add(this.rightArm);

        // --- Legs ---
        // Attached to bottom of torso (torso center is 20, height 25 -> bottom is 7.5? Wait.
        // H=25, center=20. Top=32.5, Bottom=7.5. 
        // Let's adjust pivot points to look natural.

        const legLength = 20;

        // Left Leg
        const lLeg = createLimb(3, legLength, 3, -4, -12, 0);
        this.leftLeg = lLeg.container;
        this.torso.add(this.leftLeg);

        // Right Leg
        const rLeg = createLimb(3, legLength, 3, 4, -12, 0);
        this.rightLeg = rLeg.container;
        this.torso.add(this.rightLeg);


        // --- Weapon ---
        // Attached to Right Arm Mesh (end of arm)
        const gunGeo = new THREE.BoxGeometry(4, 4, 15); // Smaller gun
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.gun = new THREE.Mesh(gunGeo, gunMat);
        // Position at hand level (bottom of arm)
        this.gun.position.set(2, -armLength, 0);
        // Align Gun Z (Length) with Arm -Y (Down/Forward when raised)
        this.gun.rotation.x = Math.PI / 2;
        this.rightArm.add(this.gun);


        // --- Lights ---
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

        // Scale down the entire figure
        group.scale.set(0.85, 0.85, 0.85);

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
        this.mesh.position.set(this.player.x + this.player.width / 2, 0, this.player.y + this.player.height / 2);
        // Rotate +90 degrees (+Option.PI/2) to Align Face (+Z) with Aim (+X)
        this.mesh.rotation.y = -this.player.angle + Math.PI / 2;

        // Running Animation logic
        // Calculate velocity magnitude
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        const isMoving = speed > 0.1;
        const time = Date.now() * 0.015 * (speed / this.player.speed); // Scale anim speed with movement speed

        // Default Pose
        let lLegRot = 0;
        let rLegRot = 0;
        let lArmRot = 0;
        // Right Arm: Point straight forward (Raise arm to horizontal)
        let rArmRot = -Math.PI / 2;

        if (isMoving) {
            // Run Cycle (Sine waves)
            lLegRot = Math.sin(time) * 0.8;
            rLegRot = Math.sin(time + Math.PI) * 0.8;

            // Arms swing opposite to legs
            lArmRot = Math.sin(time + Math.PI) * 0.6;
            // Right arm stays mostly steady for aiming, slight bob
            rArmRot = -Math.PI / 2 + Math.sin(time) * 0.1;
        }

        // Apply Rotations (X axis for forward/backward swing)
        if (this.leftLeg) this.leftLeg.rotation.x = lLegRot;
        if (this.rightLeg) this.rightLeg.rotation.x = rLegRot;
        if (this.leftArm) this.leftArm.rotation.x = lArmRot;
        if (this.rightArm) this.rightArm.rotation.x = rArmRot;

        // Bobbing torso
        if (this.torso) {
            this.torso.position.y = 20 + Math.abs(Math.sin(time)) * 2;
        }


        // Vortex Mesh Position
        if (this.vortexMesh) {
            this.vortexMesh.position.copy(this.mesh.position);
            // Keep vortex at ground level
            this.vortexMesh.position.y = 10;
        }

        // Shield Visual Update
        if (this.shieldMesh) {
            this.shieldMesh.visible = this.player.shieldActive;
            if (this.player.shieldActive) {
                const scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
                this.shieldMesh.position.y = 20; // Center on stick figure
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
