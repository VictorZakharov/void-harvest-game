import * as THREE from 'three';
import { ENEMY_SPRITE_COLORS } from '../constants.js';

export class EnemyMeshFactory {
    /**
     * Creates the visual mesh hierarchy for an enemy.
     * @param {Object} enemy - The enemy entity.
     * @returns {Object} Structure containing group and component references.
     */
    static create(enemy) {
        const color = ENEMY_SPRITE_COLORS[enemy.type].main;

        // Stick Figure Materials
        const skinMat = new THREE.MeshStandardMaterial({ color: color });
        const headMat = new THREE.MeshStandardMaterial({ color: color });

        // Group for entire enemy
        const group = new THREE.Group();

        // --- Torso ---
        const isTank = enemy.type === 'tank';
        const torsoWidth = isTank ? 12 : 4;
        const torsoDepth = isTank ? 12 : 4;

        const torsoGeo = new THREE.BoxGeometry(torsoWidth, 25, torsoDepth);
        const torso = new THREE.Mesh(torsoGeo, skinMat);
        torso.position.y = 40;
        torso.castShadow = true;
        group.add(torso);

        const bodyMesh = torso; // Reference for coloring
        const baseColor = color;

        // --- Head ---
        const headGeo = new THREE.SphereGeometry(8, 16, 16);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 15;
        head.castShadow = false;
        torso.add(head);

        // --- Eyes ---
        const eyeGeo = new THREE.SphereGeometry(1.5, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-3, 2, 7);
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(3, 2, 7);
        head.add(rightEye);

        // --- Limbs Helper ---
        const createLimb = (w, h, d, x, y, z) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, skinMat);
            const container = new THREE.Group();
            container.position.set(x, y, z);
            mesh.position.y = -h / 2;
            mesh.castShadow = false;
            container.add(mesh);
            return { container, mesh };
        };

        const armLength = 18;
        const legLength = 28;

        // Limbs attached to torso
        const armXOffset = isTank ? 10 : 6;
        const legXOffset = isTank ? 6 : 4;

        const lArm = createLimb(3, armLength, 3, -armXOffset, 10, 0);
        const leftArm = lArm.container;
        torso.add(leftArm);

        const rArm = createLimb(3, armLength, 3, armXOffset, 10, 0);
        const rightArm = rArm.container;
        torso.add(rightArm);

        const lLeg = createLimb(3, legLength, 3, -legXOffset, -12, 0);
        const leftLeg = lLeg.container;
        torso.add(leftLeg);

        const rLeg = createLimb(3, legLength, 3, legXOffset, -12, 0);
        const rightLeg = rLeg.container;
        torso.add(rightLeg);

        // --- Weapon (Shooters/Ice) ---
        if (enemy.type === 'shooter' || enemy.type === 'ice') {
            const gunColor = enemy.type === 'ice' ? 0x88ccff : 0x333333;
            const gunGeo = new THREE.BoxGeometry(4, 4, 15);
            const gunMat = new THREE.MeshStandardMaterial({ color: gunColor });
            const gun = new THREE.Mesh(gunGeo, gunMat);

            gun.position.set(2, -armLength, 0);
            gun.rotation.x = Math.PI / 2;
            rightArm.add(gun);

            rightArm.rotation.x = -Math.PI / 2;
        }

        // --- Scale ---
        let scale = 0.85;
        if (enemy.type === 'tank') scale = 1.2;
        if (enemy.type === 'fast') scale = 0.7;

        group.scale.set(scale, scale, scale);

        // Health Bar
        const healthBar = EnemyMeshFactory.createHealthBar();
        group.add(healthBar);

        return {
            group,
            bodyMesh,
            baseColor,
            torso,
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            healthBar
        };
    }

    static createHealthBar() {
        const hpGroup = new THREE.Group();
        hpGroup.position.set(0, 70, 0);

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
        bg.castShadow = false;
        hpGroup.add(bg);
        hpGroup.bg = bg;

        const fgGeo = createPillGeo(50, 10);
        const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
        const fg = new THREE.Mesh(fgGeo, fgMat);
        fg.userData.isHealthBar = true;
        fg.position.z = 1;
        fg.position.x = -25;
        fg.castShadow = false;
        hpGroup.add(fg);
        hpGroup.foreground = fg;
        hpGroup.fg = fg;

        hpGroup.visible = false;
        return hpGroup;
    }
}
