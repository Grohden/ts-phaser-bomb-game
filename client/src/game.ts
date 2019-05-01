import {BackendState, GameDimensions, PlayerDirections, PlayerRegistry, SimpleCoordinates, SocketEvents} from "commons";
import Phaser from "phaser";
import {ASSETS, BOMB_TIME, MAIN_TILES, MAPS} from "./assets";
import Socket = SocketIOClient.Socket;

const debug = true;

type GameSprite = Phaser.GameObjects.Sprite;
type GamePhysicsSprite = Phaser.Physics.Arcade.Sprite;
type GameScene = Phaser.Scene;
type ExplosionCache = Array<{ sprite: GameSprite; key: string }>;
type BombMap = {
  [xy: string]: {
    sprite: GameSprite;
    range: number;
  };
};

interface Directions {
  left: boolean;
  right: boolean;
  down: boolean;
  up: boolean;
}

interface BombGameConfigs {
  parent: HTMLElement | string;
  onDeath: () => unknown;
  onStart: () => unknown;
}

interface SceneMap {
  map: Phaser.Tilemaps.Tilemap;
  tiles: Phaser.Tilemaps.Tileset;
  layer: Phaser.Tilemaps.DynamicTilemapLayer;
}

type TNewBombInfo = SimpleCoordinates & { range: number };

function inRange(r: { min: number; max: number; value: number }) {
  return r.value >= r.min && r.value <= r.max;
}

function gridUnitToPixel(value: number, baseGridSize: number) {
  return value * baseGridSize + baseGridSize / 2;
}

function makeKey({ x, y }: SimpleCoordinates) {
  return `${x}-${y}`;
}

function findPlayerMapPosition(coords: SimpleCoordinates): SimpleCoordinates {
  const { tileWidth, tileHeight } = GameDimensions;
  return {
    x: Math.floor(coords.x / tileWidth),
    // +(tileHeight / 2) is a precision fix :D
    y: Math.floor((coords.y + tileHeight / 2) / tileHeight)
  };
}

export class BombGame {
  private socket: Socket;
  private gameConfigs: BombGameConfigs;
  private phaserInstance: Phaser.Game;
  private backgroundMap: SceneMap;
  private breakableMap: SceneMap;
  private currentScene: GameScene;
  private wallsMap: SceneMap;
  private spawnedBombCount = 0;
  private playerId: any;
  private bombMap: BombMap = {};
  private groups: {
    players: Phaser.GameObjects.Group;
    explosions: Phaser.GameObjects.Group;
    bombs: Phaser.GameObjects.Group;
  };
  private explosionMap: { [xy: string]: GameSprite } = {};

  private playerRegistry: {
    [id: string]: PlayerRegistry & {
      player: Phaser.Physics.Arcade.Sprite;
    };
  } = {};

  constructor(socket: Socket, gameConfigs: BombGameConfigs) {
    this.socket = socket;
    this.gameConfigs = gameConfigs;
  }

  private makeDefaultTileMap(key: string, imageName: string): SceneMap {
    const map = this.currentScene.make.tilemap({
      key,
      tileWidth: GameDimensions.tileWidth,
      tileHeight: GameDimensions.tileHeight
    });

    const tiles = map.addTilesetImage(imageName);
    const layer = map.createDynamicLayer(0, tiles, 0, 0);

    return { layer, map, tiles };
  }

  private preload() {
    const scene = this.currentScene;
    scene.load.image(MAIN_TILES, "assets/tileset.png");
    scene.load.tilemapCSV(MAPS.BACKGROUND, "assets/map_background.csv");
    scene.load.tilemapCSV(MAPS.WALLS, "assets/map_walls.csv");
    scene.load.tilemapCSV(MAPS.BREAKABLES, "assets/map_breakables.csv");
    scene.load.spritesheet(ASSETS.PLAYER, "assets/dude.png", {
      frameWidth: GameDimensions.playerWidth,
      frameHeight: GameDimensions.playerHeight
    });

    scene.load.spritesheet(ASSETS.BOMB, "assets/bomb.png", {
      frameWidth: GameDimensions.tileWidth,
      frameHeight: GameDimensions.tileHeight
    });

    scene.load.spritesheet(ASSETS.EXPLOSION, "assets/explosion.png", {
      frameWidth: GameDimensions.tileWidth,
      frameHeight: GameDimensions.tileHeight
    });
  }

  private static applyPhysicsAndAnimations(
    sprite: GamePhysicsSprite,
    { left, right, down, up }: Directions
  ) {
    const velocity = 160;
    if (left) {
      sprite.setVelocityX(-velocity);
      sprite.anims.play("left", true);
    } else if (right) {
      sprite.setVelocityX(velocity);
      sprite.anims.play("right", true);
    } else {
      sprite.setVelocityX(0);
    }

    if (down) {
      sprite.setVelocityY(-velocity);
      sprite.anims.play("turn-down", true);
    } else if (up) {
      sprite.setVelocityY(velocity);
      sprite.anims.play("turn-up", true);
    } else {
      sprite.setVelocityY(0);
    }

    if (!down && !up && !left && !right) {
      sprite.anims.play("turn-up");
    }
  }

  startGame() {
    this.socket.on(
      SocketEvents.InitWithState,
      (state: BackendState & { id: string }) => {
        // Happens at server restarts
        if (!this.phaserInstance) {
          this.initPhaser(state);
        }
      }
    );
  }

  private makeMaps() {
    // Background
    this.backgroundMap = this.makeDefaultTileMap(MAPS.BACKGROUND, MAIN_TILES);

    // Walls
    this.wallsMap = this.makeDefaultTileMap(MAPS.WALLS, MAIN_TILES);
    this.wallsMap.map.setCollisionBetween(0, 2);

    // Breakables
    this.breakableMap = this.makeDefaultTileMap(MAPS.BREAKABLES, MAIN_TILES);
    this.breakableMap.map.setCollisionBetween(0, 2);
  }

  private initPhaser(state: BackendState & { id: string }) {
    const self = this;
    this.phaserInstance = new Phaser.Game({
      type: Phaser.AUTO,
      parent: self.gameConfigs.parent,
      width: GameDimensions.gameWidth,
      height: GameDimensions.gameHeight,
      physics: {
        default: "arcade",
        arcade: {
          gravity: {},
          debug
        }
      },
      scene: {
        preload: function(this: GameScene) {
          self.currentScene = this;
          self.preload();
        },
        create: function(this: GameScene) {
          self.currentScene = this;
          self.create(state);
          self.gameConfigs.onStart();
        },
        update: function(this: GameScene) {
          self.currentScene = this;
          self.update();
        }
      }
    });
  }

  private fabricPlayer(
    directions: PlayerDirections
  ): Phaser.Physics.Arcade.Sprite {
    const player = this.currentScene.physics.add.sprite(
      directions.x,
      directions.y,
      ASSETS.PLAYER,
      1
    );

    player.setBounce(1.2);
    player.setCollideWorldBounds(true);

    this.groups.players.add(player);

    // TODO: put this in the group
    this.currentScene.physics.add.collider(player, this.breakableMap.layer);
    this.currentScene.physics.add.collider(player, this.wallsMap.layer);

    // Make the collision height smaller
    const radius = GameDimensions.playerBoxRadius;
    player.body.setCircle(
      radius,
      (GameDimensions.playerWidth - radius * 2) / 2,
      GameDimensions.playerHeight - radius * 2
    );

    return player;
  }

  private initWithState(state: BackendState & { id: string }) {
    const { playerRegistry } = this;
    this.playerId = this.socket.id; // state.id;
    this.groups = {
      players: this.currentScene.add.group(),
      explosions: this.currentScene.add.group(),
      bombs: this.currentScene.add.group()
    };

    for (const [id, data] of Object.entries(state.playerRegistry)) {
      playerRegistry[id] = {
        ...data,
        player: this.fabricPlayer(data.directions)
      };
    }

    for (const { x, y } of state.destroyedWalls) {
      this.breakableMap.map.removeTileAt(x, y);
    }

    this.currentScene.physics.add.collider(
      this.groups.players,
      this.groups.bombs
    );

    this.currentScene.physics.add.collider(
      this.groups.players,
      this.groups.explosions,
      (sprite: Phaser.GameObjects.GameObject) => this.processPlayerDeath(sprite)
    );

  }

  private processPlayerDeath(playerSprite: Phaser.GameObjects.GameObject) {
    for (const [id, registry] of Object.entries(this.playerRegistry)) {
      // To not overload the server, only the player itself can say
      // that he/she was killed
      if (
        !registry.isDead &&
        registry.player === playerSprite &&
        this.playerId === id
      ) {
        registry.isDead = true;
        this.socket.emit(SocketEvents.PlayerDied, id);
        this.gameConfigs.onDeath();
      }
    }
  }

  private initSocketListeners() {
    const { playerRegistry } = this;

    this.socket.on(
      SocketEvents.NewPlayer,
      (registry: PlayerRegistry & { id: string }) => {
        playerRegistry[registry.id] = {
          ...registry,
          player: this.fabricPlayer(registry.directions)
        };
      }
    );

    this.socket.on(SocketEvents.PlayerDisconnect, (playerId: string) => {
      const registry = this.playerRegistry[playerId];
      if (registry) {
        registry.player.destroy(true);
        delete playerRegistry[playerId];
      }
    });

    this.socket.on(SocketEvents.PlayerDied, (playerId: string) => {
      const registry = this.playerRegistry[playerId];
      if (registry) {
        // registry.player.destroy(true);
        // delete playerRegistry[playerId];
      }
    });

    this.socket.on(SocketEvents.StateUpdate, (backState: BackendState) => {
      for (const [id, data] of Object.entries(backState.playerRegistry)) {
        if (this.playerId !== id) {
          playerRegistry[id].directions = data.directions;
        }
      }
    });

    this.socket.on(SocketEvents.NewBombAt, (info: TNewBombInfo) => {
      this.setupBombAt(info);
    });

    this.socket.on(
      SocketEvents.WallDestroyed,
      ({ x, y }: SimpleCoordinates) => {
        this.breakableMap.map.removeTileAt(x, y);
      }
    );
  }

  private create(state: BackendState & { id: string }) {
    this.makeMaps();
    this.initWithState(state);
    this.initSocketListeners();
    const scene = this.currentScene;


      scene.anims.create({
        key: "bomb-animation",
        frames: scene.anims.generateFrameNumbers(ASSETS.BOMB, {
          start: 0,
          end: 1
        }),
        frameRate: 2,
        repeat: -1
      });

      // Player animations
    scene.anims.create({
      key: "left",
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 0,
        end: 3
      }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: "right",
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 4,
        end: 7
      }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: "turn-up",
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 10,
        end: 11
      }),
      frameRate: 5,
      repeat: -1
    });

    scene.anims.create({
      key: "turn-down",
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 8,
        end: 9
      }),
      frameRate: 5,
      repeat: -1
    });
  }

  private hasAnyWallAt(gridX: number, gridY: number) {
    return (
      this.wallsMap.map.hasTileAt(gridX, gridY) ||
      this.breakableMap.map.hasTileAt(gridX, gridY)
    );
  }

  private hasBreakableWallAt(gridX: number, gridY: number) {
    return this.breakableMap.map.hasTileAt(gridX, gridY);
  }

  private addExplosionSprite({
    pixX,
    pixY,
    gridX,
    gridY
  }: {
    pixX: number;
    pixY: number;
    gridX: number;
    gridY: number;
  }): { key: string; sprite: GameSprite } {
    const sprite = this.currentScene.add.sprite(pixX, pixY, ASSETS.EXPLOSION);
    const killer = this.currentScene.physics.add.existing(sprite, true);
    const physicsBody = (killer.body as unknown) as Phaser.Physics.Arcade.Body;
    physicsBody.setCircle(GameDimensions.tileHeight / 2);

    this.groups.explosions.add(killer);
    const key = makeKey({ x: gridX, y: gridY });

    return { key, sprite };
  }

  private putAndExplodeAdjacent(
    cache: ExplosionCache,
    gridX: number,
    gridY: number
  ) {
    const { tileWidth, tileHeight } = GameDimensions;

    if (this.hasBombAt({ x: gridX, y: gridY })) {
      console.log(`Found a bomb at ${gridX} - ${gridY}, delegated to it`);
      // Let the next bomb deal with things
      this.explodeBombAt(gridX, gridY);
      return true;
    } else if (this.hasExplosionAt({ x: gridX, y: gridY })) {
      console.log(`Found a explosion at ${gridX} - ${gridY}, stopping`);
      return true;
    } else if (this.hasAnyWallAt(gridX, gridY)) {
      // No Explosions at walls

      if (this.hasBreakableWallAt(gridX, gridY)) {
        // Breakable is replaced by a explosion
        const pixX = gridUnitToPixel(gridX, tileWidth);
        const pixY = gridUnitToPixel(gridY, tileHeight);

        const { key, sprite } = this.addExplosionSprite({
          pixX,
          pixY,
          gridX,
          gridY
        });
        cache.push({ sprite, key });
        this.explosionMap[key] = sprite;

        this.destroyWallAt(gridX, gridY);
      }

      return true;
    } else {
      const pixX = gridUnitToPixel(gridX, tileWidth);
      const pixY = gridUnitToPixel(gridY, tileHeight);

      const { key, sprite } = this.addExplosionSprite({
        pixX,
        pixY,
        gridX,
        gridY
      });

      cache.push({ sprite, key });
      this.explosionMap[key] = sprite;

      return false;
    }
  }

  private putExplosionAt(x: number, y: number, range: number) {
    const explosions: ExplosionCache = [];

    // The bomb itself
    this.putAndExplodeAdjacent(explosions, x, y);

    for (let i = x + 1; i <= x + range; i++) {
      const foundObstacle = this.putAndExplodeAdjacent(explosions, i, y);
      if (foundObstacle) {
        break;
      }
    }

    for (let i = x - 1; i >= x - range; i--) {
      const foundObstacle = this.putAndExplodeAdjacent(explosions, i, y);
      if (foundObstacle) {
        break;
      }
    }

    for (let i = y + 1; i <= y + range; i++) {
      const foundObstacle = this.putAndExplodeAdjacent(explosions, x, i);
      if (foundObstacle) {
        break;
      }
    }

    for (let i = y - 1; i >= y - range; i--) {
      const foundObstacle = this.putAndExplodeAdjacent(explosions, x, i);
      if (foundObstacle) {
        break;
      }
    }

    setTimeout(() => {
      explosions.forEach(({ sprite, key }) => {
        sprite.destroy(true);
        delete this.explosionMap[key];
      });
    }, 700);
  }

  private destroyWallAt(x: number, y: number) {
    this.breakableMap.map.removeTileAt(x, y);
    this.socket.emit(SocketEvents.WallDestroyed, { x, y });
  }

  private getCurrentPlayer() {
    return this.playerRegistry[this.playerId];
  }

  private setupPlayerBombAt(x: number, y: number) {
    const player = this.getCurrentPlayer();

    if (this.spawnedBombCount >= player.status.maxBombCount) {
      return;
    } else {
      this.spawnedBombCount++;
      this.registerBombAt(x, y, player.status.bombRange);
      this.socket.emit(SocketEvents.NewBombAt, { x, y });

      setTimeout(() => {
        this.explodeBombAt(x, y);
        this.spawnedBombCount--;
      }, BOMB_TIME);
    }
  }

  private setupBombAt({ x, y, range }: TNewBombInfo) {
    this.registerBombAt(x, y, range);
    setTimeout(() => {
      this.explodeBombAt(x, y);
    }, BOMB_TIME);
  }

  private registerBombAt(x: number, y: number, range: number) {
    const { tileWidth, tileHeight } = GameDimensions;
    const nX = gridUnitToPixel(x, tileWidth);
    const nY = gridUnitToPixel(y, tileHeight);
    const newBomb = this.currentScene.add.sprite(nX, nY, ASSETS.BOMB, 1);
    const key = makeKey({ x, y });

    this.bombMap[key] = { sprite: newBomb, range };

    const bombCollide = this.currentScene.physics.add.existing(newBomb, true);
    this.groups.bombs.add(bombCollide);
  }

  private explodeBombAt(gridX: number, gridY: number) {
    const key = makeKey({ x: gridX, y: gridY });

    if (this.hasBombAt({ x: gridX, y: gridY })) {
      const bomb = this.bombMap[key];
      bomb.sprite.destroy(true);
      delete this.bombMap[key];

      this.putExplosionAt(gridX, gridY, bomb.range);
    }
  }

  private hasBombAt(coords: SimpleCoordinates): boolean {
    return makeKey(coords) in this.bombMap;
  }

  private hasExplosionAt(coords: SimpleCoordinates): boolean {
    return makeKey(coords) in this.explosionMap;
  }

  private update() {
    const scene = this.currentScene;

    for(const child of this.groups.bombs.children.entries){
      (child as GameSprite).anims.play("bomb-animation", true);
    }

    for (const [id, registry] of Object.entries(this.playerRegistry)) {
      const { player, directions } = registry;

      if (this.playerId === id) {
        const cursors = scene.input.keyboard.createCursorKeys();

        if (this.playerRegistry[id].isDead) {
          Object.assign(directions, {
            left: false,
            right: false,
            down: false,
            up: false,
            x: player.x,
            y: player.y
          });
        } else {
          Object.assign(directions, {
            left: cursors.left!.isDown,
            right: cursors.right!.isDown,
            down: cursors.up!.isDown,
            up: cursors.down!.isDown,
            x: player.x,
            y: player.y
          });
        }

        // BombGame.applyPhysicsAndAnimations(player, directions);

        if (cursors.space!.isDown) {
          const { x, y } = findPlayerMapPosition(player);
          if (!this.hasBombAt({ x, y })) {
            this.setupPlayerBombAt(x, y);
          }
        }
      }
      // Fixes some position imprecision (from player animations)
      const tolerance = 10;
      const isXOk = inRange({
        min: directions.x - tolerance,
        max: directions.x + tolerance,
        value: player.x
      });
      const isYOk = inRange({
        min: directions.y - tolerance,
        max: directions.y + tolerance,
        value: player.y
      });

      if (!isXOk || !isYOk) {
        player.x = directions.x;
        player.y = directions.y;
      } else {
        BombGame.applyPhysicsAndAnimations(player, directions);
      }
    }

    // Update server
    const player = this.playerRegistry[this.playerId];
    if (player) {
      this.socket.emit(SocketEvents.Movement, player.directions);
    }
  }
}
