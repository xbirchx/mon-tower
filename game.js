class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        console.log('Preload started');
        
        // Initialize platform renderer and try to load images
        this.platformRenderer = new PlatformRenderer(this);
        this.platformRenderer.preloadPlatformImages();
        
        // We'll create graphics programmatically in the create() method instead
    }

    create() {
        console.log('Create started');
        
        // Game world bounds - make it tall for tower climbing to height 5000
        this.physics.world.setBounds(0, -45000, 800, 50000); // y=-45000 to y=5000 (50000 total height)

        // Create player visual using graphics
        this.playerGraphics = this.add.graphics();
        this.playerGraphics.fillStyle(0xff6b6b); // Red color
        this.playerGraphics.fillRect(0, 0, 30, 40);
        
        // Create player physics body
        this.player = this.physics.add.sprite(400, 4800);
        this.player.body.setSize(30, 40);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(false); // Don't constrain to world bounds - let player climb higher!
        
        // Make the physics sprite invisible since we're using graphics
        this.player.setVisible(false);

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();
        
        // Create walls group
        this.walls = this.physics.add.staticGroup();

        // Create walls and initial platforms
        this.createWalls();
        this.createInitialPlatforms();

        // Player physics
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.walls);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');

        // Camera follows player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setDeadzone(100, 150);

        // Game variables (30% faster)
        this.playerSpeed = 208; // 160 * 1.3
        this.jumpVelocity = -650; // -500 * 1.3
        this.wallJumpVelocity = -520; // -400 * 1.3
        this.wallJumpForce = 260; // 200 * 1.3
        
        // Momentum variables (30% faster)
        this.acceleration = 520; // 400 * 1.3
        this.deceleration = 780; // 600 * 1.3
        this.maxSpeed = 390; // 300 * 1.3
        
        // Variable jump variables
        this.minJumpVelocity = -400; // Minimum jump height
        this.maxJumpVelocity = -650; // Maximum jump height (current jumpVelocity)
        this.jumpHoldTime = 0; // How long jump is held
        this.maxJumpHoldTime = 0.3; // Max time to hold for full jump (300ms)
        this.isJumping = false;
        
        // Platform generation variables
        this.highestPlatformY = 4900; // Track highest platform created
        this.platformSpacing = 120; // Spacing between platforms
        this.platformCount = 0; // Count of platforms created
        this.platformCleanupDistance = 2000; // Remove platforms this far below player
        this.lastPlatformCheck = 0; // Throttle platform generation checks
        this.platformCheckInterval = 100; // Check every 100ms instead of every frame
        
        // Game height limit  
        this.maxGameHeight = -45000; // Maximum height (y=-45000 = height 5000)
        this.minPlatformY = -45000; // Don't create platforms above this y value
        
        // Initialize particle manager
        this.particleManager = new ParticleManager(this);
        
        // Score display
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Height: 0', {
            fontSize: '24px',
            fill: '#ffffff'
        });
        this.scoreText.setScrollFactor(0); // Keep score fixed on screen
    }

    createWalls() {
        // Create wall graphics
        this.wallGraphics = this.add.graphics();
        this.wallGraphics.fillStyle(0x34495e); // Dark gray walls
        
        // Create simple tall walls that go to height 5000 (y=-45000)
        // Left wall - from ground (y=5000) to top (y=-45000)
        let leftWall = this.physics.add.staticSprite(25, -20000);
        leftWall.body.setSize(50, 50000);
        leftWall.setVisible(false);
        this.walls.add(leftWall);
        
        // Right wall - from ground (y=5000) to top (y=-45000)
        let rightWall = this.physics.add.staticSprite(775, -20000);
        rightWall.body.setSize(50, 50000);
        rightWall.setVisible(false);
        this.walls.add(rightWall);
        
        // Draw walls visually - from y=-45000 to y=5000
        this.wallGraphics.fillRect(0, -45000, 50, 50000); // Left wall
        this.wallGraphics.fillRect(750, -45000, 50, 50000); // Right wall
    }

    createInitialPlatforms() {
        // Create graphics for all platforms
        this.platformGraphics = this.add.graphics();
        
        // Ground platform
        let ground = this.physics.add.staticSprite(400, 4950);
        ground.body.setSize(800, 100);
        ground.setVisible(false); // Hide physics sprite
        this.platforms.add(ground);
        
        // Ground visual will be drawn after platforms are created

        // Create initial platforms going up with variety
        this.platformData = []; // Store platform positions for drawing
        this.generateInitialPlatforms();
        
        // Draw all platforms with variety (including ground)
        this.platformRenderer.renderPlatforms(this.platformData, this.platformGraphics, true);
    }

    generateInitialPlatforms() {
        // Create continuous platforms from ground level up to height limit
        // Start from slightly above ground and go all the way up
        this.highestPlatformY = 4800; // Start closer to ground
        
        while (this.highestPlatformY - this.platformSpacing > this.minPlatformY) {
            const result = this.createSinglePlatform();
            if (!result) break; // Stop if we hit height limit
        }

    }

    createSinglePlatform() {
        // Don't create platforms above the height limit
        if (this.highestPlatformY - this.platformSpacing <= this.minPlatformY) {
            return null; // Reached height limit
        }
        
        this.platformCount++;
        let x = Phaser.Math.Between(100, 700);
        let y = this.highestPlatformY - this.platformSpacing;
        let width = Phaser.Math.Between(100, 200);
        
        // Create physics platform
        let platform = this.physics.add.staticSprite(x, y);
        platform.body.setSize(width, 28);
        platform.setVisible(false);
        this.platforms.add(platform);
        
        // Create visual platform data
        const platformData = this.platformRenderer.createPlatformWithType(x, y, width, 28, 50000);
        this.platformData.push(platformData);
        
        // Update highest platform position
        this.highestPlatformY = y;
        
        return platformData;
    }

    checkAndGeneratePlatforms() {
        let needsRerender = false;
        
        // Generate new platforms when player gets close to the top (but respect height limit)
        const playerDistanceFromTop = this.highestPlatformY - this.player.y;
        
        if (playerDistanceFromTop < 1000 && this.highestPlatformY > this.minPlatformY) {
            // Generate more platforms (up to height limit)
            for (let i = 0; i < 10; i++) {
                const newPlatform = this.createSinglePlatform();
                if (!newPlatform) break; // Hit height limit
            }
            needsRerender = true;
        }
        
        // Clean up old platforms to prevent lag
        const cleanedUp = this.cleanupOldPlatforms();
        if (cleanedUp > 0) {
            needsRerender = true;
        }
        
        // Only re-render if we actually changed something
        if (needsRerender) {
            this.platformRenderer.renderPlatforms(this.platformData, this.platformGraphics, true);
        }
    }

    cleanupOldPlatforms() {
        const playerY = this.player.y;
        const cleanupThreshold = playerY + this.platformCleanupDistance;
        
        // Find platforms that are too far below the player
        const platformsToRemove = [];
        const physicsSpritesToRemove = [];
        
        for (let i = this.platformData.length - 1; i >= 0; i--) {
            const platform = this.platformData[i];
            if (platform.y > cleanupThreshold) {
                // Mark for removal
                platformsToRemove.push(i);
                
                // Find corresponding physics sprite to remove
                this.platforms.children.entries.forEach((physicsSprite, index) => {
                    if (Math.abs(physicsSprite.y - (platform.y + platform.height/2)) < 5) {
                        physicsSpritesToRemove.push(physicsSprite);
                    }
                });
            }
        }
        
        // Remove platforms from data array
        platformsToRemove.forEach(index => {
            this.platformData.splice(index, 1);
        });
        
        // Remove physics sprites
        physicsSpritesToRemove.forEach(sprite => {
            this.platforms.remove(sprite);
            sprite.destroy();
        });
        

        
        return platformsToRemove.length;
    }

    update() {
        // Sync player graphics with physics body
        this.playerGraphics.x = this.player.x - 15; // Center the graphics
        this.playerGraphics.y = this.player.y - 20;
        
        // Momentum-based player movement
        let currentVelX = this.player.body.velocity.x;
        
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            // Accelerate left
            let newVelX = currentVelX - this.acceleration * (1/60); // Assuming 60 FPS
            newVelX = Math.max(newVelX, -this.maxSpeed); // Clamp to max speed
            this.player.setVelocityX(newVelX);
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            // Accelerate right
            let newVelX = currentVelX + this.acceleration * (1/60);
            newVelX = Math.min(newVelX, this.maxSpeed); // Clamp to max speed
            this.player.setVelocityX(newVelX);
        } else {
            // Decelerate when no input
            if (Math.abs(currentVelX) > 0) {
                let decelAmount = this.deceleration * (1/60);
                if (currentVelX > 0) {
                    let newVelX = Math.max(0, currentVelX - decelAmount);
                    this.player.setVelocityX(newVelX);
                } else {
                    let newVelX = Math.min(0, currentVelX + decelAmount);
                    this.player.setVelocityX(newVelX);
                }
            }
        }

        // Variable height jumping - regular jump from ground
        if (this.player.body.touching.down) {
            if ((this.cursors.up.isDown || this.wasd.W.isDown)) {
                if (!this.isJumping) {
                    // Start jump
                    this.player.setVelocityY(this.minJumpVelocity);
                    this.isJumping = true;
                    this.jumpHoldTime = 0;
                    // Emit jump dust particles
                    this.particleManager.emitJumpDust(this.player.x, this.player.y);
                }
            } else {
                // Reset when not holding jump
                this.isJumping = false;
            }
        }
        
        // Continue boosting jump while holding and still going up
        if (this.isJumping && (this.cursors.up.isDown || this.wasd.W.isDown) && this.player.body.velocity.y < 0) {
            this.jumpHoldTime += 1/60;
            if (this.jumpHoldTime <= this.maxJumpHoldTime) {
                // Add upward force while holding
                this.player.setVelocityY(this.player.body.velocity.y - 15); // Boost jump
            }
        }
        
        // Stop jump boost when released or falling
        if (!this.cursors.up.isDown && !this.wasd.W.isDown) {
            this.isJumping = false;
        }
        
        // Wall jumping - jump off walls
        if ((this.cursors.up.isDown || this.wasd.W.isDown) && !this.player.body.touching.down) {
            // Check if touching left wall
            if (this.player.body.touching.left) {
                this.player.setVelocityY(this.wallJumpVelocity);
                this.player.setVelocityX(this.wallJumpForce); // Push away from wall
                // Emit wall slide particles
                this.particleManager.emitWallSlide(this.player.x - 15, this.player.y);
            }
            // Check if touching right wall
            else if (this.player.body.touching.right) {
                this.player.setVelocityY(this.wallJumpVelocity);
                this.player.setVelocityX(-this.wallJumpForce); // Push away from wall
                // Emit wall slide particles
                this.particleManager.emitWallSlide(this.player.x + 15, this.player.y);
            }
        }

        // Check if we need to generate more platforms (throttled)
        const currentTime = this.time.now;
        if (currentTime - this.lastPlatformCheck > this.platformCheckInterval) {
            this.checkAndGeneratePlatforms();
            this.lastPlatformCheck = currentTime;
        }

        // Update score based on height (no cap - let it go to full height)
        // Ground is at y=5000, max height should be at y=-45000
        let calculatedHeight = Math.floor((5000 - this.player.y) / 10);
        let height = Math.max(0, calculatedHeight); // Remove the 5000 cap!
        
        if (height > this.score) {
            this.score = height;
            this.scoreText.setText('Height: ' + this.score);
        }
        


        // Game over if player falls too far
        if (this.player.y > 5100) {
            this.gameOver();
        }
    }

    gameOver() {
        this.physics.pause();
        this.player.setTint(0xff0000);
        
        // Display game over text
        let gameOverText = this.add.text(400, 300, 'Game Over!\nHeight: ' + this.score + '\nPress R to restart', {
            fontSize: '32px',
            fill: '#ffffff',
            align: 'center'
        });
        gameOverText.setOrigin(0.5);
        gameOverText.setScrollFactor(0);

        // Restart on R key
        this.input.keyboard.once('keydown-R', () => {
            this.scene.restart();
        });
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: window.innerHeight, // Use full screen height
    parent: 'game-container',
    backgroundColor: '#87CEEB', // Sky blue background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1040 }, // 800 * 1.3 for 30% faster
            debug: false
        }
    },
    scene: GameScene
};

// Start the game
console.log('Starting Phaser game...');
const game = new Phaser.Game(config);

// Add error handling
game.events.on('ready', () => {
    console.log('Game is ready!');
});

window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
});
