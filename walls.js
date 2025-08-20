class WallRenderer {
    constructor(scene) {
        this.scene = scene;
        this.wallTextures = {};
        this.wallSprites = []; // Track created sprites for cleanup
        this.spritePool = {}; // Pool of reusable sprites by type
        this.wallColors = {
            stone: 0x5D6D7E, // Gray stone color
            darkstone: 0x34495E // Darker stone for variety
        };
        this.leftWallSprites = [];
        this.rightWallSprites = [];
        this.cullDistance = 1000; // Distance from camera to cull sprites
    }

    // Load wall images if they exist
    preloadWallImages() {
        // Try to load wall images from walls/ folder
        const wallImages = ['stone.png', 'darkstone.png'];
        
        wallImages.forEach(imageName => {
            const key = imageName.replace('.png', '');
            const imagePath = `walls/${imageName}`;
            try {
                this.scene.load.image(key, imagePath);
            } catch (error) {
                // Wall image not found, will use procedural stone pattern
            }
        });
    }

    // Create procedural stone pattern texture
    createStonePattern() {
        // Create a graphics object to draw the stone pattern
        const graphics = this.scene.add.graphics();
        
        // Stone block dimensions
        const blockWidth = 80;
        const blockHeight = 40;
        
        // Create a render texture for the stone pattern
        const stoneTexture = this.scene.add.renderTexture(0, 0, blockWidth, blockHeight);
        
        // Draw stone block with mortar lines
        graphics.fillStyle(0x708090); // Slate gray base
        graphics.fillRect(0, 0, blockWidth, blockHeight);
        
        // Add some texture variation
        graphics.fillStyle(0x778899); // Lighter gray highlights
        graphics.fillRect(5, 5, blockWidth - 10, 8);
        graphics.fillRect(10, blockHeight - 15, blockWidth - 20, 8);
        
        // Add mortar lines (darker edges)
        graphics.lineStyle(2, 0x2F4F4F); // Dark slate gray
        graphics.strokeRect(0, 0, blockWidth, blockHeight);
        
        // Add some cracks/details
        graphics.lineStyle(1, 0x696969); // Dim gray
        graphics.beginPath();
        graphics.moveTo(15, 8);
        graphics.lineTo(25, 15);
        graphics.moveTo(blockWidth - 20, 10);
        graphics.lineTo(blockWidth - 10, 18);
        graphics.strokePath();
        
        // Draw to render texture
        stoneTexture.draw(graphics, 0, 0);
        
        // Clean up graphics
        graphics.destroy();
        
        // Make the texture available
        stoneTexture.saveTexture('proceduralStone');
        stoneTexture.destroy();
    }

    // Create darker stone variant
    createDarkStonePattern() {
        const graphics = this.scene.add.graphics();
        
        const blockWidth = 80;
        const blockHeight = 40;
        
        const darkStoneTexture = this.scene.add.renderTexture(0, 0, blockWidth, blockHeight);
        
        // Darker base color
        graphics.fillStyle(0x2F4F4F); // Dark slate gray
        graphics.fillRect(0, 0, blockWidth, blockHeight);
        
        // Darker highlights
        graphics.fillStyle(0x36454F);
        graphics.fillRect(5, 5, blockWidth - 10, 8);
        graphics.fillRect(10, blockHeight - 15, blockWidth - 20, 8);
        
        // Mortar lines
        graphics.lineStyle(2, 0x1C1C1C); // Very dark gray
        graphics.strokeRect(0, 0, blockWidth, blockHeight);
        
        // Details
        graphics.lineStyle(1, 0x404040);
        graphics.beginPath();
        graphics.moveTo(20, 12);
        graphics.lineTo(30, 8);
        graphics.moveTo(blockWidth - 25, 15);
        graphics.lineTo(blockWidth - 15, 12);
        graphics.strokePath();
        
        darkStoneTexture.draw(graphics, 0, 0);
        graphics.destroy();
        darkStoneTexture.saveTexture('proceduralDarkStone');
        darkStoneTexture.destroy();
    }

    // Initialize wall textures
    initializeWallTextures() {
        // Check if we have custom textures, otherwise create procedural ones
        if (!this.scene.textures.exists('stone')) {
            this.createStonePattern();
        }
        if (!this.scene.textures.exists('darkstone')) {
            this.createDarkStonePattern();
        }
    }

    // Render tiled walls with viewport culling for performance
    renderWalls() {
        // Clear existing wall sprites
        this.clearWallSprites();
        
        // Initialize textures if needed
        this.initializeWallTextures();
        
        // Create large render textures for better performance
        this.createWallRenderTextures();
    }

    // Create optimized wall render textures
    createWallRenderTextures() {
        // Determine which texture to use
        const stoneTexture = this.scene.textures.exists('stone') ? 'stone' : 'proceduralStone';
        const darkStoneTexture = this.scene.textures.exists('darkstone') ? 'darkstone' : 'proceduralDarkStone';
        
        // Get texture dimensions
        const texture = this.scene.textures.get(stoneTexture);
        const textureWidth = texture.source[0].width;
        const textureHeight = texture.source[0].height;
        
        // Create larger wall sections (500px tall each) to reduce sprite count
        const sectionHeight = 500;
        const gameHeight = 50000;
        const sectionsVertical = Math.ceil(gameHeight / sectionHeight);
        
        // Left wall sections - positioned to connect with ground at x=0
        const leftWallWidth = 1000;
        for (let section = 0; section < sectionsVertical; section++) {
            const sectionY = -45000 + (section * sectionHeight) + (sectionHeight / 2);
            // Position so the right edge of the wall is at x=0 (where ground starts)
            const renderTexture = this.scene.add.renderTexture(0, sectionY, leftWallWidth, sectionHeight);
            renderTexture.setOrigin(1, 0.5); // Right edge at x=0, center vertically
            
            // Fill this section with stone pattern
            this.fillWallSection(renderTexture, leftWallWidth, sectionHeight, textureWidth, textureHeight, stoneTexture, darkStoneTexture, section);
            
            renderTexture.setDepth(-500);
            this.leftWallSprites.push(renderTexture);
        }
        
        // Right wall sections - positioned from x=750 to x=1750 (starting where physics wall is)
        const rightWallWidth = 1000;
        for (let section = 0; section < sectionsVertical; section++) {
            const sectionY = -45000 + (section * sectionHeight) + (sectionHeight / 2);
            // Position at x=1250 (center of 750 to 1750 range)
            const renderTexture = this.scene.add.renderTexture(1250, sectionY, rightWallWidth, sectionHeight);
            
            // Fill this section with stone pattern
            this.fillWallSection(renderTexture, rightWallWidth, sectionHeight, textureWidth, textureHeight, stoneTexture, darkStoneTexture, section);
            
            renderTexture.setDepth(-500);
            this.rightWallSprites.push(renderTexture);
        }
    }

    // Fill a wall section with tiled stone pattern
    fillWallSection(renderTexture, sectionWidth, sectionHeight, tileWidth, tileHeight, stoneTexture, darkStoneTexture, sectionIndex) {
        const tilesHorizontal = Math.ceil(sectionWidth / tileWidth);
        const tilesVertical = Math.ceil(sectionHeight / tileHeight);
        
        for (let row = 0; row < tilesVertical; row++) {
            for (let col = 0; col < tilesHorizontal; col++) {
                const x = col * tileWidth;
                const y = row * tileHeight;
                
                // Alternate between stone types (offset by section for variety)
                const textureType = (row + col + sectionIndex) % 2 === 0 ? stoneTexture : darkStoneTexture;
                
                // Create temporary sprite to draw to render texture
                const tempSprite = this.scene.add.image(x, y, textureType);
                tempSprite.setOrigin(0, 0);
                renderTexture.draw(tempSprite, x, y);
                tempSprite.destroy();
            }
        }
    }

    // Clear all wall sprites
    clearWallSprites() {
        [...this.leftWallSprites, ...this.rightWallSprites].forEach(sprite => {
            if (sprite && sprite.destroy) {
                sprite.destroy();
            }
        });
        this.leftWallSprites = [];
        this.rightWallSprites = [];
    }

    // Update wall visibility based on camera position for performance
    updateWallVisibility(cameraY) {
        const cullTop = cameraY - this.cullDistance;
        const cullBottom = cameraY + this.cullDistance;
        
        // Update left wall sprites visibility
        this.leftWallSprites.forEach(sprite => {
            if (sprite && sprite.y) {
                const spriteTop = sprite.y - 250; // Half of section height (500px)
                const spriteBottom = sprite.y + 250;
                const shouldBeVisible = spriteBottom >= cullTop && spriteTop <= cullBottom;
                
                if (sprite.visible !== shouldBeVisible) {
                    sprite.setVisible(shouldBeVisible);
                }
            }
        });
        
        // Update right wall sprites visibility
        this.rightWallSprites.forEach(sprite => {
            if (sprite && sprite.y) {
                const spriteTop = sprite.y - 250;
                const spriteBottom = sprite.y + 250;
                const shouldBeVisible = spriteBottom >= cullTop && spriteTop <= cullBottom;
                
                if (sprite.visible !== shouldBeVisible) {
                    sprite.setVisible(shouldBeVisible);
                }
            }
        });
    }

    // Cleanup when scene ends
    destroy() {
        this.clearWallSprites();
    }
}
