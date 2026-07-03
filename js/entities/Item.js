import * as THREE from 'three';
import {
    ITEM_MAGNET_BASE_RANGE, ITEM_MOVE_SPEED
} from '../constants.js';
import { SpriteGenerator } from '../sprites.js';
import { Entity } from './Entity.js';

// Geometries are shared across all items of a type (positions/scales are per-mesh).
let heartGeometryCache = null;
function getHeartGeometry() {
    if (heartGeometryCache) return heartGeometryCache;

    // Classic bezier heart outline (drawn tip-up in shape space, flipped below)
    const shape = new THREE.Shape();
    shape.moveTo(5, 5);
    shape.bezierCurveTo(5, 5, 4, 0, 0, 0);
    shape.bezierCurveTo(-6, 0, -6, 7, -6, 7);
    shape.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
    shape.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
    shape.bezierCurveTo(16, 7, 16, 0, 10, 0);
    shape.bezierCurveTo(7, 0, 5, 5, 5, 5);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 5,
        bevelEnabled: true,
        bevelThickness: 1.5,
        bevelSize: 1.5,
        bevelSegments: 2,
        curveSegments: 12
    });
    geometry.rotateZ(Math.PI); // lobes up, tip down
    geometry.center();
    geometry.scale(1.1, 1.1, 1.1);

    heartGeometryCache = geometry;
    return geometry;
}

let essenceCoreGeometryCache = null;
function getEssenceCoreGeometry() {
    if (!essenceCoreGeometryCache) {
        essenceCoreGeometryCache = new THREE.IcosahedronGeometry(7, 1);
    }
    return essenceCoreGeometryCache;
}

// Lightning arcs radiating from the essence core
const ARC_COUNT = 5;         // simultaneous bolts per essence
const ARC_SEGMENTS = 5;      // jagged segments per bolt
const ARC_FLOATS = ARC_COUNT * ARC_SEGMENTS * 2 * 3; // line-segment pairs * xyz

export class Item extends Entity {
    constructor(x, y, type) {
        super(x, y, 12, 12);
        this.type = type;
        this.sprite = SpriteGenerator.createItemSprite(type);
        this.magnetRange = ITEM_MAGNET_BASE_RANGE;
        this.magnetSpeed = ITEM_MOVE_SPEED;

        // Illumination Memory
        this.isDiscovered = false;
        // Determine color based on type to store properly
        switch (this.type) {
            case 'xp': this.color = 0x00ff00; break;
            case 'health': this.color = 0xff0000; break;
            case 'weapon': this.color = 0x0088ff; break;
            default: this.color = 0xffffff;
        }

        this.mesh = this.createMesh();
    }

    update(playerX, playerY, playerMagnetBonus = 0, playerSpeed = 3, playerEntity = null, cursorX = null, cursorY = null, timeScale = 1.0) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check for "Discovery" (Visual Memory)
        // Check if item is within Light Radius of the Cursor (Main Light Source)
        // OR close to player (Self Light fallback, usually smaller)
        if (!this.isDiscovered && playerEntity) {
            const lightRadius = playerEntity.getLightRadius();

            // Check cursor distance (Main Light)
            if (cursorX !== null && cursorY !== null) {
                const distToCursor = Math.sqrt((cursorX - this.x) ** 2 + (cursorY - this.y) ** 2);
                if (distToCursor < lightRadius) {
                    this.isDiscovered = true;
                }
            }

            // Check player distance (Self Light - smaller radius backup)
            if (!this.isDiscovered && dist < lightRadius * 0.6) {
                this.isDiscovered = true;
            }

            if (this.isDiscovered) {
                this.applyDiscoveredVisuals();
            }
        }

        // Fallback for logic without entity ref or cursor ref
        if (!this.isDiscovered && !playerEntity && dist < 500) {
            // Backward compat fallback
            this.isDiscovered = true;
            this.applyDiscoveredVisuals();
        }

        // Magnet effect with bonus range
        const effectiveMagnetRange = this.magnetRange * (1 + playerMagnetBonus);
        if (dist < effectiveMagnetRange && dist > 0) {
            // Magnet pull speed is always 10% faster than player speed
            const effectiveMagnetSpeed = playerSpeed * 1.1;
            this.vx = (dx / dist) * effectiveMagnetSpeed * timeScale;
            this.vy = (dy / dist) * effectiveMagnetSpeed * timeScale;
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    draw(ctx) {
        // Replaced by 3D
    }

    createMesh() {
        switch (this.type) {
            case 'health': return this.createHeartMesh();
            case 'xp': return this.createEssenceMesh();
            default: return this.createPyramidMesh();
        }
    }

    createPyramidMesh() {
        // Cone with 3 segments = pyramid/tetrahedron shape (weapon pickups)
        const geometry = new THREE.ConeGeometry(this.width * 1.6, this.width * 2.4, 3);
        const material = new THREE.MeshLambertMaterial({ color: this.color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { rotationSpeed: (Math.random() * 0.1 + 0.05) / 3, hoverHeight: 5 };
        return mesh;
    }

    createHeartMesh() {
        const material = new THREE.MeshLambertMaterial({ color: 0xff2244 });
        const mesh = new THREE.Mesh(getHeartGeometry(), material);
        mesh.userData = {
            rotationSpeed: 0.025,
            hoverHeight: 14,
            animTime: Math.random() * 100
        };
        return mesh;
    }

    createEssenceMesh() {
        const group = new THREE.Group();

        // Glowing core orb
        const core = new THREE.Mesh(
            getEssenceCoreGeometry(),
            new THREE.MeshLambertMaterial({ color: 0x00ff44 })
        );
        group.add(core);

        // Lightning arcs (per-item geometry: rebuilt every few frames for flicker)
        const arcGeometry = new THREE.BufferGeometry();
        arcGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_FLOATS), 3));
        const arcMaterial = new THREE.LineBasicMaterial({
            color: 0xaaffcc,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false // arcs bloom once ignited
        });
        const arcs = new THREE.LineSegments(arcGeometry, arcMaterial);
        arcs.visible = false; // ignite on discovery so darkness stays dark

        // Bright tips at the end of each bolt
        const tipGeometry = new THREE.BufferGeometry();
        tipGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_COUNT * 3), 3));
        const tipMaterial = new THREE.PointsMaterial({
            color: 0xccffdd,
            size: 4,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
            sizeAttenuation: true
        });
        const tips = new THREE.Points(tipGeometry, tipMaterial);
        tips.visible = false;
        arcs.add(tips);
        group.add(arcs);

        group.userData = {
            core,
            arcs,
            tips,
            animTime: Math.random() * 100,
            arcTimer: 0,
            hoverHeight: 9
        };
        return group;
    }

    /**
     * Rebuilds the lightning bolt geometry: each bolt shoots from the core
     * surface outward in a random direction with midpoint jitter.
     */
    regenerateArcs(ud) {
        const posAttr = ud.arcs.geometry.attributes.position;
        const tipAttr = ud.tips.geometry.attributes.position;
        const pos = posAttr.array;
        let w = 0;

        for (let j = 0; j < ARC_COUNT; j++) {
            // ~1 in 4 bolts sits out this cycle (flicker)
            const active = Math.random() > 0.25;

            // Random outward direction, biased toward the horizontal plane
            const theta = Math.random() * Math.PI * 2;
            const vy = (Math.random() - 0.5) * 1.2;
            const len = active ? 12 + Math.random() * 9 : 0;
            const dirX = Math.cos(theta), dirZ = Math.sin(theta);

            // Perpendicular (horizontal) for jitter
            const perpX = -dirZ, perpZ = dirX;

            let px = dirX * 6, py = vy * 3, pz = dirZ * 6; // start at core surface
            tipAttr.array[j * 3] = px;
            tipAttr.array[j * 3 + 1] = py;
            tipAttr.array[j * 3 + 2] = pz;

            for (let s = 1; s <= ARC_SEGMENTS; s++) {
                const t = s / ARC_SEGMENTS;
                // Jitter fades to zero at the tip so bolts end in a point
                const amp = (s === ARC_SEGMENTS) ? 0 : (1 - t) * 4;
                const jag = (Math.random() - 0.5) * 2 * amp;
                const nx = dirX * (6 + len * t) + perpX * jag;
                const ny = vy * (3 + len * t * 0.6) + (Math.random() - 0.5) * amp;
                const nz = dirZ * (6 + len * t) + perpZ * jag;

                pos[w++] = px; pos[w++] = py; pos[w++] = pz;
                pos[w++] = nx; pos[w++] = ny; pos[w++] = nz;
                px = nx; py = ny; pz = nz;
            }

            if (active) {
                tipAttr.array[j * 3] = px;
                tipAttr.array[j * 3 + 1] = py;
                tipAttr.array[j * 3 + 2] = pz;
            }
        }

        posAttr.needsUpdate = true;
        tipAttr.needsUpdate = true;
    }

    applyDiscoveredVisuals() {
        if (!this.mesh) return;
        this.mesh.traverse(child => {
            if (child.material && child.material.emissive) {
                // Set emissive to 50% of base color to ensure minimum 50% brightness
                child.material.emissive.setHex(this.color);
                child.material.emissiveIntensity = 0.5;
            }
        });
        if (this.mesh.userData.arcs) {
            this.mesh.userData.arcs.visible = true;
            this.mesh.userData.tips.visible = true;
        }
    }

    updateMesh() {
        if (!this.mesh) return;
        const ud = this.mesh.userData;
        let hoverY = ud.hoverHeight || 5;

        if (this.type === 'xp') {
            ud.animTime += 1;
            const t = ud.animTime;

            // Pulse the core
            const pulse = 1 + Math.sin(t * 0.08) * 0.15;
            ud.core.scale.setScalar(pulse);

            // Crackle the lightning: rebuild bolts every few frames
            if (ud.arcs.visible) {
                ud.arcTimer -= 1;
                if (ud.arcTimer <= 0) {
                    this.regenerateArcs(ud);
                    ud.arcTimer = 3 + Math.floor(Math.random() * 4);
                }
                // Fast opacity flicker on top of the rebuild cadence
                ud.arcs.material.opacity = 0.6 + Math.random() * 0.4;
            }
        } else {
            this.mesh.rotation.y += ud.rotationSpeed;
            if (this.type === 'health') {
                ud.animTime += 1;
                hoverY += Math.sin(ud.animTime * 0.05) * 2.5;
            }
        }

        this.mesh.position.set(this.x + this.width / 2, hoverY, this.y + this.height / 2);
    }
}
