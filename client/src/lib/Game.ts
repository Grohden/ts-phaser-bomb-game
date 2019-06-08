import {
  BackendState,
  GameDimensions,
  PlayerDirections,
  PlayerRegistry,
  PlayerStatus,
  SimpleCoordinates,
  SocketEvents,
  TPowerUpInfo,
  TPowerUpType
} from 'commons'
import Phaser from 'phaser'
import { ANIMATIONS, ASSETS, BOMB_TIME, MAIN_TILES, MAPS } from './assets'
import { GamePhysicsSprite, GameScene, GameSprite, TPlayerGameObject, TPowerUpGameObject } from '../alias'
import { GroupManager } from './GroupManager'
import Socket = SocketIOClient.Socket

const debug = true

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

  onStatusUpdate(status: PlayerStatus): void;
}

interface SceneMap {
  map: Phaser.Tilemaps.Tilemap;
  tiles: Phaser.Tilemaps.Tileset;
  layer: Phaser.Tilemaps.DynamicTilemapLayer;
}

type TNewBombInfo = SimpleCoordinates & { range: number };

function inRange(r: { min: number; max: number; value: number }) {
  return r.value >= r.min && r.value <= r.max
}

function gridUnitToPixel(value: number, baseGridSize: number) {
  return value * baseGridSize + baseGridSize / 2
}

function makeKey({ x, y }: SimpleCoordinates) {
  return `${ x }-${ y }`
}

function findPlayerMapPosition(coords: SimpleCoordinates): SimpleCoordinates {
  const { tileWidth, tileHeight } = GameDimensions
  return {
    x: Math.floor(coords.x / tileWidth),
    // +(tileHeight / 2) is a precision fix :D
    y: Math.floor((coords.y + tileHeight / 2) / tileHeight)
  }
}

export function BombGame(socket: Socket, gameConfigs: BombGameConfigs) {
  const playerSpeed = 160
  let spawnedBombCount = 0
  let playerId: string
  let phaserInstance: Phaser.Game
  let backgroundMap: SceneMap
  let breakableMap: SceneMap
  let currentScene: GameScene
  let wallsMap: SceneMap
  let groups: GroupManager
  const bombMap: BombMap = {}
  const explosionMap: { [xy: string]: GameSprite } = {}
  const playerRegistry: {
    [id: string]: PlayerRegistry & {
      player: Phaser.Physics.Arcade.Sprite;
    };
  } = {}

  const makeDefaultTileMap = (key: string, imageName: string): SceneMap => {
    const map = currentScene.make.tilemap({
      key,
      tileWidth: GameDimensions.tileWidth,
      tileHeight: GameDimensions.tileHeight
    })

    const tiles = map.addTilesetImage(imageName)
    const layer = map.createDynamicLayer(0, tiles, 0, 0)

    return { layer, map, tiles }
  }

  const preload = () => {
    const scene = currentScene
    scene.load.image(MAIN_TILES, 'assets/tileset.png')
    scene.load.tilemapCSV(MAPS.BACKGROUND, 'assets/map_background.csv')
    scene.load.tilemapCSV(MAPS.WALLS, 'assets/map_walls.csv')
    scene.load.tilemapCSV(MAPS.BREAKABLES, 'assets/map_breakables.csv')
    scene.load.spritesheet(ASSETS.PLAYER, 'assets/dude.png', {
      frameWidth: GameDimensions.playerWidth,
      frameHeight: GameDimensions.playerHeight
    });

    [
      [ASSETS.BOMB, 'assets/bomb.png'],
      [ASSETS.EXPLOSION, 'assets/explosion.png'],
      [ASSETS.BOMB_COUNT_POWERUP, 'assets/bomb_count_powerup.png'],
      [ASSETS.BOMB_RANGE_POWERUP, 'assets/bomb_range_powerup.png']
    ].forEach(([assetName, assetPath]) => {
      scene.load.spritesheet(assetName, assetPath, {
        frameWidth: GameDimensions.tileWidth,
        frameHeight: GameDimensions.tileHeight
      })
    })
  }

  const applyPhysicsAndAnimations = (
    sprite: GamePhysicsSprite,
    { left, right, down, up }: Directions
  ) => {
    if (left) {
      sprite.setVelocityX(-playerSpeed)
      sprite.anims.play(ANIMATIONS.PLAYER_TURN_LEFT, true)
    } else if (right) {
      sprite.setVelocityX(playerSpeed)
      sprite.anims.play(ANIMATIONS.PLAYER_TURN_RIGHT, true)
    } else {
      sprite.setVelocityX(0)
    }

    if (down) {
      sprite.setVelocityY(-playerSpeed)
      sprite.anims.play(ANIMATIONS.PLAYER_TURN_DOWN, true)
    } else if (up) {
      sprite.setVelocityY(playerSpeed)
      sprite.anims.play(ANIMATIONS.PLAYER_TURN_UP, true)
    } else {
      sprite.setVelocityY(0)
    }

    if (!down && !up && !left && !right) {
      sprite.anims.play(ANIMATIONS.PLAYER_TURN_UP)
    }
  }

  const makeMaps = () => {
    // Background
    backgroundMap = makeDefaultTileMap(MAPS.BACKGROUND, MAIN_TILES)

    // Walls
    wallsMap = makeDefaultTileMap(MAPS.WALLS, MAIN_TILES)
    wallsMap.map.setCollisionBetween(0, 2)

    // Breakables
    breakableMap = makeDefaultTileMap(MAPS.BREAKABLES, MAIN_TILES)
    breakableMap.map.setCollisionBetween(0, 2)
  }

  const initPhaser = (state: BackendState & { id: string }) => {
    phaserInstance = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameConfigs.parent,
      width: GameDimensions.gameWidth,
      height: GameDimensions.gameHeight,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: {},
          debug
        }
      },
      scene: {
        preload: function (this: GameScene) {
          currentScene = this
          preload()
        },
        create: function (this: GameScene) {
          currentScene = this
          create(state)
          gameConfigs.onStart()
        },
        update: function (this: GameScene) {
          currentScene = this
          update()
        }
      }
    })
  }

  const fabricPlayer = (
    id: string,
    directions: PlayerDirections
  ): Phaser.Physics.Arcade.Sprite => {
    const player = currentScene.physics.add.sprite(
      directions.x,
      directions.y,
      ASSETS.PLAYER,
      1
    )

    player.setBounce(1.2)
    player.setCollideWorldBounds(true)

    groups.addPlayer(player, id)

    // TODO: put this in the group
    currentScene.physics.add.collider(player, breakableMap.layer)
    currentScene.physics.add.collider(player, wallsMap.layer)

    // Make the collision height smaller
    const radius = GameDimensions.playerBoxRadius
    player.body.setCircle(
      radius,
      (GameDimensions.playerWidth - radius * 2) / 2,
      GameDimensions.playerHeight - radius * 2
    )

    return player
  }

  const initWithState = (state: BackendState & { id: string }) => {
    playerId = socket.id // state.id;
    groups = new GroupManager(() => currentScene)

    for (const { x, y } of state.destroyedWalls) {
      breakableMap.map.removeTileAt(x, y)
    }

    groups
      .registerBombCollider()
      .onPlayerPowerUpCatch(processPowerUpCatch)
      .onPlayerExploded(processPlayerDeath)
  }

  const processPowerUpCatch = (
    player: TPlayerGameObject,
    powerUp: TPowerUpGameObject
  ) => {
    const id = player.id!
    const registry = playerRegistry[player.id!]

    if (registry) {
      if (playerId === id) {
        socket.emit(SocketEvents.PowerUpCollected, {
          id,
          type: powerUp.powerUpType!
        })
      }
    } else {
      debug && console.debug('Registry not found ', id)
    }

    // Remove the power up sprite
    powerUp.destroy(true)
  }

  const processPlayerDeath = (id: string) => {
    const registry = playerRegistry[id]

    // To not overload the server, only the player itself can say
    // that he/she was killed
    if (registry) {
      if (!registry.isDead && playerId === id) {
        registry.isDead = true
        socket.emit(SocketEvents.PlayerDied, id)
        gameConfigs.onDeath()
      }
    } else {
      debug && console.debug('Registry not found ', id)
    }
  }

  const initSocketListeners = () => {
    socket.on(
      SocketEvents.NewPlayer,
      (registry: PlayerRegistry & { id: string }) => {
        playerRegistry[registry.id] = {
          ...registry,
          player: fabricPlayer(registry.id, registry.directions)
        }
      }
    )

    socket.on(SocketEvents.PlayerDisconnect, (playerId: string) => {
      const registry = playerRegistry[playerId]
      if (registry) {
        registry.player.destroy(true)
        delete playerRegistry[playerId]
      }
    })

    socket.on(SocketEvents.PlayerDied, (playerId: string) => {
      const registry = playerRegistry[playerId]
      if (registry) {
        // registry.player.destroy(true);
        // delete playerRegistry[playerId];
      }
    })

    socket.on(SocketEvents.StateUpdate, (backState: BackendState) => {
      for (const [id, data] of Object.entries(backState.playerRegistry)) {
        if (!playerRegistry[id]) {
          playerRegistry[id] = {
            ...data,
            player: fabricPlayer(id, data.directions)
          }
        }

        if (playerId !== id) {
          playerRegistry[id].directions = data.directions
        }
      }
    })

    socket.on(
      SocketEvents.PlayerStatusUpdate,
      (status: PlayerStatus & { id: string }) => {
        const registry = playerRegistry[status.id]

        if (registry) {
          registry.status = status

          if (status.id === playerId) {
            gameConfigs.onStatusUpdate(status)
          }
        }
      }
    )

    socket.on(SocketEvents.NewBombAt, (info: TNewBombInfo) => {
      setupBombAt(info)
    })

    socket.on(SocketEvents.NewPowerUpAt, (info: TPowerUpInfo) => {
      placePowerUpAt(info)
    })

    socket.on(
      SocketEvents.WallDestroyed,
      ({ x, y }: SimpleCoordinates) => {
        breakableMap.map.removeTileAt(x, y)
      }
    )
  }

  const create = (state: BackendState & { id: string }) => {
    makeMaps()
    initWithState(state)
    initSocketListeners()
    const scene = currentScene;

    [
      [ASSETS.BOMB, ANIMATIONS.BOMB_PULSE],
      [ASSETS.BOMB_COUNT_POWERUP, ANIMATIONS.BOMB_COUNT],
      [ASSETS.BOMB_RANGE_POWERUP, ANIMATIONS.BOMB_RANGE]
    ].forEach(([assetName, animationKey]) => {
      scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(assetName, {
          start: 0,
          end: 1
        }),
        frameRate: 2,
        repeat: -1
      })
    })

    // Player animations
    scene.anims.create({
      key: ANIMATIONS.PLAYER_TURN_LEFT,
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 0,
        end: 3
      }),
      frameRate: 10,
      repeat: -1
    })

    scene.anims.create({
      key: ANIMATIONS.PLAYER_TURN_RIGHT,
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 4,
        end: 7
      }),
      frameRate: 10,
      repeat: -1
    })

    scene.anims.create({
      key: ANIMATIONS.PLAYER_TURN_UP,
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 10,
        end: 11
      }),
      frameRate: 5,
      repeat: -1
    })

    scene.anims.create({
      key: ANIMATIONS.PLAYER_TURN_DOWN,
      frames: scene.anims.generateFrameNumbers(ASSETS.PLAYER, {
        start: 8,
        end: 9
      }),
      frameRate: 5,
      repeat: -1
    })
  }

  const hasAnyWallAt = (gridX: number, gridY: number) => {
    return (
      wallsMap.map.hasTileAt(gridX, gridY) ||
      breakableMap.map.hasTileAt(gridX, gridY)
    )
  }

  const hasBreakableWallAt = (gridX: number, gridY: number) => {
    return breakableMap.map.hasTileAt(gridX, gridY)
  }

  const addExplosionSprite = ({ pixX, pixY, gridX, gridY }: {
    pixX: number;
    pixY: number;
    gridX: number;
    gridY: number;
  }): { key: string; sprite: GameSprite } => {
    const sprite = currentScene.add.sprite(pixX, pixY, ASSETS.EXPLOSION)
    const killer = currentScene.physics.add.existing(sprite, true)
    const physicsBody = (killer.body as unknown) as Phaser.Physics.Arcade.Body
    physicsBody.setCircle(GameDimensions.tileHeight / 2)

    groups.addExplosion(killer)
    const key = makeKey({ x: gridX, y: gridY })

    return { key, sprite }
  }

  const putAndExplodeAdjacent = (
    cache: ExplosionCache,
    gridX: number,
    gridY: number
  ) => {
    const { tileWidth, tileHeight } = GameDimensions

    if (hasBombAt({ x: gridX, y: gridY })) {
      console.log(`Found a bomb at ${ gridX } - ${ gridY }, delegated to it`)
      // Let the next bomb deal with things
      explodeBombAt(gridX, gridY)
      return true
    } else if (hasExplosionAt({ x: gridX, y: gridY })) {
      console.log(`Found a explosion at ${ gridX } - ${ gridY }, stopping`)
      return true
    } else if (hasAnyWallAt(gridX, gridY)) {
      // No Explosions at walls

      if (hasBreakableWallAt(gridX, gridY)) {
        // Breakable is replaced by a explosion
        const pixX = gridUnitToPixel(gridX, tileWidth)
        const pixY = gridUnitToPixel(gridY, tileHeight)

        const { key, sprite } = addExplosionSprite({
          pixX,
          pixY,
          gridX,
          gridY
        })
        cache.push({ sprite, key })
        explosionMap[key] = sprite

        destroyWallAt(gridX, gridY)
      }

      return true
    } else {
      const pixX = gridUnitToPixel(gridX, tileWidth)
      const pixY = gridUnitToPixel(gridY, tileHeight)

      const { key, sprite } = addExplosionSprite({
        pixX,
        pixY,
        gridX,
        gridY
      })

      cache.push({ sprite, key })
      explosionMap[key] = sprite

      return false
    }
  }

  const putExplosionAt = (x: number, y: number, range: number) => {
    const explosions: ExplosionCache = []

    // The bomb itself
    putAndExplodeAdjacent(explosions, x, y)

    for (let i = x + 1; i <= x + range; i++) {
      const foundObstacle = putAndExplodeAdjacent(explosions, i, y)
      if (foundObstacle) {
        break
      }
    }

    for (let i = x - 1; i >= x - range; i--) {
      const foundObstacle = putAndExplodeAdjacent(explosions, i, y)
      if (foundObstacle) {
        break
      }
    }

    for (let i = y + 1; i <= y + range; i++) {
      const foundObstacle = putAndExplodeAdjacent(explosions, x, i)
      if (foundObstacle) {
        break
      }
    }

    for (let i = y - 1; i >= y - range; i--) {
      const foundObstacle = putAndExplodeAdjacent(explosions, x, i)
      if (foundObstacle) {
        break
      }
    }

    setTimeout(() => {
      explosions.forEach(({ sprite, key }) => {
        sprite.destroy(true)
        delete explosionMap[key]
      })
    }, 400)
  }

  const destroyWallAt = (x: number, y: number) => {
    breakableMap.map.removeTileAt(x, y)
    socket.emit(SocketEvents.WallDestroyed, { x, y })
  }

  const getCurrentPlayer = () => {
    return playerRegistry[playerId]
  }

  const setupPlayerBombAt = (x: number, y: number) => {
    const player = getCurrentPlayer()

    if (spawnedBombCount >= player.status.maxBombCount || player.isDead) {
      return
    } else {
      spawnedBombCount++
      registerBombAt(x, y, player.status.bombRange)
      socket.emit(SocketEvents.NewBombAt, { x, y, ownerId: playerId })

      setTimeout(() => {
        explodeBombAt(x, y)
        spawnedBombCount--
      }, BOMB_TIME)
    }
  }

  const setupBombAt = ({ x, y, range }: TNewBombInfo) => {
    registerBombAt(x, y, range)
    setTimeout(() => {
      explodeBombAt(x, y)
    }, BOMB_TIME)
  }

  const registerBombAt = (x: number, y: number, range: number) => {
    const { tileWidth, tileHeight } = GameDimensions
    const nX = gridUnitToPixel(x, tileWidth)
    const nY = gridUnitToPixel(y, tileHeight)
    const newBomb = currentScene.add.sprite(nX, nY, ASSETS.BOMB, 1)
    const key = makeKey({ x, y })

    bombMap[key] = { sprite: newBomb, range }

    const bombCollide = currentScene.physics.add.existing(newBomb, true)
    groups.addBomb(bombCollide)
  }

  const explodeBombAt = (gridX: number, gridY: number) => {
    const key = makeKey({ x: gridX, y: gridY })

    if (hasBombAt({ x: gridX, y: gridY })) {
      const bomb = bombMap[key]
      bomb.sprite.destroy(true)
      delete bombMap[key]

      putExplosionAt(gridX, gridY, bomb.range)
    }
  }

  const hasBombAt = (coords: SimpleCoordinates): boolean => {
    return makeKey(coords) in bombMap
  }

  const hasExplosionAt = (coords: SimpleCoordinates): boolean => {
    return makeKey(coords) in explosionMap
  }

  const update = () => {
    const scene = currentScene

    groups.playAnimations()

    for (const [id, registry] of Object.entries(playerRegistry)) {
      const { player, directions } = registry

      if (playerId === id) {
        const cursors = scene.input.keyboard.createCursorKeys()

        if (playerRegistry[id].isDead) {
          Object.assign(directions, {
            left: false,
            right: false,
            down: false,
            up: false,
            x: player.x,
            y: player.y
          })
        } else {
          Object.assign(directions, {
            left: cursors.left!.isDown,
            right: cursors.right!.isDown,
            down: cursors.up!.isDown,
            up: cursors.down!.isDown,
            x: player.x,
            y: player.y
          })
        }

        // BombGame.applyPhysicsAndAnimations(player, directions);

        if (cursors.space!.isDown) {
          const { x, y } = findPlayerMapPosition(player)
          if (!hasBombAt({ x, y })) {
            setupPlayerBombAt(x, y)
          }
        }
      }
      // Fixes some position imprecision (from player animations)
      const tolerance = 10
      const isXOk = inRange({
        min: directions.x - tolerance,
        max: directions.x + tolerance,
        value: player.x
      })
      const isYOk = inRange({
        min: directions.y - tolerance,
        max: directions.y + tolerance,
        value: player.y
      })

      if (!isXOk || !isYOk) {
        player.x = directions.x
        player.y = directions.y
      } else {
        applyPhysicsAndAnimations(player, directions)
      }
    }

    // Update server
    const player = getCurrentPlayer()
    if (player) {
      socket.emit(SocketEvents.Movement, player.directions)
    }
  }

  const getPowerAsset = (type: TPowerUpType) => {
    switch (type) {
      case 'BombCount':
        return ASSETS.BOMB_COUNT_POWERUP
      case 'BombRange':
        return ASSETS.BOMB_COUNT_POWERUP
    }
  }

  const placePowerUpAt = (info: TPowerUpInfo) => {
    const { tileWidth, tileHeight } = GameDimensions
    const pixX = gridUnitToPixel(info.x, tileWidth)
    const pixY = gridUnitToPixel(info.y, tileHeight)

    const powerUp = currentScene.add.sprite(
      pixX,
      pixY,
      getPowerAsset(info.powerUpType),
      1
    )

    const collider = currentScene.physics.add.existing(powerUp, true)
    groups.addPowerUp(collider, info.powerUpType)
  }

  const startGame = () => {
    socket.on(
      SocketEvents.InitWithState,
      (state: BackendState & { id: string }) => {
        // Happens at server restarts
        if (!phaserInstance) {
          initPhaser(state)
        }
      }
    )
    socket.emit('ReadyForEvents')
  }

  return { startGame }
}
