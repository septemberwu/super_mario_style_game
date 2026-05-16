export class InputHandler {
    constructor() {
        this.keys = new Set();
        
        // Mapping for convenience
        this.MAP = {
            LEFT: ['KeyA', 'ArrowLeft'],
            RIGHT: ['KeyD', 'ArrowRight'],
            JUMP: ['Space', 'KeyW', 'ArrowUp'],
            DUCK: ['KeyS', 'ArrowDown']
        };
    }

    handleKeyDown(code) {
        this.keys.add(code);
    }

    handleKeyUp(code) {
        this.keys.delete(code);
    }

    isPressed(action) {
        const codes = this.MAP[action];
        if (!codes) return false;
        return codes.some(code => this.keys.has(code));
    }
}
