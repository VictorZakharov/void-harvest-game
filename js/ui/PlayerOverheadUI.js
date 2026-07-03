import * as THREE from 'three';

/**
 * Manages overhead UI (Health Bar + Text) for players.
 * Replaces the static HUD health bars in Multiplayer (or optionally SP).
 */
export class PlayerOverheadUI {
    constructor(scene) {
        this.scene = scene;
        this.bars = new Map(); // Map<Player, Sprite>
    }

    /**
     * Registers a player to have an overhead health bar.
     * @param {Player} player 
     */
    register(player) {
        if (this.bars.has(player)) return;

        // Create Sprite
        const sprite = this.createHealthBarSprite(player);
        this.scene.add(sprite);
        this.bars.set(player, { sprite, lastHealth: -1, lastMaxHealth: -1 });
    }

    createHealthBarSprite(player) {
        // ULTRA High resolution canvas for crisp text
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false; // Prevent blurring on zoom out
        texture.anisotropy = 16; // Max sharpness at angles

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        // Scale in world units. 
        // Larger physical size helps prevent minification artifacts.
        sprite.scale.set(80, 20, 1);
        sprite.renderOrder = 1000; // on top

        // Initial draw
        this.drawCanvas(ctx, player.health, player.maxHealth, player.color);

        return sprite;
    }

    /**
     * Multiplies a hex color's channels by the given factor.
     * @param {string} color - Hex color (#rrggbb or #rgb)
     * @param {number} factor - 0..1 brightness multiplier
     * @returns {string} rgb() color string
     */
    dimColor(color, factor) {
        let r = 0, g = 255, b = 0;
        if (color && color.length === 7) {
            r = parseInt(color.substr(1, 2), 16);
            g = parseInt(color.substr(3, 2), 16);
            b = parseInt(color.substr(5, 2), 16);
        } else if (color && color.length === 4) {
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
        }
        return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
    }

    drawCanvas(ctx, health, maxHealth, color) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background (Black box with opacity)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        // Corner radius scaled to resolution
        ctx.roundRect(0, 0, w, h, 64);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 12; // Scaled border
        ctx.stroke();

        // Health Bar Fill
        const pct = Math.max(0, health / maxHealth);

        // Use a dimmed Player Color for the bar (keeps luminance under the
        // bloom threshold so the overhead UI doesn't glow / distract)
        ctx.fillStyle = this.dimColor(color || '#00ff00', 0.72);

        const pad = 32; // Scaled padding
        ctx.beginPath();
        ctx.roundRect(pad, pad, (w - pad * 2) * pct, h - pad * 2, 48);
        ctx.fill();

        // --- Text ---
        const cx = w / 2;
        const cy = h / 2;
        const text = `${Math.ceil(health)}/${Math.ceil(maxHealth)}`;

        // Massive font size for 512px height
        ctx.font = '900 350px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Determine Contrast Color (Black or White)
        // Simple hex to RGB conversion
        let r = 0, g = 0, b = 0;
        if (color && color.length === 7) {
            r = parseInt(color.substr(1, 2), 16);
            g = parseInt(color.substr(3, 2), 16);
            b = parseInt(color.substr(5, 2), 16);
        } else if (color && color.length === 4) {
            // Handle #F00 etc
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
        } else {
            // Default green-ish
            r = 0; g = 255; b = 0;
        }

        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        // "White" is dimmed to stay under the bloom luminance threshold,
        // like the bar fill above — pure #ffffff makes the whole bar glow
        const white = '#d0d0d0';
        const textColor = (yiq >= 128) ? '#000000' : white;
        const outlineColor = (yiq >= 128) ? white : '#000000';

        // Outline (Opposite of text for max readbility)
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 12;
        ctx.strokeText(text, cx, cy);

        // Fill (Contrast Color)
        ctx.fillStyle = textColor;
        ctx.fillText(text, cx, cy);
    }

    update() {
        for (const [player, data] of this.bars) {
            // Position above player
            if (!player.mesh) continue; // Waiting for mesh

            data.sprite.position.set(player.x + player.width / 2, 60, player.y + player.height / 2); // Fixed height offset

            // Redraw if changed
            if (player.health !== data.lastHealth || player.maxHealth !== data.lastMaxHealth) {
                const ctx = data.sprite.material.map.image.getContext('2d');
                this.drawCanvas(ctx, player.health, player.maxHealth, player.color);
                data.sprite.material.map.needsUpdate = true;

                data.lastHealth = player.health;
                data.lastMaxHealth = player.maxHealth;
            }
        }
    }

    clear() {
        for (const [player, data] of this.bars) {
            this.scene.remove(data.sprite);
            data.sprite.material.map.dispose();
            data.sprite.material.dispose();
        }
        this.bars.clear();
    }
}
