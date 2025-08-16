class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = {};
        this.init();
    }

    init() {
        // Create particle emitters for different effects
        this.createJumpDustEmitter();
        this.createLandingEmitter();
        this.createWallSlideEmitter();
    }

    createJumpDustEmitter() {
        // Create simple colored rectangles as particle textures - make them bigger and more visible
        const dustGraphics = this.scene.add.graphics();
        dustGraphics.fillStyle(0xffffff); // White instead of gray for better visibility
        dustGraphics.fillRect(0, 0, 8, 8); // Bigger particles
        dustGraphics.generateTexture('dustParticle', 8, 8);
        dustGraphics.destroy();

        // Create jump dust emitter using new API
        this.particles.jumpDust = this.scene.add.particles(0, 0, 'dustParticle', {
            speed: { min: 50, max: 120 },
            scale: { start: 2, end: 0 }, // Start bigger
            alpha: { start: 1, end: 0 }, // Start fully opaque
            lifespan: 800, // Live longer
            quantity: 8, // More particles
            angle: { min: 200, max: 340 }, // Wider spread
            emitting: false
        });
    }

    createLandingEmitter() {
        // Create landing impact particles
        const impactGraphics = this.scene.add.graphics();
        impactGraphics.fillStyle(0xffffff);
        impactGraphics.fillRect(0, 0, 3, 3);
        impactGraphics.generateTexture('impactParticle', 3, 3);
        impactGraphics.destroy();

        this.particles.landing = this.scene.add.particles(0, 0, 'impactParticle', {
            speed: { min: 40, max: 100 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 300,
            quantity: 6,
            angle: { min: 200, max: 340 },
            emitting: false
        });
    }

    createWallSlideEmitter() {
        // Create wall slide spark particles - make them more visible
        const sparkGraphics = this.scene.add.graphics();
        sparkGraphics.fillStyle(0xff0000); // Bright red for visibility
        sparkGraphics.fillRect(0, 0, 6, 6); // Bigger
        sparkGraphics.generateTexture('sparkParticle', 6, 6);
        sparkGraphics.destroy();

        this.particles.wallSlide = this.scene.add.particles(0, 0, 'sparkParticle', {
            speed: { min: 40, max: 100 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 6,
            angle: { min: 0, max: 360 },
            emitting: false
        });
    }

    // Emit jump dust when player jumps
    emitJumpDust(x, y) {
        this.particles.jumpDust.setPosition(x, y + 20);
        this.particles.jumpDust.explode(4);
    }

    // Emit landing particles when player lands
    emitLanding(x, y, intensity = 1) {
        this.particles.landing.setPosition(x, y + 20);
        this.particles.landing.explode(Math.floor(6 * intensity));
    }

    // Emit wall slide sparks
    emitWallSlide(x, y) {
        this.particles.wallSlide.setPosition(x, y);
        this.particles.wallSlide.explode(6);
    }

    // Clean up particles when scene ends
    destroy() {
        Object.values(this.particles).forEach(emitter => {
            if (emitter && emitter.destroy) {
                emitter.destroy();
            }
        });
        this.particles = {};
    }
}
