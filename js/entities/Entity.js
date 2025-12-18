import * as THREE from 'three';

export class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;
        this.vy = 0;
        this.mesh = null;
    }

    createMesh() {
        return null;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.set(this.x + this.width / 2, 10, this.y + this.height / 2);
            // 2D angle is usually 0 = Right (+X), PI/2 = Down (+Y on screen, +Z in 3D logic here)
            // So we rotate around Y axis (Up). 
            // In 3D: +X is Right, +Z is Forward/Down.
            // Angle corresponds to rotation around -Y (because 2D Y is down/inverted vs standard Cartesian)
            // Actually, Math.atan2(y,x) expects y up. Canvas y is down. 
            // So angle is inverted? 
            // Let's just try negative angle first.
            this.mesh.rotation.y = -this.angle;
        }
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height,
            centerX: this.x + this.width / 2,
            centerY: this.y + this.height / 2
        };
    }

    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.left < b.right && a.right > b.left &&
            a.top < b.bottom && a.bottom > b.top;
    }
}
