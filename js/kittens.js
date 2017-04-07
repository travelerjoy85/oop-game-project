// This sectin contains some game constants. It is not super interesting
// var backgroundSong = new Audio("/oop-game-project/images/Most awesome 8-bit song ever (mp3cut.net).mp3");
var GAME_WIDTH    = 600;
var GAME_HEIGHT   = 500;

var ENEMY_WIDTH   = 75;
var ENEMY_HEIGHT  = 156;
var MAX_ENEMIES   = 8;

var MAX_LASERS    = 1;

var PLAYER_WIDTH  = 75;
var PLAYER_HEIGHT = 54;

var LASER_HEIGHT  = 75;
var LASER_WIDTH   = 75;

var PLAYER_LIVES  = 3;

// These three constants keep us from using "magic numbers" in our code
var LEFT_ARROW_CODE  = 37;
var RIGHT_ARROW_CODE = 39;
var UP_ARROW_CODE    = 38;
var DOWN_ARROW_CODE  = 40;
var SPACEBAR_CODE    = 32;

// These three constants allow us to DRY
var MOVE_LEFT  = 'left';
var MOVE_RIGHT = 'right';
var MOVE_UP    = 'up';
var MOVE_DOWN  = 'down';

// Preload game images
var images = {};
['enemy.png', 'stars.jpg', 'player.png', 'laser.png'].forEach(imgName => {
    var img = document.createElement('img');
    img.src = 'images/' + imgName;
    images[imgName] = img;
});




class Entity {
   render(ctx) {
       ctx.drawImage(this.sprite, this.x, this.y);
   }

   update(timeDiff, direction) {
       if (direction === 'down')  {
           this.y = this.y + timeDiff * this.speed;
       }
       else {
           this.y = this.y - timeDiff * this.speed;
       }
   }
}

// This section is where you will be doing most of your coding
class Enemy extends Entity {
   constructor(xPos) {
       super();
       
       this.x = xPos;
       this.y = -ENEMY_HEIGHT;
       this.sprite = images['enemy.png'];
       
       this.width  = ENEMY_WIDTH;
       this.height = ENEMY_HEIGHT;

       // Each enemy should have a different speed
       this.speed = Math.random() / 2 + 0.25;
   }
}

class Player extends Entity {
   constructor() {
       super();
       
       this.x = 2 * PLAYER_WIDTH;
       this.y = GAME_HEIGHT - PLAYER_HEIGHT - 10;
       this.sprite = images['player.png'];
       
       this.width  = PLAYER_WIDTH;
       this.height = PLAYER_HEIGHT;
       
       this.playerLives = PLAYER_LIVES;
   }

   // This method is called by the game engine when left/right arrows are pressed
   move(direction) {
       if (direction === MOVE_LEFT && this.x > 0) {
           this.x = this.x - PLAYER_WIDTH;
       }
       else if (direction === MOVE_RIGHT && this.x < GAME_WIDTH - PLAYER_WIDTH) {
           this.x = this.x + PLAYER_WIDTH;
       }
       else if (direction === MOVE_UP &&  this.y > PLAYER_HEIGHT) {
          this.y = this.y - PLAYER_HEIGHT;
      }
       else if (direction === MOVE_DOWN && this.y < GAME_HEIGHT  - (PLAYER_HEIGHT + 10)) {
          this.y = this.y + PLAYER_HEIGHT;
      }
   }
   
   changeLives(change) {
       this.playerLives += change;
   }
   
   
   shoot() {
       if (!this.lasers) {
           this.lasers = [];
       }
   
       if (this.lasers.length < MAX_LASERS) {
           var laser = new Laser(this.x, this.y-PLAYER_HEIGHT);
           this.lasers.push(laser);
       }
       
       console.log(this.lasers);
   }
}

class Laser extends Entity {
   constructor(xPos, yPos) {
       super();
       
       this.x = xPos;
       // this.y = GAME_HEIGHT - PLAYER_HEIGHT;
       this.y = yPos;
       
       this.width  = LASER_WIDTH;
       this.height = LASER_HEIGHT;
       
       this.sprite = images['laser.png'];
       this.speed = 0.6;
   }
}





/*
This section is a tiny game engine.
This engine will use your Enemy and Player classes to create the behavior of the game.
The engine will try to draw your game at 60 frames per second using the requestAnimationFrame function
*/
class Engine {
   constructor(element) {
       // Setup the player
       this.player = new Player();

       // Setup enemies, making sure there are always three
       this.setupEnemies();
       
       // Setup lasers
       // this.setupLasers();

       // Setup the <canvas> element where we will be drawing
       var canvas = document.createElement('canvas');
       canvas.width = GAME_WIDTH;
       canvas.height = GAME_HEIGHT;
       element.appendChild(canvas);

       this.ctx = canvas.getContext('2d');

       // Since gameLoop will be called out of context, bind it once here.
       this.gameLoop = this.gameLoop.bind(this);
   }

   /*
    The game allows for 5 horizontal slots where an enemy can be present.
    At any point in time there can be at most MAX_ENEMIES enemies otherwise the game would be impossible
    */
   setupEnemies() {
       if (!this.enemies) {
           this.enemies = [];
       }

       while (this.enemies.filter(e => !!e).length < MAX_ENEMIES) {
           this.addEnemy();
       }
   }

   // This method finds a random spot where there is no enemy, and puts one in there
   addEnemy() {
       var enemySpots = GAME_WIDTH / ENEMY_WIDTH;

       var enemySpot;
       // Keep looping until we find a free enemy spot at random
       while (this.enemies[enemySpot]) {
           enemySpot = Math.floor(Math.random() * enemySpots);
       }

       this.enemies[enemySpot] = new Enemy(enemySpot * ENEMY_WIDTH);
   }

   // This method kicks off the game
   start() {
       this.score = 0;
       this.lastFrame = Date.now();

       // Listen for keyboard left/right and update the player
       document.addEventListener('keydown', e => {
           if (e.keyCode === LEFT_ARROW_CODE) {
               this.player.move(MOVE_LEFT);
           }
           else if (e.keyCode === RIGHT_ARROW_CODE) {
               this.player.move(MOVE_RIGHT);
           }
           else if (e.keyCode === UP_ARROW_CODE) {
               this.player.move(MOVE_UP);
           }
           else if (e.keyCode === DOWN_ARROW_CODE) {
               this.player.move(MOVE_DOWN);
           }
           else if (e.keyCode === SPACEBAR_CODE) {
               this.player.shoot();
           }
       });

       this.gameLoop();
   }

    /*
    This is the core of the game engine. The `gameLoop` function gets called ~60 times per second
    During each execution of the function, we will update the positions of all game entities
    It's also at this point that we will check for any collisions between the game entities
    Collisions will often indicate either a player death or an enemy kill

    In order to allow the game objects to self-determine their behaviors, gameLoop will call the `update` method of each entity
    To account for the fact that we don't always have 60 frames per second, gameLoop will send a time delta argument to `update`
    You should use this parameter to scale your update appropriately
     */
    gameLoop() {
       // Check how long it's been since last frame
       var currentFrame = Date.now();
       var timeDiff = currentFrame - this.lastFrame;

       // Increase the score!
       this.score += timeDiff;

       // Call update on all enemies
       this.enemies.forEach(enemy => enemy.update(timeDiff, 'down'));
       
       // if(this.isEnemyDead()){
       //     return true;
       // }
       this.isEnemyDead();

       // Draw everything!
       this.ctx.drawImage(images['stars.jpg'], 0, 0); // draw the star bg
       this.enemies.forEach(enemy => enemy.render(this.ctx)); // draw the enemies
       this.player.render(this.ctx); // draw the player
       
       if (this.player.lasers) {
           for (var i = 0, l = this.player.lasers.length; i < l; i++) {
               this.player.lasers[i].update(timeDiff, 'up'); // update each laser that has been used
           }
           
           this.player.lasers.forEach(laser => laser.render(this.ctx)); // draw the laser
       }

       // Check if any enemies should die
       this.enemies.forEach((enemy, enemyIdx) => {
           if (enemy.y > GAME_HEIGHT) {
               delete this.enemies[enemyIdx];
           }
       });
       this.setupEnemies();
       
       if (this.player.lasers) {
           this.player.lasers.forEach((laser, laserIdx) => {
               if ((laser.y + LASER_HEIGHT) < 0) {
                   this.player.lasers.splice(laserIdx, 1);
               }
           });
       }
           

       // Check if player is dead
       if (this.isPlayerDead()) {
           // If they are dead, then it's game over!
           this.ctx.font = 'bold 30px Impact';
           this.ctx.fillStyle = '#ffffff ';
           this.ctx.fillText(this.score + ' GAME OVER', 5, 30);
       }
       else {
           // If player is not dead, then draw the score
           this.ctx.font = 'bold 30px Impact';
           this.ctx.fillStyle = '#ffffff ';
           this.ctx.fillText(this.score, 5, 30);

           // Set the time marker and redraw
           this.lastFrame = Date.now();
           requestAnimationFrame(this.gameLoop);
       }
   }
   
   isColliding(entity1, entity2) {
       if (entity1.x < entity2.x + entity2.width
           && entity1.x + entity1.width > entity2.x
           && entity1.y < entity2.y + entity2.height
           && entity1.height + entity1.y > entity2.y) {
               return true;
           }
       else {
           return false;
       }
   }
   
   isPlayerDead() {
       // TODO: fix this function!
       for (var i = 0, l = this.enemies.length; i < l; i++) {
           if (this.isColliding(this.player, this.enemies[i])) {
               this.player.changeLives(-1);
               delete this.enemies[i];
               
               if (this.player.playerLives === 0) {
                   return true;
               }
           }
       }
       return false;
       
   }
   
   isEnemyDead() {
       for (var i = 0, l = this.enemies.length; i < l; i++) {
           if (this.player.lasers) {
               for (var j = 0, k = this.player.lasers.length; j < k; j++) {
                   if (this.isColliding(this.player.lasers[j], this.enemies[i])) {
                       delete this.enemies[i];
                       this.player.lasers.splice(j, 1);
                       
                       this.score += 1000;
                       
                       return true;
                   }
               }
           }
       }
           
       return false;
       
     
   }
}





// // This section will start the game
var gameEngine = new Engine(document.getElementById('app'));
gameEngine.start();

