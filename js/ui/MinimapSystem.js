import { CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_SPRITE_COLORS } from '../constants.js';

// Item dot colors (match Item.js mesh colors)
const ITEM_COLORS = {
    xp: '#00cc44',
    health: '#ff4444',
    weapon: '#4499ff'
};

/**
 * Circular radar minimap (top-right HUD).
 *
 * Shows, relative to Player 1 and rotated to match camera yaw:
 * - Enemies: only when inside the cursor light (fog of war respected,
 *   with the same fade band as EnemyInstancedRenderer)
 * - Enemy projectiles ("shots fired" at the player)
 * - Powerups/items: always visible, regardless of fog of war
 * - Players: dot + facing cone
 * - Arena boundary and the cursor light circle for orientation
 *
 * World coverage scales with the Light Radius upgrade (more world shown
 * in the same physical widget size).
 */
export class MinimapSystem {
    constructor(game, container, canvas) {
        this.game = game;
        this.container = container;
        this.canvas = canvas;

        // Fixed physical size; backing store at 2x for crispness
        this.size = 176;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.size * this.dpr;
        this.canvas.height = this.size * this.dpr;
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Effective enemy-visibility radius around the cursor light.
     * Mirrors EnemyInstancedRenderer: lightHeight(300 * mult) * 1.8.
     */
    getVisibilityRadius(player) {
        const mult = player ? (1 + player.lightRadiusBonus) : 1;
        return 300 * mult * 1.8;
    }

    update() {
        const game = this.game;
        const playing = game.state === 'playing' || game.state === 'paused';
        this.container.classList.toggle('hidden', !playing);
        if (!playing) return;

        const player = game.player;
        if (!player) return;

        const ctx = this.ctx;
        const dpr = this.dpr;
        const size = this.size;
        const half = size / 2;

        const bounds = player.getBounds();
        const cx = bounds.centerX;
        const cy = bounds.centerY;

        // Coverage scales with light radius upgrade; widget size stays fixed
        const visRadius = this.getVisibilityRadius(player);
        const worldRadius = visRadius * 1.5;
        const scale = half / worldRadius;

        // Rotate world so minimap "up" matches screen "up" (inverse of camYaw)
        const yaw = game.rendering.camYaw || 0;
        const c = Math.cos(yaw);
        const s = Math.sin(yaw);
        const toMap = (wx, wy) => {
            const dx = wx - cx;
            const dy = wy - cy;
            return {
                x: half + (c * dx - s * dy) * scale,
                y: half + (s * dx + c * dy) * scale
            };
        };

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);

        // Circular clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(half, half, half - 1, 0, Math.PI * 2);
        ctx.clip();

        // Background
        const bg = ctx.createRadialGradient(half, half, 0, half, half, half);
        bg.addColorStop(0, 'rgba(8, 16, 26, 0.78)');
        bg.addColorStop(1, 'rgba(4, 8, 14, 0.88)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);

        // Range rings + crosshair
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.10)';
        ctx.lineWidth = 1;
        [0.33, 0.66].forEach(r => {
            ctx.beginPath();
            ctx.arc(half, half, half * r, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.beginPath();
        ctx.moveTo(half, 0); ctx.lineTo(half, size);
        ctx.moveTo(0, half); ctx.lineTo(size, half);
        ctx.stroke();

        // Arena boundary (rotates with camera)
        const b0 = toMap(0, 0);
        const b1 = toMap(CANVAS_WIDTH, 0);
        const b2 = toMap(CANVAS_WIDTH, CANVAS_HEIGHT);
        const b3 = toMap(0, CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b0.x, b0.y);
        ctx.lineTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.lineTo(b3.x, b3.y);
        ctx.closePath();
        ctx.stroke();

        // Cursor light circle (the "vision zone" enemies appear inside)
        const cursor = game.lighting.getCursorTarget();
        if (cursor) {
            const lp = toMap(cursor.x, cursor.z);
            ctx.strokeStyle = 'rgba(255, 255, 210, 0.14)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(lp.x, lp.y, visRadius * scale, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Items/powerups: always visible, ignore fog of war
        const items = game.itemManager ? game.itemManager.items : [];
        for (const item of items) {
            const p = toMap(item.x, item.y);
            if (p.x < -4 || p.x > size + 4 || p.y < -4 || p.y > size + 4) continue;
            ctx.fillStyle = ITEM_COLORS[item.type] || '#ffffff';
            ctx.globalAlpha = item.type === 'xp' ? 0.75 : 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, item.type === 'xp' ? 1.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Enemies: fog of war applies (same rule + fade band as the 3D renderer)
        if (cursor) {
            const fadeDistance = 150;
            for (const enemy of game.enemies) {
                const dCursor = Math.sqrt((enemy.x - cursor.x) ** 2 + (enemy.y - cursor.z) ** 2);
                if (dCursor > visRadius) continue;

                let alpha = 1;
                if (dCursor > visRadius - fadeDistance) {
                    alpha = (visRadius - dCursor) / fadeDistance;
                    if (alpha < 0.05) continue;
                }

                const p = toMap(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                if (p.x < -4 || p.x > size + 4 || p.y < -4 || p.y > size + 4) continue;

                const col = ENEMY_SPRITE_COLORS[enemy.type];
                ctx.fillStyle = col ? col.main : '#ff0000';
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, enemy.type === 'tank' ? 3 : 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Enemy projectiles (player shots intentionally excluded)
        const bullets = game.bulletManager ? game.bulletManager.bullets : [];
        ctx.fillStyle = '#ff8844';
        for (const bullet of bullets) {
            if (bullet.isPlayer) continue;
            const p = toMap(bullet.x, bullet.y);
            if (p.x < -2 || p.x > size + 2 || p.y < -2 || p.y > size + 2) continue;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Players: facing cone + dot
        for (const p of game.players) {
            if (!p || p.health <= 0) continue;
            const pb = p.getBounds();
            const pos = toMap(pb.centerX, pb.centerY);
            const color = p.color || '#00ffff';

            // Facing cone (world angle rotated into map space)
            const mapAngle = p.angle + yaw;
            const coneLen = 26;
            const coneHalf = 0.4;
            const grad = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, coneLen);
            grad.addColorStop(0, this.rgba(color, 0.45));
            grad.addColorStop(1, this.rgba(color, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.arc(pos.x, pos.y, coneLen, mapAngle - coneHalf, mapAngle + coneHalf);
            ctx.closePath();
            ctx.fill();

            // Player dot
            ctx.fillStyle = color;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    /** '#rrggbb' -> 'rgba(r,g,b,a)' */
    rgba(hex, a) {
        const n = parseInt(hex.replace('#', ''), 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }
}
