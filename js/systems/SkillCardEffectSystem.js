// ==================== SKILL CARD PICK CINEMATIC ====================
// When a skill card is chosen during level-up, the other cards and modal
// chrome fade away, the chosen card glides to the center of the screen
// over the frozen game, then shrinks and flies down into that player's
// active-skills HUD area with a particle trail and absorption burst.
//
// While the card flies down (and only if no other player's level-up is
// queued) the game unfreezes in slow motion: game.timeDilation ramps
// 0 -> 1 so gameplay speed eases back up to normal as the card lands.
//
// Runs on real time from render3D (game is state='paused' for most of it),
// scaled by game.timeScale so the slow-mo setting slows the cinematic too.
import {
    SKILLCARD_CENTER_MS,
    SKILLCARD_HOLD_MS,
    SKILLCARD_FLY_MS,
    SKILLCARD_TAIL_MS
} from '../constants.js';

const SPARKLE_COUNT = 26;

export class SkillCardEffectSystem {
    constructor(game) {
        this.game = game;

        this.active = false;
        this.phase = 'idle'; // center -> hold -> fly -> tail
        this.elapsed = 0;
        this.player = null;
        this.onDone = null;
        this.doneFired = false;
        this.ramping = false;

        this.wrap = null;      // fixed-position clone wrapper element
        this.cardEl = null;    // original card (kept hidden until cleanup)
        this.from = null;      // start position {x, y} (card center) + size {w, h}
        this.center = null;    // screen-center hover point + scale
        this.target = null;    // HUD landing point + final scale
        this.flyStarted = false;
        this.burstDone = false;

        this.sparkles = [];    // orbiting sparkles (parameters fixed at spawn)
        this.particles = [];   // trail + burst particles

        this._buildOverlay();
    }

    _buildOverlay() {
        const canvas = document.createElement('canvas');
        canvas.id = 'skillcard-fx-canvas';
        // Explicit CSS width/height required: a replaced element with inset:0
        // does NOT stretch and would render at its intrinsic (dpr-scaled) size
        Object.assign(canvas.style, {
            position: 'fixed',
            inset: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '2001',
            display: 'none'
        });
        document.body.appendChild(canvas);
        this.overlay = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = 1;
    }

    isPlaying() {
        // The tail (afterglow particles) no longer owns the screen —
        // input toggles (ESC/SPACE) are only swallowed before that
        return this.active && this.phase !== 'tail';
    }

    /**
     * @param {HTMLElement} cardEl - The clicked .skill-option element.
     * @param {Player} player - The player who picked the skill.
     * @param {Function} onDone - Fired when the game may resume / advance the
     *   level-up queue (at the start of the fly-down, so the slow-motion
     *   resume overlaps the card's descent).
     */
    play(cardEl, player, onDone) {
        if (this.active) this._finish();

        this.player = player;
        this.onDone = onDone;
        this.doneFired = false;
        this.elapsed = 0;
        this.phase = 'center';
        this.flyStarted = false;
        this.burstDone = false;
        this.ramping = false;
        this.active = true;
        this.sparkles = [];
        this.particles = [];

        const color = player.color || '#44ccff';
        const rect = cardEl.getBoundingClientRect();
        this.from = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            w: rect.width,
            h: rect.height
        };

        // Hover point: screen center, scaled up slightly for drama
        this.center = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            s: Math.min(1.18, (window.innerWidth * 0.34) / rect.width)
        };

        // Build the flying clone (original card stays hidden in the modal)
        const clone = cardEl.cloneNode(true);
        clone.style.transform = 'none'; // strip parallax tilt
        clone.style.transition = 'none';
        clone.style.margin = '0';
        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.style.minHeight = '0';
        clone.style.pointerEvents = 'none';
        // Solid-ish backdrop so the card stays readable over the frozen game
        clone.style.background = 'rgba(6, 20, 26, 0.92)';
        clone.style.borderColor = color;
        clone.style.boxShadow = `0 0 30px ${color}90, 0 0 70px ${color}40`;

        const wrap = document.createElement('div');
        Object.assign(wrap.style, {
            position: 'fixed',
            left: '0',
            top: '0',
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            zIndex: '2000',
            pointerEvents: 'none',
            willChange: 'transform, opacity',
            transformOrigin: 'center center'
        });
        wrap.appendChild(clone);
        document.body.appendChild(wrap);
        this.wrap = wrap;

        cardEl.style.visibility = 'hidden';
        this.cardEl = cardEl;

        // Fade out the modal chrome + unchosen cards (CSS transition)
        this.game.ui.dom.levelupModal.classList.add('card-picked');

        // Orbiting sparkles: all parameters randomized once at spawn,
        // motion is smooth/periodic (no per-frame flicker)
        for (let i = 0; i < SPARKLE_COUNT; i++) {
            this.sparkles.push({
                angle: (i / SPARKLE_COUNT) * Math.PI * 2,
                speed: 0.8 + Math.random() * 1.4,
                rx: 0.95 + Math.random() * 0.35,
                ry: 0.95 + Math.random() * 0.35,
                size: 1.2 + Math.random() * 2.2,
                phase: Math.random() * Math.PI * 2,
                white: Math.random() * 0.7
            });
        }

        // Size the overlay canvas (dpr capped at 2 to bound fill cost)
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.overlay.width = Math.floor(window.innerWidth * this.dpr);
        this.overlay.height = Math.floor(window.innerHeight * this.dpr);
        this.overlay.style.display = 'block';

        this._setCardTransform(this.from.x, this.from.y, 1, 0, 1);
    }

    /** Landing spot: the newest badge in the player's active-skills HUD. */
    _computeTarget() {
        const dom = this.game.ui.dom;
        const prefix = this.player.id === 1 ? 'p2' : 'p1';
        const container = dom[prefix + 'ActiveSkills'];
        let rect = null;
        if (container) {
            const badge = container.lastElementChild;
            rect = (badge || container).getBoundingClientRect();
        }
        if (!rect || (rect.width === 0 && rect.height === 0)) {
            const panel = dom[prefix + 'Panel'];
            if (panel) rect = panel.getBoundingClientRect();
        }
        if (!rect) {
            return { x: window.innerWidth / 2, y: window.innerHeight - 60, s: 0.06 };
        }
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            s: Math.max(0.04, Math.max(24, rect.width) / this.from.w)
        };
    }

    update(dt) {
        if (!this.active) return;

        // Game speed modifier slows the cinematic too
        dt *= (this.game.timeScale || 1);
        this.elapsed += dt;
        const t = this.elapsed / 1000;

        const centerT = Math.min(1, this.elapsed / SKILLCARD_CENTER_MS);
        const holdEnd = SKILLCARD_CENTER_MS + SKILLCARD_HOLD_MS;
        const flyT = Math.min(1, Math.max(0, (this.elapsed - holdEnd) / SKILLCARD_FLY_MS));

        let cx, cy, scale = 1, rot = 0, opacity = 1;

        if (this.elapsed < SKILLCARD_CENTER_MS) {
            // Glide from the modal slot to screen center, scaling up
            this.phase = 'center';
            const e = easeOutCubic(centerT);
            cx = lerp(this.from.x, this.center.x, e);
            cy = lerp(this.from.y, this.center.y, e);
            scale = lerp(1, this.center.s, e);
        } else if (this.elapsed < holdEnd) {
            // Hover at center over the frozen game with a gentle float
            this.phase = 'hold';
            cx = this.center.x;
            cy = this.center.y + Math.sin(t * 2.4) * 5;
            scale = this.center.s + Math.sin(t * 3.1) * 0.012;
        } else {
            // Fly down into the player's skill HUD
            if (!this.flyStarted) this._beginFly();
            this.phase = flyT >= 1 ? 'tail' : 'fly';

            const e = easeInOutCubic(flyT);
            const p = this._flyPoint(e);
            cx = p.x;
            cy = p.y;
            scale = lerp(this.center.s, this.target.s, e);
            // Slight banking tilt along the arc
            const dir = this.target.x >= this.center.x ? 1 : -1;
            rot = Math.sin(flyT * Math.PI) * 9 * dir;
            opacity = flyT > 0.82 ? Math.max(0, 1 - (flyT - 0.82) / 0.18) : 1;

            // Slow-motion resume: gameplay speed eases 0 -> 1 with the descent
            if (this.ramping) {
                this.game.timeDilation = flyT >= 1 ? 1 : easeInOutCubic(flyT);
            }

            // Particle trail behind the descending card
            if (flyT < 1) this._spawnTrail(cx, cy, dt);

            if (flyT >= 1 && !this.burstDone) {
                this.burstDone = true;
                if (this.ramping) this.game.timeDilation = 1;
                this._spawnBurst(this.target.x, this.target.y);
                if (this.wrap) {
                    this.wrap.remove();
                    this.wrap = null;
                }
            }
        }

        if (this.wrap) this._setCardTransform(cx, cy, scale, rot, opacity);

        this._updateParticles(dt);
        this._draw(cx, cy, scale, t);

        if (this.elapsed >= holdEnd + SKILLCARD_FLY_MS + SKILLCARD_TAIL_MS) {
            this._finish();
        }
    }

    _beginFly() {
        this.flyStarted = true;
        this.target = this._computeTarget();

        // Slow-motion resume only applies when no other player's level-up
        // is queued — otherwise the game stays frozen for the next animation
        const queue = this.game.ui.levelUpQueue;
        this.ramping = !queue || queue.length === 0;
        if (this.ramping) this.game.timeDilation = 0;

        // The modal chrome has finished fading; remove it for real.
        // onDone resumes the game (queue empty) or starts the next
        // player's invigoration (queue non-empty) while the card flies.
        const dom = this.game.ui.dom;
        dom.hide(dom.levelupModal);
        dom.levelupModal.classList.remove('card-picked');
        if (this.cardEl) {
            this.cardEl.style.visibility = '';
            this.cardEl = null;
        }
        this._fireDone();
    }

    /** Cubic bezier: lift slightly off center, then swoop down into the HUD. */
    _flyPoint(e) {
        const p0 = this.center;
        const p3 = this.target;
        const dx = p3.x - p0.x;
        const c1x = p0.x + dx * 0.10, c1y = p0.y - 130;
        const c2x = p3.x - dx * 0.25, c2y = p3.y - 220;
        const u = 1 - e;
        return {
            x: u * u * u * p0.x + 3 * u * u * e * c1x + 3 * u * e * e * c2x + e * e * e * p3.x,
            y: u * u * u * p0.y + 3 * u * u * e * c1y + 3 * u * e * e * c2y + e * e * e * p3.y
        };
    }

    _setCardTransform(cx, cy, scale, rot, opacity) {
        this.wrap.style.transform =
            `translate(${cx - this.from.w / 2}px, ${cy - this.from.h / 2}px) scale(${scale}) rotate(${rot}deg)`;
        this.wrap.style.opacity = `${opacity}`;
    }

    _spawnTrail(cx, cy, dt) {
        const count = Math.min(4, Math.max(1, Math.round(dt / 6)));
        const color = this.player.color || '#44ccff';
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 15 + Math.random() * 55;
            this.particles.push({
                x: cx + (Math.random() - 0.5) * 30,
                y: cy + (Math.random() - 0.5) * 20,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 25,
                life: 0,
                maxLife: 300 + Math.random() * 280,
                size: 1.4 + Math.random() * 2.4,
                white: Math.random() * 0.6,
                color
            });
        }
    }

    _spawnBurst(x, y) {
        const color = this.player.color || '#44ccff';
        for (let i = 0; i < 42; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 90 + Math.random() * 260;
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0,
                maxLife: 320 + Math.random() * 300,
                size: 1.5 + Math.random() * 2.8,
                white: Math.random() * 0.8,
                color
            });
        }
        // Expanding absorption ring
        this.ring = { x, y, life: 0, maxLife: 380 };
    }

    _updateParticles(dt) {
        const dts = dt / 1000;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dts;
            p.y += p.vy * dts;
            p.vx *= Math.pow(0.5, dts * 2); // drag
            p.vy *= Math.pow(0.5, dts * 2);
        }
        if (this.ring) {
            this.ring.life += dt;
            if (this.ring.life >= this.ring.maxLife) this.ring = null;
        }
    }

    _draw(cx, cy, scale, t) {
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.globalCompositeOperation = 'lighter';

        const color = this.player.color || '#44ccff';

        // Orbiting sparkles hug the card during center/hold, fade during fly
        let sparkleAlpha = 1;
        if (this.phase === 'fly' || this.phase === 'tail') {
            const flyT = Math.min(1,
                (this.elapsed - SKILLCARD_CENTER_MS - SKILLCARD_HOLD_MS) / (SKILLCARD_FLY_MS * 0.35));
            sparkleAlpha = Math.max(0, 1 - flyT);
        } else if (this.phase === 'center') {
            sparkleAlpha = Math.min(1, this.elapsed / SKILLCARD_CENTER_MS);
        }

        if (sparkleAlpha > 0 && cx !== undefined) {
            const hw = (this.from.w / 2) * scale;
            const hh = (this.from.h / 2) * scale;
            for (const s of this.sparkles) {
                const a = s.angle + t * s.speed;
                const x = cx + Math.cos(a) * hw * s.rx;
                const y = cy + Math.sin(a) * hh * s.ry;
                const twinkle = 0.45 + 0.55 * Math.sin(s.phase + t * 3);
                this._dot(ctx, x, y, s.size, color, s.white, sparkleAlpha * twinkle);
            }
        }

        // Trail + burst particles
        for (const p of this.particles) {
            const f = 1 - p.life / p.maxLife;
            this._dot(ctx, p.x, p.y, p.size * (0.5 + f * 0.5), p.color, p.white, f);
        }

        // Absorption ring at the landing spot
        if (this.ring) {
            const f = this.ring.life / this.ring.maxLife;
            ctx.globalAlpha = (1 - f) * 0.8;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5 * (1 - f) + 0.5;
            ctx.beginPath();
            ctx.arc(this.ring.x, this.ring.y, 6 + f * 55, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _dot(ctx, x, y, size, color, white, alpha) {
        if (alpha <= 0) return;
        const r = size * 3;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const core = white > 0.5 ? '#ffffff' : color;
        g.addColorStop(0, core);
        g.addColorStop(0.4, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    _fireDone() {
        if (this.doneFired) return;
        this.doneFired = true;
        if (this.onDone) this.onDone();
    }

    _finish() {
        // Ensure the resume ramp never leaves the game slowed down
        if (this.ramping) this.game.timeDilation = 1;
        this._cleanup();
        this._fireDone();
    }

    /** Hard stop without firing onDone (game reset / return to menu). */
    cancel() {
        this.game.timeDilation = 1;
        this._cleanup();
        this.onDone = null;
    }

    _cleanup() {
        this.active = false;
        this.phase = 'idle';
        this.ramping = false;
        if (this.wrap) {
            this.wrap.remove();
            this.wrap = null;
        }
        if (this.cardEl) {
            this.cardEl.style.visibility = '';
            this.cardEl = null;
        }
        this.game.ui.dom.levelupModal.classList.remove('card-picked');
        this.overlay.style.display = 'none';
        this.sparkles = [];
        this.particles = [];
        this.ring = null;
    }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
