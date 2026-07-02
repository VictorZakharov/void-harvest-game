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
        // toneMapped:false keeps sparks HDR-bright so they feed the bloom pass
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false
        });
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
            const life = this.lifetime / this.maxLifetime;
            this.mesh.material.opacity = life;
            // Sparks shrink as they burn out
            const s = 0.3 + life * 0.7;
            this.mesh.scale.set(s, s, s);
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
