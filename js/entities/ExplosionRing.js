import * as THREE from 'three';

export class ExplosionRing {
    constructor(x, y, color, maxRadius, duration = 20) {
        this.x = x;
        this.y = y;
        this.maxRadius = maxRadius;
        this.duration = duration;
        this.timer = 0;

        const geometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 6, y); // Slightly higher than particles
        this.mesh.rotation.x = -Math.PI / 2; // Flat on ground
    }

    update() {
        this.timer++;
        const progress = this.timer / this.duration;
        const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out

        const currentRadius = this.maxRadius * easeOut;

        // Update scale to match radius (RingGeometry base is small)
        // Inner radius 0.1, Outer 0.5. So scale of 1 = outer radius 0.5.
        // We want outer radius = currentRadius.
        // So scale = currentRadius / 0.5 = currentRadius * 2
        const scale = currentRadius * 2;
        this.mesh.scale.set(scale, scale, 1);

        // Fade out
        this.mesh.material.opacity = 0.8 * (1 - progress);
    }

    isDead() {
        return this.timer >= this.duration;
    }
}
