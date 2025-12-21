import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';

/**
 * Handles all Three.js visual representations for an Enemy.
 * Separates rendering concerns from game logic.
 */
export class EnemyVisuals {
    /**
     * @param {Enemy} enemy - The enemy instance this visualizer belongs to.
     */
    constructor(enemy) {
        this.enemy = enemy;

        // References to visual components
        this.mesh = null;
        this.bodyMesh = null;
        this.baseColor = null;
        this.healthBar = null;
        this.hbOpacity = 0;
        this.wasDamaged = false;

        // Initialize the mesh
        this.mesh = this.createMesh();
    }

    /**
     * Creates the main visual group for the enemy.
     * @returns {THREE.Group}
     */
    createMesh() {
        this.animTime = 0;
        const enemy = this.enemy;
        const color = ENEMY_SPRITE_COLORS[enemy.type].main;

        // Stick Figure Materials
        const skinMat = new THREE.MeshStandardMaterial({ color: color });
        const headMat = new THREE.MeshStandardMaterial({ color: color }); // Head matches body color

        // Group for entire enemy
        const group = new THREE.Group();

        // --- Torso ---
        const isTank = enemy.type === 'tank';
        const torsoWidth = isTank ? 12 : 4;
        const torsoDepth = isTank ? 12 : 4;

        const torsoGeo = new THREE.BoxGeometry(torsoWidth, 25, torsoDepth);
        this.torso = new THREE.Mesh(torsoGeo, skinMat);
        this.torso.position.y = 40;

        this.torso.castShadow = true;
        group.add(this.torso);
        this.bodyMesh = this.torso; // Reference for coloring
        this.baseColor = color;

        // --- Head ---
        const headGeo = new THREE.SphereGeometry(8, 16, 16);
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 15;
        this.head.castShadow = false; // Disable head shadow to reduce artifacts
        this.torso.add(this.head);

        // --- Eyes ---
        const eyeGeo = new THREE.SphereGeometry(1.5, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-3, 2, 7);
        this.head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(3, 2, 7);
        this.head.add(rightEye);

        // --- Limbs Helper ---
        const createLimb = (w, h, d, x, y, z) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, skinMat);
            const container = new THREE.Group();
            container.position.set(x, y, z);
            mesh.position.y = -h / 2;
            mesh.castShadow = false; // Disable limb shadows to simplify and fix artifacts
            container.add(mesh);
            return { container, mesh };
        };

        const armLength = 18;
        const legLength = 28;

        // Limbs attached to torso
        // Calculate offsets based on torso width to ensure limbs do not clip
        const armXOffset = isTank ? 10 : 6;
        const legXOffset = isTank ? 6 : 4;

        const lArm = createLimb(3, armLength, 3, -armXOffset, 10, 0);
        this.leftArm = lArm.container;
        this.torso.add(this.leftArm);

        const rArm = createLimb(3, armLength, 3, armXOffset, 10, 0);
        this.rightArm = rArm.container;
        this.torso.add(this.rightArm);

        const lLeg = createLimb(3, legLength, 3, -legXOffset, -12, 0);
        this.leftLeg = lLeg.container;
        this.torso.add(this.leftLeg);

        const rLeg = createLimb(3, legLength, 3, legXOffset, -12, 0);
        this.rightLeg = rLeg.container;
        this.torso.add(this.rightLeg);

        // --- Weapon (Shooters/Ice) ---
        if (enemy.type === 'shooter' || enemy.type === 'ice') {
            const gunColor = enemy.type === 'ice' ? 0x88ccff : 0x333333;
            const gunGeo = new THREE.BoxGeometry(4, 4, 15);
            const gunMat = new THREE.MeshStandardMaterial({ color: gunColor });
            const gun = new THREE.Mesh(gunGeo, gunMat);

            // Attached to right arm, pointing forward -> Gun aligned with arm
            gun.position.set(2, -armLength, 0);
            gun.rotation.x = Math.PI / 2;
            this.rightArm.add(gun);

            // Raise right arm for shooters
            this.rightArm.rotation.x = -Math.PI / 2;
        }

        // --- Scale ---
        // Adjust scale based on enemy type
        let scale = 0.85; // Default match player size
        if (enemy.type === 'tank') scale = 1.2;
        if (enemy.type === 'fast') scale = 0.7;

        group.scale.set(scale, scale, scale);


        // Health Bar (Billboard Group)
        const hpGroup = new THREE.Group();
        hpGroup.position.set(0, 70, 0); // Above head (new height ~63)

        const createPillGeo = (w, h) => {
            const shape = new THREE.Shape();
            const r = h / 2;
            shape.moveTo(r, -r);
            shape.lineTo(w - r, -r);
            shape.absarc(w - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
            shape.lineTo(r, r);
            shape.absarc(r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
            return new THREE.ShapeGeometry(shape);
        };

        const bgGeo = createPillGeo(54, 12);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.x = -27;
        bg.userData.isHealthBar = true;
        bg.castShadow = false; // Prevent health bar shadow on ground
        hpGroup.add(bg);
        hpGroup.bg = bg;

        const fgGeo = createPillGeo(50, 10);
        const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
        const fg = new THREE.Mesh(fgGeo, fgMat);
        fg.userData.isHealthBar = true;
        fg.position.z = 1;
        fg.position.x = -25;
        fg.castShadow = false; // Prevent health bar shadow on ground
        hpGroup.add(fg);
        hpGroup.foreground = fg;
        hpGroup.fg = fg;

        hpGroup.visible = false;
        group.add(hpGroup);
        this.healthBar = hpGroup;

        return group;
    }



    /**
     * Updates the visuals based on external visibility, fog, and current camera.
     * @param {number} visibility - 0 to 1 scaling of current biome visibility.
     * @param {number} fogColor - Color of the biome fog.
     * @param {THREE.Camera} camera - Active game camera for billboarding.
     * @param {number} dt - Delta time in milliseconds since last frame.
     */
    update(visibility = 1.0, fogColor = 0x333333, camera = null, dt = 16) {
        if (!this.mesh) return;

        const enemy = this.enemy;
        this.mesh.position.set(enemy.x + enemy.width / 2, 0, enemy.y + enemy.height / 2);
        // Correct rotation: Model faces +Z. Game angle 0 is +X.
        this.mesh.rotation.y = -enemy.angle + Math.PI / 2;

        // Animation
        const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
        const isMoving = speed > 0.1 && !enemy.frozen;

        // Initialize animTime if missing 
        if (this.animTime === undefined) {
            const seed = (enemy.x + enemy.y) * 0.1;
            this.animTime = seed;
        }

        // Accumulate time (scaled by game speed) for animation
        // 0.015 factor normalizes dt (in ms) to animation time units
        this.animTime += dt * 0.015;

        const time = this.animTime;

        // Pose
        let lLegRot = 0;
        let rLegRot = 0;
        let lArmRot = 0;
        let rArmRot = 0;

        if (enemy.type === 'shooter' || enemy.type === 'ice') {
            rArmRot = -Math.PI / 2; // Keep holding gun up
        }

        if (isMoving) {
            lLegRot = Math.sin(time) * 0.8;
            rLegRot = Math.sin(time + Math.PI) * 0.8;
            lArmRot = Math.sin(time + Math.PI) * 0.6;

            if (enemy.type !== 'shooter' && enemy.type !== 'ice') {
                rArmRot = Math.sin(time) * 0.6;
            } else {
                // Bob aim
                rArmRot += Math.sin(time) * 0.1;
            }

            if (this.torso) {
                this.torso.position.y = 40 + Math.abs(Math.sin(time)) * 2;
            }
        }

        if (this.leftLeg) this.leftLeg.rotation.x = lLegRot;
        if (this.rightLeg) this.rightLeg.rotation.x = rLegRot;
        if (this.leftArm) this.leftArm.rotation.x = lArmRot;
        if (this.rightArm) this.rightArm.rotation.x = rArmRot;


        // Visibility & Fog Logic
        const v = Math.max(0, Math.min(1, visibility));

        if (this.bodyMesh && this.bodyMesh.material) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material && !child.userData.isHealthBar && !child.userData.ignoreVisibility) {
                    const targetOpacity = 0.05 + (0.95 * v);
                    child.material.transparent = true;
                    child.material.opacity = targetOpacity;

                    // Emissive for Freeze
                    if (child.material.emissive) {
                        const emissiveColor = enemy.frozen ? 0x00ffff : 0x000000;
                        const emissiveIntensity = enemy.frozen ? 0.5 : 0;
                        child.material.emissive.setHex(emissiveColor);
                        child.material.emissiveIntensity = emissiveIntensity;
                    }

                    // Simple Fog/Visibility Color Lerp
                    // Only base color for most parts? 
                    // Let's keep original colors but fade to black if hidden?
                    // Original logic faded to black.

                    // Just set color directly for now, complicated lerps might be overkill for stick figures
                    // unless we want that "fade in from darkness" effect.
                    // Let's preserve the existing "fade to black" logic roughly.
                }
            });
        }

        // ... (Health Bar logic remains same, just ensuring position is correct)
        if (this.healthBar) {
            const isDamaged = enemy.health < enemy.maxHealth;
            const shouldBeVisible = (v > 0.5 && isDamaged && enemy.health > 0);
            const targetOpacity = shouldBeVisible ? 1.0 : 0.0;

            if (shouldBeVisible && !this.wasDamaged) {
                this.hbOpacity = 1.0;
            } else if (this.hbOpacity < targetOpacity) {
                this.hbOpacity = Math.min(this.hbOpacity + 0.02, targetOpacity);
            } else if (this.hbOpacity > targetOpacity) {
                this.hbOpacity = Math.max(this.hbOpacity - 0.02, targetOpacity);
            }

            this.wasDamaged = isDamaged;

            if (this.hbOpacity > 0.01) {
                this.healthBar.visible = true;
                if (this.healthBar.bg) this.healthBar.bg.material.opacity = this.hbOpacity * 0.5; // Transparent background
                if (this.healthBar.fg) this.healthBar.fg.material.opacity = this.hbOpacity;

                const pct = enemy.health / enemy.maxHealth;
                this.healthBar.foreground.scale.x = pct;

                if (camera) {
                    const camDir = new THREE.Vector3();
                    camera.getWorldDirection(camDir);
                    const target = new THREE.Vector3();
                    this.healthBar.getWorldPosition(target);
                    target.sub(camDir.multiplyScalar(100));
                    this.healthBar.lookAt(target);
                } else {
                    this.healthBar.rotation.order = 'YXZ';
                    this.healthBar.rotation.y = enemy.angle;
                    this.healthBar.rotation.x = -Math.PI / 4;
                }
            } else {
                this.healthBar.visible = false;
            }
        }
    }

    /**
     * Clean up Three.js resources when the enemy is removed.
     * @param {THREE.Scene} scene - The scene to remove visuals from.
     */
    dispose(scene) {
        if (this.mesh) {
            if (scene) scene.remove(this.mesh);

            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.mesh = null;
        }
    }
}
