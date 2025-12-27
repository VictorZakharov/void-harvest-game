export class EnemyInstancedAnimation {
    /**
     * Calculates the animation state (time, bobbing, limb rotations) for an enemy.
     * @param {Enemy} enemy 
     * @param {number} dt 
     * @returns {Object} Animation state object with rotation/position helpers.
     */
    static calculateState(enemy, dt) {
        // --- Animation Timers ---
        const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
        const isMoving = speed > 0.1 && !enemy.frozen;

        // Generate a stable seed/time if missing
        if (!enemy._animTime) enemy._animTime = (enemy.x + enemy.y) * 0.1;
        enemy._animTime += dt * 0.015; // Animation speed measure
        const time = enemy._animTime;

        // --- Body Bobbing ---
        let torsoY = 0;
        if (isMoving) torsoY = Math.abs(Math.sin(time)) * 2;
        else if (enemy.isKneeling) torsoY = -20; // Drop down

        // --- Limb Rotations ---
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

        // Scale (Tank vs Normal)
        let s = 0.85;
        if (enemy.type === 'tank') s = 1.2;
        if (enemy.type === 'fast') s = 0.7;

        return {
            isMoving,
            time,
            torsoY,
            limbs: { lLegRot, rLegRot, lArmRot, rArmRot },
            isShooter,
            scale: s
        };
    }

    /**
     * Applies the body transform to the dummy object.
     * @param {THREE.Object3D} dummy 
     * @param {Enemy} enemy 
     * @param {Object} animState - Result from calculateState
     */
    static applyBodyTransform(dummy, enemy, animState) {
        // Base Transform
        dummy.position.set(enemy.x + enemy.width / 2, animState.torsoY, enemy.y + enemy.height / 2);
        dummy.rotation.set(0, -enemy.angle + Math.PI / 2, 0); // Y-up rotation

        // Scale (from State)
        const s = animState.scale;
        dummy.scale.set(s, s, s);

        dummy.updateMatrix();
    }

    /**
     * Helper to apply transform for a specific limb.
     * @param {THREE.Object3D} dummy 
     * @param {Enemy} enemy 
     * @param {Object} animState 
     * @param {number} rotX - Rotation for this specific limb
     * @param {number} xOff - Local X offset (pre-scale)
     * @param {number} yOff - Local Y offset (shoulder/hip height)
     * @param {number} len - Model Length
     * @param {number} width - Model Width
     */
    static applyLimbTransform(dummy, enemy, animState, rotX, xOff, yOff, len, width) {
        // Transform Logic:
        // 1. Re-construct Global position based on Body + Local Offset

        // Note: We duplicate some math here for purity, or we could pass Body Matrix.
        // Recalculating is safer for "dumb" dummy objects.

        const angle = -enemy.angle + Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Rotate the local offset by the body's rotation
        // xOff is the horizontal offset (left/right)
        const wX = xOff * cos;
        const wZ = xOff * -sin;

        // Position: Enemy Center + Rotated Offset
        dummy.position.set(
            (enemy.x + enemy.width / 2) + wX,
            yOff,
            (enemy.y + enemy.height / 2) + wZ
        );

        // Rotation: Limb Rotation (X) then Facing (Y)
        // YXZ Order: Swing first, then turn.
        dummy.rotation.set(rotX, angle, 0, 'YXZ');

        // Scale
        dummy.scale.set(width, len, width);

        dummy.updateMatrix();
    }

    /**
     * Calculates the Gun's transform.
     * @param {THREE.Object3D} dummy 
     * @param {Enemy} enemy 
     * @param {Object} animState 
     * @param {number} shoulderY 
     * @param {number} armX - Shoulder X offset
     * @param {number} armL - Arm Length
     * @param {number} s - Scale factor
     */
    static applyGunTransform(dummy, enemy, animState, shoulderY, armX, armL, s) {
        const rArmRot = animState.limbs.rArmRot;
        const angle = -enemy.angle + Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // 1. Shoulder Position (Global)
        const bX = enemy.x + enemy.width / 2;
        const bZ = enemy.y + enemy.height / 2;
        const sX = bX + (armX * cos);
        const sZ = bZ + (armX * -sin);

        // 2. Arm Vector (Local to body, then Local to Arm)
        // Arm rotates X. Vector(0, -armL, 0) rotated by X becomes (0, -L*cos, -L*sin)
        const tipLocalY = -armL * Math.cos(rArmRot);
        const tipLocalZ = -armL * Math.sin(rArmRot);

        // Apply Body Y rot to the tip vector (Z component rotates)
        const wTipX = tipLocalZ * sin;
        const wTipZ = tipLocalZ * cos;

        // Gun Pos
        dummy.position.set(sX + wTipX, shoulderY + tipLocalY, sZ + wTipZ);

        // Gun Rotation:
        // Combine Body Rotation + Arm Rotation + 90 degree offset for forward aim.
        dummy.rotation.set(rArmRot + Math.PI / 2, angle, 0, 'YXZ');

        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
    }
}
