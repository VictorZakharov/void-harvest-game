// ==================== SPRITE GENERATOR ====================
export class SpriteGenerator {
    static createPlayerSprite(size = 32) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const scale = size / 16; // Scale factor

        // Body (cyan)
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(4 * scale, 4 * scale, 8 * scale, 8 * scale);

        // Head
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(5 * scale, 2 * scale, 6 * scale, 4 * scale);

        // Weapon
        ctx.fillStyle = '#666666';
        ctx.fillRect(12 * scale, 7 * scale, 3 * scale, 2 * scale);

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(6 * scale, 3 * scale, 1 * scale, 1 * scale);
        ctx.fillRect(9 * scale, 3 * scale, 1 * scale, 1 * scale);

        return canvas;
    }

    static createEnemySprite(type, size = 32) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const scale = size / 16; // Scale factor

        switch(type) {
            case 'basic':
                // Red blob enemy
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(3 * scale, 5 * scale, 10 * scale, 6 * scale);
                ctx.fillRect(5 * scale, 3 * scale, 6 * scale, 10 * scale);
                ctx.fillStyle = '#660000';
                ctx.fillRect(6 * scale, 6 * scale, 2 * scale, 2 * scale);
                ctx.fillRect(8 * scale, 6 * scale, 2 * scale, 2 * scale);
                break;
            case 'fast':
                // Pink speedy enemy
                ctx.fillStyle = '#ff3399';
                ctx.fillRect(4 * scale, 6 * scale, 8 * scale, 4 * scale);
                ctx.fillRect(6 * scale, 4 * scale, 4 * scale, 8 * scale);
                ctx.fillStyle = '#990055';
                ctx.fillRect(7 * scale, 7 * scale, 1 * scale, 1 * scale);
                ctx.fillRect(8 * scale, 7 * scale, 1 * scale, 1 * scale);
                break;
            case 'tank':
                // Purple tank enemy
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(2 * scale, 3 * scale, 12 * scale, 10 * scale);
                ctx.fillStyle = '#660066';
                ctx.fillRect(4 * scale, 5 * scale, 3 * scale, 3 * scale);
                ctx.fillRect(9 * scale, 5 * scale, 3 * scale, 3 * scale);
                break;
            case 'shooter':
                // Orange shooter enemy
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(4 * scale, 4 * scale, 8 * scale, 8 * scale);
                ctx.fillStyle = '#664400';
                ctx.fillRect(6 * scale, 6 * scale, 2 * scale, 2 * scale);
                ctx.fillRect(8 * scale, 6 * scale, 2 * scale, 2 * scale);
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(12 * scale, 7 * scale, 3 * scale, 2 * scale); // Weapon on right side
                break;
            case 'ice':
                // Light blue ice shooter enemy
                ctx.fillStyle = '#66ccff';
                ctx.fillRect(4 * scale, 4 * scale, 8 * scale, 8 * scale);
                ctx.fillStyle = '#004488';
                ctx.fillRect(6 * scale, 6 * scale, 2 * scale, 2 * scale);
                ctx.fillRect(8 * scale, 6 * scale, 2 * scale, 2 * scale);
                ctx.fillStyle = '#66ccff';
                ctx.fillRect(12 * scale, 7 * scale, 3 * scale, 2 * scale); // Weapon on right side
                // Ice crystals
                ctx.fillStyle = '#aaddff';
                ctx.fillRect(3 * scale, 3 * scale, 1 * scale, 1 * scale);
                ctx.fillRect(12 * scale, 3 * scale, 1 * scale, 1 * scale);
                ctx.fillRect(3 * scale, 12 * scale, 1 * scale, 1 * scale);
                ctx.fillRect(12 * scale, 12 * scale, 1 * scale, 1 * scale);
                break;
        }

        return canvas;
    }

    static createBulletSprite(type, size = 8) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (type === 'player') {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(2, 2, 4, 4);
        } else if (type === 'ice') {
            ctx.fillStyle = '#66ccff';
            ctx.fillRect(2, 2, 4, 4);
            // Ice sparkle
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 3, 1, 1);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(2, 2, 4, 4);
        }

        return canvas;
    }

    static createItemSprite(type, size = 12) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        switch(type) {
            case 'xp':
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(3, 3, 6, 6);
                ctx.fillStyle = '#00aa00';
                ctx.fillRect(4, 4, 4, 4);
                break;
            case 'health':
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(5, 2, 2, 3);
                ctx.fillRect(2, 3, 8, 6);
                ctx.fillRect(3, 9, 6, 2);
                break;
            case 'weapon':
                ctx.fillStyle = '#0088ff';
                ctx.fillRect(2, 2, 8, 8);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(4, 4, 4, 4);
                break;
        }

        return canvas;
    }

    static createParticle(color, size = 4) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size, size);

        return canvas;
    }
}
