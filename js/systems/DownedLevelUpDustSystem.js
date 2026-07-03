import * as THREE from 'three';

const MOTE_COUNT = 34;
// Slow-motion resume length (matches the skill-card descent feel)
const RESUME_RAMP_MS = 700;

/**
 * Consolation effect for a downed player's level-up (2P shares XP, so
 * both players level together). The downed player skips the pick and
 * gets no invigoration/heal — instead their XP-bar dust flies to the
 * body, orbits it briefly, then scatters off toward the upper half of
 * the screen: the level passes through them without taking hold.
 *
 * Takes a full turn in the UIManager level-up queue: the world freezes
 * exactly like an invigoration turn (everything the same, just no skill
 * pick) and onComplete advances the queue / resumes the game.
 * Runs from render3D on real dt while game.state is 'paused'.
 */
export class DownedLevelUpDustSystem {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.player = null;
        this.elapsed = 0;
        this._motes = [];
        this._endTime = 0;
        this._buildOverlay();
    }

    _buildOverlay() {
        this.overlay = document.createElement('canvas');
        this.overlay.id = 'downed-dust-canvas';
        Object.assign(this.overlay.style, {
            position: 'fixed',
            inset: '0',
            // Explicit CSS size — without it the canvas displays at its
            // intrinsic (dpr-scaled) size and everything lands off-target
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '90',
            display: 'none'
        });
        document.body.appendChild(this.overlay);
        this.overlayCtx = this.overlay.getContext('2d');
    }

    /**
     * Starts the dust tribute as a level-up queue turn. Freezes the
     * game like the invigoration does; onComplete fires when the dust
     * has scattered (advances the queue / resumes).
     */
    play(player, onComplete = null) {
        if (this.active) this._finish();

        this.active = true;
        this.player = player;
        this.onComplete = onComplete;
        this.elapsed = 0;

        // Freeze the world (render loop keeps running; update() does not)
        this.game.state = 'paused';
        if (this.game.weather) this.game.weather.hideWarning();
        if (this.game.resurrectionSystem) this.game.resurrectionSystem.hidePrompt();

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.overlay.width = window.innerWidth * dpr;
        this.overlay.height = window.innerHeight * dpr;
        this._overlayDpr = dpr;
        this.overlay.style.display = 'block';

        // Motes depart from that player's XP bar, like the invigoration dust
        const prefix = player.id === 1 ? 'p2' : 'p1';
        const barEl = this.game.ui.dom[prefix + 'XpBar'];
        const rect = barEl ? barEl.parentElement.getBoundingClientRect()
            : { left: 100, top: window.innerHeight - 40, width: 300, height: 14 };

        this._motes.length = 0;
        this._endTime = 0;
        for (let i = 0; i < MOTE_COUNT; i++) {
            const m = {
                sx: rect.left + Math.random() * rect.width,
                sy: rect.top + rect.height / 2 + (Math.random() - 0.5) * 8,
                t0: (i / MOTE_COUNT) * 450,
                flyDur: 480 + Math.random() * 220,
                // Curved approach (perpendicular bezier swing)
                swing: (Math.random() - 0.5) * 420,
                // Orbit around the body
                orbitDur: 650 + Math.random() * 500,
                radius: 24 + Math.random() * 22,
                angle0: Math.random() * Math.PI * 2,
                spin: (2.6 + Math.random() * 2.2) * (Math.random() < 0.5 ? -1 : 1),
                // Departure: random direction within the upper half of
                // the screen (-27°..-153°), accelerating away
                leaveAngle: -Math.PI * (0.15 + Math.random() * 0.7),
                leaveDur: 550 + Math.random() * 300,
                leaveDist: 380 + Math.random() * 320,
                size: 1.6 + Math.random() * 2.2,
                white: Math.random() * 0.7
            };
            this._motes.push(m);
            this._endTime = Math.max(this._endTime,
                m.t0 + m.flyDur + m.orbitDur + m.leaveDur);
        }

        // The queue hand-off fires as the scatter begins, so the slow-mo
        // resume overlaps the departing dust (like the card descent)
        this._rampStart = Math.max(0, this._endTime - RESUME_RAMP_MS);
        this._resumeFired = false;
        this._ramping = false;
    }

    /** True while the dust turn owns the screen (blocks pause/freeze toggles). */
    isPlaying() {
        return this.active;
    }

    /** Projects the downed body to overlay-canvas CSS pixels (lying low). */
    _playerScreenPoint() {
        const p = this.player;
        const cam = this.game.rendering.camera3D;
        const v = new THREE.Vector3(p.x + p.width / 2, 8, p.y + p.height / 2);
        v.project(cam);
        const canvasRect = this.game.canvas.getBoundingClientRect();
        return {
            x: canvasRect.left + (v.x * 0.5 + 0.5) * canvasRect.width,
            y: canvasRect.top + (-v.y * 0.5 + 0.5) * canvasRect.height
        };
    }

    /** Advances and draws. Call every render frame with real dt (ms). */
    update(dt) {
        if (!this.active || !this.player) return;

        dt *= this.game.timeScale || 1;
        this.elapsed += dt;

        // Hand off as the motes start scattering: advance the queue (or,
        // queue empty, resume the game in slow motion — timeDilation ramps
        // 0 -> 1 while the last dust leaves, same feel as a skill pick)
        if (!this._resumeFired && this.elapsed >= this._rampStart) {
            this._resumeFired = true;
            const queue = this.game.ui && this.game.ui.levelUpQueue;
            this._ramping = !queue || queue.length === 0;
            if (this._ramping) this.game.timeDilation = 0;
            const done = this.onComplete;
            this.onComplete = null;
            if (done) done();
        }
        if (this._ramping) {
            const k = Math.min(1, (this.elapsed - this._rampStart) / RESUME_RAMP_MS);
            const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            this.game.timeDilation = k >= 1 ? 1 : e;
        }

        if (this.elapsed >= this._endTime) {
            this._finish();
            return;
        }

        const ctx = this.overlayCtx;
        const dpr = this._overlayDpr || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, this.overlay.width / dpr, this.overlay.height / dpr);
        ctx.globalCompositeOperation = 'lighter';

        const center = this._playerScreenPoint();
        const color = this.player.color || '#44ccff';

        for (const m of this._motes) {
            const local = this.elapsed - m.t0;
            if (local <= 0) continue;

            let x, y, alpha;
            const orbitAt = (timeInOrbit) => {
                const a = m.angle0 + m.spin * (timeInOrbit / 1000);
                // Slight radius breathing so the swarm doesn't read as a rigid ring
                const r = m.radius * (1 + 0.12 * Math.sin(a * 2));
                return { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r * 0.6 };
            };

            if (local < m.flyDur) {
                // --- Fly-in: curved path from the XP bar to the orbit entry ---
                const entry = orbitAt(0);
                const f = local / m.flyDur;
                const e = f * f * (3 - 2 * f);
                const dx = entry.x - m.sx;
                const dy = entry.y - m.sy;
                const len = Math.max(1, Math.hypot(dx, dy));
                const nx = -dy / len, ny = dx / len;
                const c1x = m.sx + dx * 0.35 + nx * m.swing;
                const c1y = m.sy + dy * 0.35 + ny * m.swing;
                const omt = 1 - e;
                x = omt * omt * m.sx + 2 * omt * e * c1x + e * e * entry.x;
                y = omt * omt * m.sy + 2 * omt * e * c1y + e * e * entry.y;
                alpha = f < 0.12 ? f / 0.12 : 1;
            } else if (local < m.flyDur + m.orbitDur) {
                // --- Orbit: circle the body (flattened to match the view angle) ---
                const p = orbitAt(local - m.flyDur);
                x = p.x;
                y = p.y;
                alpha = 1;
            } else {
                // --- Departure: accelerate off toward the upper half of the screen ---
                const k = (local - m.flyDur - m.orbitDur) / m.leaveDur;
                const exit = orbitAt(m.orbitDur);
                const d = k * k * m.leaveDist;
                x = exit.x + Math.cos(m.leaveAngle) * d;
                y = exit.y + Math.sin(m.leaveAngle) * d;
                alpha = 1 - k;
            }

            // Soft glow dot with a bright core (same look as the levelup dust)
            const size = m.size;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            grad.addColorStop(0, `rgba(255,255,255,${0.85 * alpha})`);
            grad.addColorStop(0.35, this._rgba(color, 0.55 * alpha * (1 - m.white * 0.4)));
            grad.addColorStop(1, this._rgba(color, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _rgba(hex, a) {
        const n = parseInt(String(hex).replace('#', ''), 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }

    /** Natural end: hide, then advance the queue if it hasn't fired yet. */
    _finish() {
        const done = this.onComplete;
        this.cancel();
        if (done) done();
    }

    /** Aborts without the completion callback (game reset / exit to menu). */
    cancel() {
        // Never leave the game stuck in slow motion
        if (this._ramping) this.game.timeDilation = 1;
        this._ramping = false;
        this._resumeFired = false;
        this.active = false;
        this.player = null;
        this.onComplete = null;
        this._motes.length = 0;
        this.overlay.style.display = 'none';
    }
}
