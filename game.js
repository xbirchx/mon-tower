class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        console.log('Preload started');
        // We'll create graphics programmatically in the create() method instead
    }

    create() {
        console.log('Create started');
        
        // Game world bounds - make it tall for tower climbing
        this.physics.world.setBounds(0, 0, 800, 5000);

        // Create player visual using graphics
        this.playerGraphics = this.add.graphics();
        this.playerGraphics.fillStyle(0xff6b6b); // Red color
        this.playerGraphics.fillRect(0, 0, 30, 40);
        
        // Create player physics body
        this.player = this.physics.add.sprite(400, 4800);
        this.player.body.setSize(30, 40);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        
        // Make the physics sprite invisible since we're using graphics
        this.player.setVisible(false);

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();

        // Create initial platforms
        this.createInitialPlatforms();

        // Player physics
        this.physics.add.collider(this.player, this.platforms);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');

        // Camera follows player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setDeadzone(100, 150);

        // Game variables
        this.playerSpeed = 160;
        this.jumpVelocity = -500;
        
        // Score display
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Height: 0', {
            fontSize: '24px',
            fill: '#ffffff'
        });
        this.scoreText.setScrollFactor(0); // Keep score fixed on screen
    }

    createInitialPlatforms() {
        // Create graphics for all platforms
        this.platformGraphics = this.add.graphics();
        
        // Ground platform
        let ground = this.physics.add.staticSprite(400, 4950);
        ground.body.setSize(800, 100);
        ground.setVisible(false); // Hide physics sprite
        this.platforms.add(ground);
        
        // Draw ground visual
        this.platformGraphics.fillStyle(0x8e44ad); // Purple ground
        this.platformGraphics.fillRect(0, 4900, 800, 100);

        // Create some platforms going up
        this.platformData = []; // Store platform positions for drawing
        for (let i = 1; i <= 20; i++) {
            let x = Phaser.Math.Between(100, 700);
            let y = 4900 - (i * 120); // Reduced spacing from 200 to 120
            let width = Phaser.Math.Between(100, 200);
            
            let platform = this.physics.add.staticSprite(x, y);
            platform.body.setSize(width, 20);
            platform.setVisible(false); // Hide physics sprite
            this.platforms.add(platform);
            
            // Store platform data for drawing
            this.platformData.push({ x: x - width/2, y: y - 10, width: width, height: 20 });
        }
        
        // Draw all platforms
        this.platformGraphics.fillStyle(0x3498db); // Blue platforms
        this.platformData.forEach(platform => {
            this.platformGraphics.fillRect(platform.x, platform.y, platform.width, platform.height);
        });
    }

    update() {
        // Sync player graphics with physics body
        this.playerGraphics.x = this.player.x - 15; // Center the graphics
        this.playerGraphics.y = this.player.y - 20;
        
        // Player movement
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            this.player.setVelocityX(-this.playerSpeed);
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            this.player.setVelocityX(this.playerSpeed);
        } else {
            this.player.setVelocityX(0);
        }

        // Jumping
        if ((this.cursors.up.isDown || this.wasd.W.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(this.jumpVelocity);
        }

        // Update score based on height
        let height = Math.max(0, Math.floor((5000 - this.player.y) / 10));
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
    height: 600,
    parent: 'game-container',
    backgroundColor: '#87CEEB', // Sky blue background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
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
