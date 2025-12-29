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
            // Rotate mesh to match 2D facing angle.
            // Invert angle because 3D Y-rotation is counter-clockwise, while 2D canvas coordinates are inverted Y.
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
