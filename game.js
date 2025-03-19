// Create the PreloadScene class
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Load placeholder assets
    this.load.setBaseURL('https://labs.phaser.io');
    
    // Using colored rectangles as placeholders
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.image('coin', 'https://labs.phaser.io/assets/sprites/coin.png');
    this.load.image('flag', 'https://labs.phaser.io/assets/sprites/mushroom.png');
    this.load.image('enemy', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
    this.load.spritesheet('player', 
      'https://labs.phaser.io/assets/sprites/dude.png',
      { frameWidth: 32, frameHeight: 48 }
    );
  }

  create() {
    // Create loading text
    this.add.text(400, 300, 'Loading...', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // Create player animations so they are available for the MainScene
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'turn',
      frames: [ { key: 'player', frame: 4 } ],
      frameRate: 20
    });
    
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('player', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });

    // Start the main scene after assets are loaded
    this.scene.start('MainScene');
  }
}

// Create the MainScene class
class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  init() {
    // Initialize game variables
    this.score = 0;
    this.gameOver = false;
  }

  create() {
    // Add a background color
    this.add.rectangle(400, 300, 800, 600, 0x6888ff).setDepth(-1);
    
    // Create the ground and platforms
    this.platforms = this.physics.add.staticGroup();
    
    // Creating the ground
    this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    
    // Creating some platforms
    this.platforms.create(600, 400, 'ground');
    this.platforms.create(50, 250, 'ground');
    this.platforms.create(750, 220, 'ground');
    
    // Create the player
    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    
    // Create enemies
    this.enemies = this.physics.add.group();
    const enemy = this.enemies.create(400, 50, 'enemy');
    enemy.setBounce(0.2);
    enemy.setCollideWorldBounds(true);
    enemy.setVelocityX(0); // No initial horizontal velocity
    enemy.direction = 'right';
    enemy.hasLanded = false; // Track if the enemy has landed on a platform
    
    // Create coins
    this.coins = this.physics.add.group({
      key: 'coin',
      repeat: 11,
      setXY: { x: 12, y: 50, stepX: 70 }
    });
    
    this.coins.children.iterate((child) => {
      child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      child.setCollideWorldBounds(true);
    });
    
    // Create finish flag
    this.flag = this.physics.add.sprite(750, 180, 'flag');
    
    // Score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });
    
    // Colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.coins, this.platforms);
    this.physics.add.collider(this.flag, this.platforms);
    
    // Overlaps for collecting coins and winning/losing
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.flag, this.winGame, null, this);
    
    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    if (this.gameOver) {
      return;
    }
    
    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play('left', true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play('right', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('turn');
    }

    // Jump when the up arrow key is pressed and player is on the ground
    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
    }

    // Enemy AI - check if enemy has landed and then change direction at world bounds
    this.enemies.children.iterate((enemy) => {
      // Check if enemy has landed on a platform
      if (!enemy.hasLanded && enemy.body.touching.down) {
        enemy.hasLanded = true;
        enemy.setVelocityX(100); // Start moving right once landed
      }
      
      // Only handle directional changes if the enemy has landed
      if (enemy.hasLanded) {
        if (enemy.body.touching.right || enemy.x > 750) {
          enemy.setVelocityX(-100);
          enemy.direction = 'left';
        } else if (enemy.body.touching.left || enemy.x < 50) {
          enemy.setVelocityX(100);
          enemy.direction = 'right';
        }
      }
    });
  }

  collectCoin(player, coin) {
    // Make the coin disappear
    coin.disableBody(true, true);
    
    // Add and update the score
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
    
    // Create more coins if all coins are collected
    if (this.coins.countActive(true) === 0) {
      this.coins.children.iterate((child) => {
        child.enableBody(true, child.x, 50, true, true);
      });
    }
  }

  hitEnemy(player, enemy) {
    // Check if player is jumping on top of the enemy
    if (player.body.velocity.y > 0 && player.y < enemy.y - enemy.height/2) {
      // Player is above the enemy, destroy the enemy
      enemy.disableBody(true, true);
      
      // Add score for defeating enemy
      this.score += 20;
      this.scoreText.setText('Score: ' + this.score);
      
      // Add a small bounce after jumping on enemy
      player.setVelocityY(-200);
    } else {
      // Player collided with enemy from side or below
      this.physics.pause();
      player.setTint(0xff0000);
      player.anims.play('turn');
      
      this.gameOver = true;
      
      // Display game over text
      this.add.text(400, 300, 'GAME OVER', { 
        fontSize: '64px', 
        fill: '#000',
        backgroundColor: '#f00'
      }).setOrigin(0.5);
      
      // Add restart text
      this.add.text(400, 350, 'Press R to restart', { 
        fontSize: '32px', 
        fill: '#fff' 
      }).setOrigin(0.5);
      
      // Add restart key
      this.input.keyboard.once('keydown-R', () => {
        this.scene.restart();
      });
    }
  }

  winGame(player, flag) {
    // Player reached the flag, game is won
    this.physics.pause();
    player.setTint(0x00ff00);
    
    this.gameOver = true;
    
    // Display victory text
    this.add.text(400, 300, 'YOU WIN!', { 
      fontSize: '64px', 
      fill: '#000',
      backgroundColor: '#0f0'
    }).setOrigin(0.5);
    
    // Display final score
    this.add.text(400, 350, 'Final Score: ' + this.score, { 
      fontSize: '32px', 
      fill: '#000' 
    }).setOrigin(0.5);
    
    // Add restart text
    this.add.text(400, 400, 'Press R to play again', { 
      fontSize: '32px', 
      fill: '#000' 
    }).setOrigin(0.5);
    
    // Add restart key
    this.input.keyboard.once('keydown-R', () => {
      this.scene.restart();
    });
  }
}

// Phaser game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  scene: [PreloadScene, MainScene]
};

// Initialize the game
const game = new Phaser.Game(config);
