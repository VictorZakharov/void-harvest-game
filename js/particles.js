import * as THREE from 'three';
import { PARTICLE_LIFETIME } from './constants.js';

export class Particle {
    constructor(x, y, color, vx, vy, lifetime = PARTICLE_LIFETIME) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.size = Math.random() * 3 + 2;

        // 3D Mesh
        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 5, y);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.lifetime--;

        // Update mesh
        if (this.mesh) {
            this.mesh.position.set(this.x, 5 + Math.random() * 2, this.y);
            this.mesh.material.opacity = this.lifetime / this.maxLifetime;
            this.mesh.rotation.x += 0.1;
            this.mesh.rotation.y += 0.1;
        }
    }

    draw(ctx) {
        // Replaced by 3D
    }

    isDead() {
        return this.lifetime <= 0;
    }
}
