import { TILE_SIZE } from './level.js';

export class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.type = type; // 'GOOMBA'
        this.velocityX = -0.5;
        this.velocityY = 0;
        this.onGround = false;
        this.isDead = false;
        this.deathTimer = 0;
        this.color = '#703800'; // Brown
    }

    update(deltaTime, game) {
        if (this.isDead) {
            this.deathTimer += deltaTime;
            return;
        }

        // Apply Gravity
        this.velocityY += game.gravity;
        this.y += this.velocityY;
        this.handleCollisions(game, 'y');

        // Horizontal Movement
        this.x += this.velocityX;
        this.handleCollisions(game, 'x');
    }

    handleCollisions(game, axis) {
        const startX = Math.floor(this.x / TILE_SIZE);
        const endX = Math.floor((this.x + this.width - 0.1) / TILE_SIZE);
        const startY = Math.floor(this.y / TILE_SIZE);
        const endY = Math.floor((this.y + this.height - 0.1) / TILE_SIZE);

        for (let row = startY; row <= endY; row++) {
            for (let col = startX; col <= endX; col++) {
                const tile = game.getTileAt(row, col);
                if (game.isSolid(tile)) {
                    if (axis === 'x') {
                        this.velocityX *= -1; // Bounce back
                        if (this.velocityX > 0) {
                            this.x = (col + 1) * TILE_SIZE;
                        } else {
                            this.x = col * TILE_SIZE - this.width;
                        }
                        return;
                    } else if (axis === 'y') {
                        if (this.velocityY > 0) {
                            this.y = row * TILE_SIZE - this.height;
                            this.velocityY = 0;
                            this.onGround = true;
                        }
                    }
                }
            }
        }
    }

    draw(ctx) {
        if (this.isDead && this.deathTimer < 500) {
            // Squashed Goomba
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y + 12, 16, 4);
            return;
        }
        if (this.isDead) return;

        // Draw Goomba
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 16, 16);
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 3, this.y + 4, 3, 3);
        ctx.fillRect(this.x + 10, this.y + 4, 3, 3);
    }
}
