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

    /**
     * Generates the full PBR map set for the ground: albedo, normal and roughness.
     * Normal/roughness are derived from the albedo luminance so surface detail
     * (dunes, ice, grass) catches the spotlight and reads as real relief.
     * @param {string} biomeType
     * @returns {{map: THREE.CanvasTexture, normalMap: THREE.CanvasTexture, roughnessMap: THREE.CanvasTexture}}
     */
    static generateGroundMaps(biomeType) {
        const canvas = this.generateGroundCanvas(biomeType);
        const size = canvas.width;
        const ctx = canvas.getContext('2d');
        const src = ctx.getImageData(0, 0, size, size).data;

        // Height field from luminance
        const height = new Float32Array(size * size);
        for (let i = 0; i < size * size; i++) {
            const j = i * 4;
            height[i] = (src[j] * 0.299 + src[j + 1] * 0.587 + src[j + 2] * 0.114) / 255;
        }

        // Sobel-derived normal map (wrapping sample for seamless tiling)
        const normalCanvas = document.createElement('canvas');
        normalCanvas.width = size;
        normalCanvas.height = size;
        const nCtx = normalCanvas.getContext('2d');
        const nData = nCtx.createImageData(size, size);

        // Roughness: brighter (icy/sandy highlight) areas are smoother
        const roughCanvas = document.createElement('canvas');
        roughCanvas.width = size;
        roughCanvas.height = size;
        const rCtx = roughCanvas.getContext('2d');
        const rData = rCtx.createImageData(size, size);

        const strength = 2.0;
        const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
                const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
                const len = Math.sqrt(dx * dx + dy * dy + 1);
                const idx = (y * size + x) * 4;

                nData.data[idx] = ((dx / len) * 0.5 + 0.5) * 255;
                nData.data[idx + 1] = ((dy / len) * 0.5 + 0.5) * 255;
                nData.data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255;
                nData.data[idx + 3] = 255;

                const rough = 255 * (0.95 - at(x, y) * 0.45);
                rData.data[idx] = rough;
                rData.data[idx + 1] = rough;
                rData.data[idx + 2] = rough;
                rData.data[idx + 3] = 255;
            }
        }
        nCtx.putImageData(nData, 0, 0);
        rCtx.putImageData(rData, 0, 0);

        const configure = (texture, isColor) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(16, 16);
            if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        };

        return {
            map: configure(new THREE.CanvasTexture(canvas), true),
            normalMap: configure(new THREE.CanvasTexture(normalCanvas), false),
            roughnessMap: configure(new THREE.CanvasTexture(roughCanvas), false)
        };
    }

    static generateGround(biomeType) {
        return this.generateGroundMaps(biomeType).map;
    }

    static generateGroundCanvas(biomeType) {
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
            // detailed ice puddles with sharp edges.

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

        return canvas;
    }
}
