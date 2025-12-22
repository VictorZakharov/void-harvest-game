import * as THREE from 'three';
import { EnemyVisuals } from '../entities/EnemyVisuals.js';

export class UI3DRenderer {
    constructor(size = 128) {
        this.size = size;
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(size, size);
        this.renderer.setClearColor(0x000000, 0); // Transparent background

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

        // Setup Lighting (High Intensity for UI popping)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Fill Light
        const fillLight = new THREE.DirectionalLight(0xccffff, 0.6);
        fillLight.position.set(-10, 5, -10);
        this.scene.add(fillLight);

        // Rim Light for pop
        const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
        rimLight.position.set(0, 10, -20);
        this.scene.add(rimLight);
    }

    renderEnemyToDataUrl(type) {
        // Clear previous meshes from scene
        if (this.subjectContainer) {
            this.scene.remove(this.subjectContainer);
        }
        this.subjectContainer = new THREE.Group();
        this.scene.add(this.subjectContainer);

        // Mock Enemy Object
        const mockEnemy = {
            type: type,
            // Add any other props EnemyVisuals needs
        };

        const visuals = new EnemyVisuals(mockEnemy);
        const mesh = visuals.mesh;

        // Center and Rotate Mesh
        // Enemy is height 0..63. Center is ~31.5.
        // We move it down so 0,0,0 is effectively the center of the body.
        let yOffset = -31;
        let camDist = 65;

        // Custom offsets for weird sizes
        if (type === 'tank') {
            yOffset = -45; // Move down significantly more
            camDist = 110;  // Pull camera back dramatically to ensure fit
        }

        mesh.position.y = yOffset;
        mesh.rotation.y = Math.PI / 8; // Slight pleasing perspective rotation
        this.subjectContainer.add(mesh);

        // Camera Positioning
        // Close up, looking slightly down.
        this.camera.position.set(25, 5, camDist);
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL();
    }

    dispose() {
        this.renderer.dispose();
    }
}
