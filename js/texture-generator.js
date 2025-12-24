import * as THREE from 'three';

export class TextureGenerator {
    static generateDust() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256; // Square for cloud
        const ctx = canvas.getContext('2d');

        // Draw a soft cloud-like puff
        const rad = 128;
        const grad = ctx.createRadialGradient(rad, rad, 0, rad, rad, rad);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.4)'); // Soft center
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)'); // Transparent edge

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        // Add some noise for texture so it's not too perfect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 30 + 10;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    static generateSnow() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw a soft circle
        const rad = 32;
        const grad = ctx.createRadialGradient(rad, rad, 0, rad, rad, rad);
        grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rad, rad, rad, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    static generateGround(biomeType) {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fill background based on biome
        let baseColor, secondaryColor, noiseAmount;

        switch (biomeType) {
            case 'snow':
                baseColor = '#666688'; // Much Darker Blue-Grey to allow lighting headroom
                secondaryColor = '#aaccff'; // Brighter ice for contrast
                noiseAmount = 20;
                break;
            case 'desert':
                baseColor = '#eebb88';
                secondaryColor = '#ddaa77'; // Dune shadows
                noiseAmount = 40; // High grit
                break;
            case 'neutral':
            default:
                baseColor = '#1a331a'; // Dark green
                secondaryColor = '#224422'; // Lighter green grass
                noiseAmount = 25;
                break;
        }

        // Base fill
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);

        // Pattern Generation
        if (biomeType === 'desert') {
            // Draw Fractal Noise Dunes (FBM) - Realistic, Organic, Seamless

            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            // Helper: Create a noise function that returns value for ANY x
            // Handles seamless wrapping automatically
            const createSeamlessNoise = (len, steps, min, max) => {
                const points = [];
                for (let i = 0; i < steps; i++) {
                    points.push(min + Math.random() * (max - min));
                }

                const stepSize = len / steps;

                return (x) => {
                    // Normalize x to 0..len range
                    let wrappedX = x % len;
                    if (wrappedX < 0) wrappedX += len;

                    const i = Math.floor(wrappedX / stepSize);
                    const t = (wrappedX % stepSize) / stepSize;

                    // Wrap indices
                    const p0 = points[i % steps];
                    const p1 = points[(i + 1) % steps];

                    // Cosine Interpolation
                    const ft = t * Math.PI;
                    const f = (1 - Math.cos(ft)) * 0.5;
                    return p0 * (1 - f) + p1 * f;
                };
            };

            // Draw ~8 organic dune layers
            const numRidges = 8;

            // Pre-generate noise for all layers so we can re-draw the last one at the top (Ghost Dune)
            const duneData = [];
            for (let i = 0; i < numRidges; i++) {
                duneData.push({
                    noise1: createSeamlessNoise(size, 4, 30, 70), // Increased amplitude (was 10-30) for wavy non-linear look
                    noise2: createSeamlessNoise(size, 12, 10, 25), // Increased detail
                    noise3: createSeamlessNoise(size, 32, -2, 2),
                    thickMap: createSeamlessNoise(size, 6, 15, 40)
                });
            }

            // Draw sequence: Include the last dune as a "Ghost" at the top to cover the seam
            const drawIndices = [-1];
            for (let i = 0; i < numRidges; i++) drawIndices.push(i);

            drawIndices.forEach(gridIndex => {
                let i = gridIndex;
                let yOffset = 0;

                // Handle Ghost Dune (The last dune, wrapped to top)
                if (i === -1) {
                    i = numRidges - 1;
                    yOffset = -size; // Shift up by full canvas height
                }

                const data = duneData[i];
                const yBase = (size / numRidges) * i + yOffset;

                const noise1 = data.noise1;
                const noise2 = data.noise2;
                const noise3 = data.noise3;
                const thickMap = data.thickMap;

                // 1. Shadow Side (Deep Brown)
                ctx.fillStyle = '#664422';
                ctx.globalAlpha = 1.0; // Solid opacity to prevent transparency blending artifacts
                ctx.beginPath();

                const startX = -50;
                const endX = size + 50;

                for (let x = startX; x <= endX; x += 4) {
                    const noise = noise1(x) + noise2(x) + noise3(x);
                    const seed = Math.floor(x % size);
                    const jitter = (Math.sin(seed * 999) - 0.5) * 3;
                    const y = yBase + noise + jitter;

                    if (x === startX) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }

                // EXTENDED SKIRT: Draw way down to cover any gaps
                ctx.lineTo(endX, yBase + 400);
                ctx.lineTo(startX, yBase + 400);
                ctx.fill();

                // 2. Highlight Crest (Warm Sand Glow - No more snow look!)
                ctx.fillStyle = '#ffcc66'; // Warm orange/sand
                ctx.globalAlpha = 0.8; // High visibility but semi-blended
                ctx.beginPath();

                // Top Edge
                for (let x = startX; x <= endX; x += 4) {
                    const noise = noise1(x) + noise2(x) + noise3(x);
                    const seed = Math.floor(x % size);
                    const jitter = (Math.sin(seed * 999) - 0.5) * 3;
                    const yTop = yBase + noise + jitter - 2;

                    if (x === startX) ctx.moveTo(x, yTop);
                    else ctx.lineTo(x, yTop);
                }

                // Bottom Edge of Highlight
                for (let x = endX; x >= startX; x -= 4) {
                    const noise = noise1(x) + noise2(x) + noise3(x);
                    const thickness = thickMap(x);
                    const seed = Math.floor(x % size);
                    const jitter = (Math.sin(seed * 999) - 0.5) * 3;

                    const yBot = yBase + noise + thickness + jitter;
                    ctx.lineTo(x, yBot);
                }
                ctx.fill();
            });

            ctx.globalAlpha = 1.0;
            ctx.filter = 'none';

        } else if (biomeType === 'snow') {
            // Draw Irregular Ice Puddles
            // Ice should be DISTINCT blue/grey to stand out against white snow
            const iceColor = '#b0d0ff'; // Stronger light blue

            ctx.fillStyle = iceColor;
            // No blur, keep ice edges somewhat defined but maybe slight soften
            // Actually ice puddles usually have sharp edges.

            for (let i = 0; i < 40; i++) {
                // Random polygon shape
                const cx = Math.random() * size;
                const cy = Math.random() * size;
                const radius = 20 + Math.random() * 30;

                ctx.beginPath();
                const sides = 5 + Math.floor(Math.random() * 4); // 5-8 sides
                for (let j = 0; j < sides; j++) {
                    const angle = (j / sides) * Math.PI * 2;
                    // Vary radius per vertex for irregularity
                    const r = radius * (0.6 + Math.random() * 0.4);
                    const px = cx + Math.cos(angle) * r;
                    const py = cy + Math.sin(angle) * r;
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();

                // Add a "specular highlight" hint roughly in center?
                // Or just keep it flat.
            }

            // Add subtle snow drift noise (small white dots/drifts)
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.3;
            for (let k = 0; k < 100; k++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const w = Math.random() * 10 + 2;
                ctx.fillRect(x, y, w, 2);
            }
            ctx.globalAlpha = 1.0;

        } else {
            // Grass patches (Neutral)
            ctx.fillStyle = secondaryColor;
            for (let i = 0; i < 400; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const w = Math.random() * 20 + 5;
                const h = Math.random() * 10 + 5;
                ctx.fillRect(x, y, w, h);
            }
        }

        // Add Noise
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * noiseAmount;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        // Tile the texture significantly over the large map
        texture.repeat.set(16, 16);

        return texture;
    }
}
