export class Particle {
    constructor(x, y, color, type = 'DUST') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = type === 'SPARKLE' ? Math.random() * 2 + 1 : Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * (type === 'SPARKLE' ? 1 : 2);
        this.speedY = (Math.random() - 0.5) * (type === 'SPARKLE' ? 1 : 2);
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        if (this.size > 0.1) this.size -= 0.05;
    }

    draw(ctx) {
        ctx.save();
        // If sparkle, flicker the alpha
        const alpha = this.type === 'SPARKLE' ? this.life * (Math.random() > 0.5 ? 1 : 0.5) : this.life;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}
