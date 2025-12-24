import * as THREE from 'three';
import { POLAR_VORTEX_RADIUS, POLAR_VORTEX_INNER_RADIUS_RATIO } from '../constants.js';

export class PlayerMeshFactory {
    /**
     * Creates the player mesh hierarchy.
     * @param {Object} player - The player entity (for dimensions).
     * @returns {Object} { group, components, vortexMesh, stasisParticles }
     */
    static create(player) {
        const group = new THREE.Group();
        const components = {};

        // Stick Figure Materials
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x00ffff }); // Cyan stick figure
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });

        // --- Torso ---
        const torsoGeo = new THREE.BoxGeometry(4, 25, 4);
        const torso = new THREE.Mesh(torsoGeo, skinMat);
        torso.position.y = 40;
        torso.castShadow = true;
        group.add(torso);
        components.torso = torso;

        // --- Head ---
        const headGeo = new THREE.SphereGeometry(8, 16, 16);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 15;
        head.castShadow = true;
        head.rotation.order = 'YXZ';
        torso.add(head);
        components.head = head;

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
            mesh.castShadow = true;
            container.add(mesh);
            container.rotation.order = 'YXZ';
            return container;
        };

        // --- Arms ---
        const armLength = 18;
        components.leftArm = createLimb(3, armLength, 3, -6, 10, 0);
        torso.add(components.leftArm);

        components.rightArm = createLimb(3, armLength, 3, 6, 10, 0);
        torso.add(components.rightArm);

        // --- Legs ---
        const legLength = 28;
        components.leftLeg = createLimb(3, legLength, 3, -4, -12, 0);
        torso.add(components.leftLeg);

        components.rightLeg = createLimb(3, legLength, 3, 4, -12, 0);
        torso.add(components.rightLeg);

        // --- Weapon ---
        const gunGeo = new THREE.BoxGeometry(4, 4, 15);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        components.gun = new THREE.Mesh(gunGeo, gunMat);
        components.gun.position.set(2, -armLength, 0);
        components.gun.rotation.x = Math.PI / 2;
        components.rightArm.add(components.gun);

        // --- Second Weapon ---
        components.secondGun = new THREE.Mesh(gunGeo, gunMat);
        components.secondGun.position.set(-2, -armLength, 0);
        components.secondGun.rotation.x = Math.PI / 2;
        components.secondGun.visible = false;
        components.leftArm.add(components.secondGun);

        // --- Lights ---
        components.selfLight = new THREE.PointLight(0xffaa00, 1.0, 400, 2);
        components.selfLight.position.set(0, 50, 0);
        group.add(components.selfLight);

        components.spotLight = new THREE.SpotLight(0xffffff, 1.5);
        components.spotLight.position.set(0, 50, 0);
        components.spotLight.angle = Math.PI / 3;
        components.spotLight.penumbra = 0.2;
        components.spotLight.decay = 2;
        components.spotLight.distance = 2500;
        components.spotLight.castShadow = true;
        components.spotLight.shadow.mapSize.width = 1024;
        components.spotLight.shadow.mapSize.height = 1024;

        const target = new THREE.Object3D();
        target.position.set(100, 0, 0);
        group.add(target);
        components.spotLight.target = target;
        group.add(components.spotLight);

        // --- Shield ---
        const shieldGeo = new THREE.SphereGeometry(player.width, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.1,
            depthWrite: false
        });
        components.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        components.shieldMesh.visible = false;
        group.add(components.shieldMesh);

        // --- Shockwave ---
        const ringGeo = new THREE.RingGeometry(1, 2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        components.shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
        components.shockwaveMesh.rotation.x = -Math.PI / 2;
        components.shockwaveMesh.position.y = 5;
        components.shockwaveMesh.visible = false;
        group.add(components.shockwaveMesh);

        // --- Polar Vortex ---
        const vortexMesh = new THREE.Group();
        const stasisParticles = [];

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
            vortexMesh.add(mesh);
            stasisParticles.push({
                mesh: mesh,
                angle: Math.random() * Math.PI * 2,
                radius: innerR + Math.random() * (POLAR_VORTEX_RADIUS - innerR),
                radiusDrift: (Math.random() - 0.5) * 0.25,
                speed: 0.01 + Math.random() * 0.02,
                drift: 0.1 + Math.random() * 0.2
            });
        }

        // Scale down
        group.scale.set(0.85, 0.85, 0.85);

        return { group, components, vortexMesh, stasisParticles };
    }
}
