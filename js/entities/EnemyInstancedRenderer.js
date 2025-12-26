import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';

export class EnemyInstancedRenderer {
    constructor(scene, maxEnemies = 2500) {
        this.scene = scene;
        this.maxEnemies = maxEnemies;

        // --- Geometries ---
        // 1. Body (Torso + Head welded)
        // Dimensions match EnemyMeshFactory for consistency.
        // Torso: 4x25x4 box positioned at y=40 (relative to ground).
        // Head: Radius 8 sphere positioned at y=55.
        const torsoGeo = new THREE.BoxGeometry(4, 25, 4);
        torsoGeo.translate(0, 40, 0);
        const headGeo = new THREE.SphereGeometry(8, 8, 8); // Low poly for performance
        headGeo.translate(0, 55, 0);

        // Merge Body
        // Combine Torso and Head into a single geometry to reduce draw calls.
        // Manual merge used to minimize dependencies.
        this.bodyGeo = this.mergeGeos([torsoGeo, headGeo]);

        // 2. Eyes (Two eyes welded)
        // Eye: r=1.5 at y=57, z=7 (+/- 3 x)
        const lEye = new THREE.SphereGeometry(1.5, 4, 4);
        lEye.translate(-3, 57, 7.5); // Push out slightly (was 7)
        const rEye = new THREE.SphereGeometry(1.5, 4, 4);
        rEye.translate(3, 57, 7.5);
        this.eyeGeo = this.mergeGeos([lEye, rEye]);

        // 3. Limb (Arm/Leg)
        // Uses a generic "Stick" geometry (Box 1x1x1) with pivot at the top (y=0).
        // This allows scaling length via Y-axis and rotating around the shoulder/hip joint.
        // Geometry extends down from 0 to -1.
        this.limbGeo = new THREE.BoxGeometry(1, 1, 1);
        this.limbGeo.translate(0, -0.5, 0);

        // 4. Gun
        // Box 4x4x15
        this.gunGeo = new THREE.BoxGeometry(4, 4, 15);
        // Align so it sits on arm. 
        this.gunGeo.translate(0, 0, 7.5); // Extends forward

        // --- Materials ---
        this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // Tinted per instance
        this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        this.gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // --- Instanced Meshes ---
        this.meshes = {};

        // Body
        this.meshes.body = new THREE.InstancedMesh(this.bodyGeo, this.bodyMat, maxEnemies);
        this.meshes.body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.body.castShadow = false;
        this.meshes.body.receiveShadow = false;
        this.meshes.body.frustumCulled = false; // Disable culling to ensure rendering map-wide

        // Eyes
        this.meshes.eyes = new THREE.InstancedMesh(this.eyeGeo, this.eyeMat, maxEnemies);
        this.meshes.eyes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.eyes.receiveShadow = false;
        this.meshes.eyes.frustumCulled = false;

        // Limbs (4 per enemy)
        this.meshes.limbs = new THREE.InstancedMesh(this.limbGeo, this.bodyMat, maxEnemies * 4);
        this.meshes.limbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.limbs.receiveShadow = false;
        this.meshes.limbs.frustumCulled = false;

        // Guns (1 per shooter, optimistically allocate maxEnemies)
        this.meshes.guns = new THREE.InstancedMesh(this.gunGeo, this.gunMat, maxEnemies);
        this.meshes.guns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.meshes.guns.receiveShadow = false;
        this.meshes.guns.frustumCulled = false;

        // Add to scene
        this.scene.add(this.meshes.body);
        this.scene.add(this.meshes.eyes);
        this.scene.add(this.meshes.limbs);
        this.scene.add(this.meshes.guns);

        // Helpers
        this.dummy = new THREE.Object3D();
        this._color = new THREE.Color();
    }

    mergeGeos(geos) {
        // Convert to non-indexed first to ensure we can just concat attributes
        // (Simpler than merging indices, though slightly more memory)
        const nonIndexedGeos = geos.map(g => {
            // Check if indexed
            if (g.index) {
                return g.toNonIndexed();
            }
            return g.clone();
        });

        let vCount = 0;
        nonIndexedGeos.forEach(g => vCount += g.attributes.position.count);

        const positions = new Float32Array(vCount * 3);
        const normals = new Float32Array(vCount * 3);

        let offset = 0;
        nonIndexedGeos.forEach(g => {
            const p = g.attributes.position.array;
            const n = g.attributes.normal.array;
            positions.set(p, offset * 3);
            normals.set(n, offset * 3);
            offset += g.attributes.position.count;

            // Clean up the temp geometry
            g.dispose();
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        return geo;
    }

    update(enemies, dt, player, cursorTarget) {
        let bodyIdx = 0;
        let limbIdx = 0;
        let gunIdx = 0;

        const dummy = this.dummy;

        for (const enemy of enemies) {
            // Safety: Do not exceed buffer capacity
            if (bodyIdx >= this.maxEnemies) break;

            // --- Visibility Check (Fog of War) ---
            let isVisible = true;

            if (cursorTarget) {

                const dCursor = Math.sqrt((enemy.x - cursorTarget.x) ** 2 + (enemy.y - cursorTarget.z) ** 2);
                const radiusMultiplier = player ? (1 + player.lightRadiusBonus) : 1;
                const lightHeight = 300 * radiusMultiplier;
                // Cone logic: radius = height * tan(theta).
                // Max radius (cEnd) is at Pi/3 (tan=1.73). 300 * 1.73 = ~520.
                const cEnd = lightHeight * Math.tan(Math.PI / 3);

                if (dCursor > cEnd) {
                    // Outside light cone
                    isVisible = false;

                    // Extra check: Player Bullet light? 
                    // (Skipping bullet light check for perf, or TODO: pass bullets)
                }
            }

            // If hidden, scale to 0 and skip math
            if (!isVisible) {
                dummy.position.set(0, -1000, 0); // Move away to be safe
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();

                // Update all parts to hidden
                this.meshes.body.setMatrixAt(bodyIdx, dummy.matrix);
                // this.meshes.eyes.setMatrixAt(bodyIdx, dummy.matrix); // Optional

                // Advance indices but don't draw limbs
                bodyIdx++;
                // Limbs (4)
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);
                this.meshes.limbs.setMatrixAt(limbIdx++, dummy.matrix);

                // Gun
                const isShooter = (enemy.type === 'shooter' || enemy.type === 'ice');
                if (isShooter) {
                    this.meshes.guns.setMatrixAt(gunIdx++, dummy.matrix);
                }
                continue;
            }

            // --- 1. Body Transform ---
            // Bobbing Animation
            // Recalculate animation state locally to maintain purity in the renderer.
            // (Previously calculated in EnemyVisuals, which is now deprecated).
            const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
            const isMoving = speed > 0.1 && !enemy.frozen;

            // Generate a stable seed/time
            if (!enemy._animTime) enemy._animTime = (enemy.x + enemy.y) * 0.1;
            enemy._animTime += dt * 0.015; // Same speed as before
            const time = enemy._animTime;

            let torsoY = 0;
            if (isMoving) torsoY = Math.abs(Math.sin(time)) * 2;
            else if (enemy.isKneeling) torsoY = -20; // Drop down

            // Base Transform
            dummy.position.set(enemy.x + enemy.width / 2, torsoY, enemy.y + enemy.height / 2);
            dummy.rotation.set(0, -enemy.angle + Math.PI / 2, 0); // Y-up rotation

            // Scale (Tank vs Normal)
            let s = 0.85;
            if (enemy.type === 'tank') s = 1.2;
            if (enemy.type === 'fast') s = 0.7;
            dummy.scale.set(s, s, s);

            dummy.updateMatrix();

            // Set Body
            this.meshes.body.setMatrixAt(bodyIdx, dummy.matrix);

            // Set Color
            const col = ENEMY_SPRITE_COLORS[enemy.type].main;
            this._color.set(col); // Handle string or hex

            // Flash on damage?
            if (enemy.flashTime > 0) {
                this._color.setHex(0xffffff);
                enemy.flashTime -= dt;
            }

            this.meshes.body.setColorAt(bodyIdx, this._color);

            // Set Eyes (Same transform as body, they are welded in local space)
            this.meshes.eyes.setMatrixAt(bodyIdx, dummy.matrix);
            // Eyes always black/default color
            // Color attribute update skipped as material color handles this globally.

            bodyIdx++;

            // --- 2. Limbs ---
            // Calculate Limb Rotations
            let lLegRot = 0, rLegRot = 0, lArmRot = 0, rArmRot = 0;

            if (isMoving) {
                lLegRot = Math.sin(time) * 0.8;
                rLegRot = Math.sin(time + Math.PI) * 0.8;
                lArmRot = Math.sin(time + Math.PI) * 0.6;
                rArmRot = Math.sin(time) * 0.6;
            } else if (enemy.isKneeling) {
                lLegRot = -0.5;
                rLegRot = 1.2;
            }

            // Aiming override
            const isShooter = (enemy.type === 'shooter' || enemy.type === 'ice');
            if (isShooter) {
                rArmRot = -Math.PI / 2; // Arm straight out
                if (isMoving) rArmRot += Math.sin(time) * 0.1; // Bob
            }

            // Apply Transforms
            // We need to place limbs relative to the Body (which is scaled and rotated).
            // It's easier to duplicate the Body's position/rotation and then translate/rotate limbs locally.
            // But we need to account for 's' (scale).

            const shoulderY = (40 + 10) * s + torsoY; // Scaled height + bob
            const hipY = (40 - 12) * s + torsoY;
            const armX = (enemy.type === 'tank' ? 10 : 6) * s;
            const legX = (enemy.type === 'tank' ? 6 : 4) * s;

            const armL = 18 * s; // Lengths also scaled
            const legL = 28 * s;
            const armW = 3 * s;
            const legW = 3 * s;

            // Helper to set limb
            const setLimb = (xOff, yOff, rotX, len, width) => {
                dummy.position.set(enemy.x + enemy.width / 2, yOff, enemy.y + enemy.height / 2);
                dummy.rotation.set(0, -enemy.angle + Math.PI / 2, 0); // Faces Z

                // Transform Logic:
                // 1. Position at Body center.
                // 2. Rotate to face enemy direction.
                // 3. Apply local offset (Shoulder/Hip position).
                // 4. Apply Limb rotation (Swing).
                // 5. Scale to correct dimensions (Width/Length).

                const angle = -enemy.angle + Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                const wX = xOff * cos; // Rotated X offset
                const wZ = xOff * -sin; // Rotated Z offset (rotation around Y)

                dummy.position.x += wX;
                dummy.position.z += wZ;

                // Now rotate limb itself
                // USE YXZ ORDER: Apply X (Swing) First, THEN Y (Facing)
                dummy.rotation.set(rotX, angle, 0, 'YXZ');

                // Scale to match dimension (Standard is 1x1x1 stick hanging from 0)
                dummy.scale.set(width, len, width); // Scale Y is length.

                dummy.updateMatrix();

                this.meshes.limbs.setMatrixAt(limbIdx, dummy.matrix);
                this.meshes.limbs.setColorAt(limbIdx, this._color);
                limbIdx++;

                return dummy.matrix.clone(); // Return for attachment (Gun)
            };

            // Scaling logic requires knowing if offset is left/right instanced
            // xOff is local X.

            // Left Arm
            setLimb(-armX, shoulderY, lArmRot, armL, armW);

            // Right Arm
            const rArmMat = setLimb(armX, shoulderY, rArmRot, armL, armW);

            // Left Leg
            setLimb(-legX, hipY, lLegRot, legL, legW);

            // Right Leg
            setLimb(legX, hipY, rLegRot, legL, legW);

            // --- 3. Gun ---
            if (isShooter) {
                // Gun Attachment Logic:
                // The gun must be positioned at the tip of the right arm.
                // Since matrix multiplication of non-uniform scaled geometries is complex,
                // we manually calculate the tip position based on the arm's rotation parameters.

                // Re-calculate gun pos
                // Arm tip is at rArmRot. Length armL.
                // Pos = Shoulder + (Rotated Vector(0, -armL, 0))

                // 1. Body Pos + Shoulder Offset
                const angle = -enemy.angle + Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                const shX = dummy.position.x; // Access current dummy position safely
                const bX = enemy.x + enemy.width / 2;
                const bZ = enemy.y + enemy.height / 2;

                const sX = bX + (armX * cos);
                const sZ = bZ + (armX * -sin);

                // 2. Arm Vector (Local to body, then Local to Arm)
                // Arm rotates X. Vector(0, -armL, 0) rotated by X becomes (0, -L*cos, -L*sin)
                // Then rotate by Body Y.

                const tipLocalY = -armL * Math.cos(rArmRot);
                const tipLocalZ = -armL * Math.sin(rArmRot);
                // tipLocalX = 0;

                // Apply Body Y rot
                // Y is Y. Z rotates.
                const wTipX = tipLocalZ * sin; // Z contributes to X via Sin
                const wTipZ = tipLocalZ * cos;

                // Gun Pos
                dummy.position.set(sX + wTipX, shoulderY + tipLocalY, sZ + wTipZ);

                // Gun Rotation:
                // Combine Body Rotation + Arm Rotation + 90 degree offset for forward aim.
                dummy.rotation.set(rArmRot + Math.PI / 2, angle, 0, 'YXZ');

                dummy.scale.set(s, s, s); // Normal scale
                dummy.updateMatrix();

                this.meshes.guns.setMatrixAt(gunIdx, dummy.matrix);

                // Color
                const gCol = (enemy.type === 'ice') ? 0x88ccff : 0x333333;
                this._color.set(gCol); // Handle int or string
                this.meshes.guns.setColorAt(gunIdx, this._color);

                gunIdx++;
            }

            // Note: Health Bars are handled by a separate system/layer.
        }

        // Finalize
        this.meshes.body.count = bodyIdx;
        this.meshes.body.instanceMatrix.needsUpdate = true;
        if (this.meshes.body.instanceColor) this.meshes.body.instanceColor.needsUpdate = true;

        this.meshes.eyes.count = bodyIdx;
        this.meshes.eyes.instanceMatrix.needsUpdate = true;
        if (this.meshes.eyes.instanceColor) this.meshes.eyes.instanceColor.needsUpdate = true;

        this.meshes.limbs.count = limbIdx;
        this.meshes.limbs.instanceMatrix.needsUpdate = true;
        if (this.meshes.limbs.instanceColor) this.meshes.limbs.instanceColor.needsUpdate = true;

        this.meshes.guns.count = gunIdx;
        this.meshes.guns.instanceMatrix.needsUpdate = true;
        if (this.meshes.guns.instanceColor) this.meshes.guns.instanceColor.needsUpdate = true;
    }
}
