import * as THREE from 'three';

/**
 * Factory for creating and merging geometries used by the EnemyInstancedRenderer.
 * Encapsulates all mesh data generation.
 */
export class EnemyInstancedGeometry {

    /**
     * Creates all necessary geometries for the enemy renderer.
     * @returns {Object} { body, eyes, limbs, gun } - The generated geometries.
     */
    static createAll() {
        return {
            body: this.createBody(),
            eyes: this.createEyes(),
            limbs: this.createLimb(),
            gun: this.createGun()
        };
    }

    /**
     * Creates the main body geometry (Torso + Head merged).
     */
    static createBody() {
        // Torso: 4x25x4 box positioned at y=40 (relative to ground).
        const torsoGeo = new THREE.BoxGeometry(4, 25, 4);
        torsoGeo.translate(0, 40, 0);

        // Head: Radius 8 sphere positioned at y=55.
        const headGeo = new THREE.SphereGeometry(8, 8, 8); // Low poly for performance
        headGeo.translate(0, 55, 0);

        // Merge to reduce draw calls
        return this.mergeGeos([torsoGeo, headGeo]);
    }

    /**
     * Creates the eyes geometry (Left + Right merged).
     */
    static createEyes() {
        // Eye: r=1.5 at y=57, z=7.5 (+/- 3 x)
        const lEye = new THREE.SphereGeometry(1.5, 4, 4);
        lEye.translate(-3, 57, 7.5);

        const rEye = new THREE.SphereGeometry(1.5, 4, 4);
        rEye.translate(3, 57, 7.5);

        return this.mergeGeos([lEye, rEye]);
    }

    /**
     * Creates the generic limb geometry.
     * Uses a "Stick" geometry (Box 1x1x1) with pivot at the top (y=0).
     */
    static createLimb() {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        geo.translate(0, -0.5, 0); // Pivot at 0,0,0, extends down to -1
        return geo;
    }

    /**
     * Creates the gun geometry.
     */
    static createGun() {
        // Box 4x4x15
        const geo = new THREE.BoxGeometry(4, 4, 15);
        // Align so it sits on arm (Extends forward)
        geo.translate(0, 0, 7.5);
        return geo;
    }

    /**
     * Helper to merge multiple geometries into one BuffeGeometry.
     * Converts to non-indexed to ensure attribute stacks work simpler.
     * @param {THREE.BufferGeometry[]} geos 
     * @returns {THREE.BufferGeometry}
     */
    static mergeGeos(geos) {
        // Convert to non-indexed first to ensure we can just concat attributes
        const nonIndexedGeos = geos.map(g => {
            if (g.index) return g.toNonIndexed();
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
}
