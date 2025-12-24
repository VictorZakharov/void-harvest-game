import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';
import { EnemyMeshFactory } from './EnemyMeshFactory.js';

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
    /**
     * Creates the main visual group for the enemy.
     * @returns {THREE.Group}
     */
    createMesh() {
        this.animTime = 0;

        const factoryResult = EnemyMeshFactory.create(this.enemy);

        this.torso = factoryResult.torso;
        this.head = factoryResult.head;
        this.leftArm = factoryResult.leftArm;
        this.rightArm = factoryResult.rightArm;
        this.leftLeg = factoryResult.leftLeg;
        this.rightLeg = factoryResult.rightLeg;
        this.healthBar = factoryResult.healthBar;
        this.bodyMesh = factoryResult.bodyMesh;
        this.baseColor = factoryResult.baseColor;

        return factoryResult.group;
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
