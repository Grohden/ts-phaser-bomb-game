import {BackendState, GameDimensions, PlayerDirections, SOCKET_UPDATE_INTERVAL, SocketEvents} from 'commons';
import io from 'socket.io-client';
import Phaser from 'phaser';

const socket = io();

interface FrontEndState {
    playerRegistry: {
        [id: string]: {
            directions: PlayerDirections,
            player: Phaser.Physics.Arcade.Sprite
        }
    };
}

const MAIN_TILES = 'MAIN_TILES';

const ASSETS = {
    PLAYER: 'dude'
};

const MAPS = {
    BREAKABLES: 'BREAKABLES',
    BACKGROUND: 'BACKGROUND',
    WALLS: 'WALLS'
};

const config: GameConfig = {
    type: Phaser.AUTO,
    width: GameDimensions.gameWidth,
    height: GameDimensions.gameHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {},
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

const state: FrontEndState = {
    playerRegistry: {}
};

function preload(this: Phaser.Scene) {
    // Map
    this.load.image(MAIN_TILES, 'assets/tileset.png');
    this.load.tilemapCSV(MAPS.BACKGROUND, 'assets/map_background.csv');
    this.load.tilemapCSV(MAPS.WALLS, 'assets/map_walls.csv');
    this.load.tilemapCSV(MAPS.BREAKABLES, 'assets/map_breakables.csv');
    this.load.spritesheet(ASSETS.PLAYER,
        'assets/dude.png', {
            frameWidth: GameDimensions.playerWidth,
            frameHeight: GameDimensions.playerHeight
        }
    );
}

function fabricPlayer(
    context: Phaser.Scene,
    directions: PlayerDirections,
    collisions: Array<Phaser.GameObjects.GameObject>
): Phaser.Physics.Arcade.Sprite {
    const player = context.physics.add.sprite(
        directions.x,
        directions.y,
        ASSETS.PLAYER,
        1
    );

    player.setBounce(0.9);
    player.setCollideWorldBounds(true);

    collisions.forEach(layer => {
        context.physics.add.collider(player, layer);
    });
    return player
}

function makeDefaultTileMap(context: Phaser.Scene, key: string) {
    return context.make.tilemap({
        key,
        tileWidth: GameDimensions.tileWidth,
        tileHeight: GameDimensions.tileHeight
    });
}

function create(this: Phaser.Scene) {
    const context = this;

    // Background
    const backgroundMap = makeDefaultTileMap(this, MAPS.BACKGROUND);
    const backgroundTileSet = backgroundMap.addTilesetImage(MAIN_TILES);
    backgroundMap.createStaticLayer(0, backgroundTileSet, 0, 0);

    // Breakables
    const wallsMap = makeDefaultTileMap(this, MAPS.WALLS);
    const wallsTileSet = wallsMap.addTilesetImage(MAIN_TILES);
    const wallsLayer = wallsMap.createStaticLayer(0, wallsTileSet, 0, 0);
    wallsMap.setCollisionBetween(0, 2);

    // Breakables
    const breakablesMap = makeDefaultTileMap(this, MAPS.BREAKABLES);
    const breakableTileSet = breakablesMap.addTilesetImage(MAIN_TILES);
    const breakableLayer = breakablesMap.createStaticLayer(0, breakableTileSet, 0, 0);
    breakablesMap.setCollisionBetween(0, 2);

    const playerCollisions = [breakableLayer, wallsLayer];

    socket.emit(SocketEvents.NewPlayer);
    socket.on(SocketEvents.StateUpdate, (backState: BackendState) => {
        for (const [id, data] of Object.entries(backState.playerRegistry)) {
            const {playerRegistry} = state;
            if (!(id in playerRegistry)) {
                playerRegistry[id] = {
                    directions: data.directions,
                    player: fabricPlayer(
                        context,
                        data.directions,
                        playerCollisions
                    )
                }
            } else {
                if (socket.id !== id) {
                    playerRegistry[id].directions = data.directions
                }
            }
        }
    });

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers(ASSETS.PLAYER, {
            start: 0,
            end: 3
        }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{
            key: ASSETS.PLAYER,
            frame: 4
        }],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers(ASSETS.PLAYER, {
            start: 5,
            end: 8
        }),
        frameRate: 10,
        repeat: -1
    });
}

interface Directions {
    left: boolean,
    right: boolean,
    down: boolean,
    up: boolean
}

function applyPhysicsAndAnimations(
    sprite: Phaser.Physics.Arcade.Sprite,
    {left, right, down, up}: Directions) {
    const velocity = 160;
    if (left) {
        sprite.setVelocityX(-velocity);
        sprite.anims.play('left', true);
    } else if (right) {
        sprite.setVelocityX(velocity);
        sprite.anims.play('right', true);
    } else {
        sprite.setVelocityX(0);
        sprite.anims.play('turn');
    }

    if (down) {
        sprite.setVelocityY(-velocity);
    } else if (up) {
        sprite.setVelocityY(velocity);
    } else {
        sprite.setVelocityY(0);
    }
}

function inRange({min, max, value}: { min: number, max: number, value: number }) {
    return value >= min && value <= max
}

function update(this: Phaser.Scene) {
    for (const [id, registry] of Object.entries(state.playerRegistry)) {
        const {player, directions} = registry;

        if (socket.id === id) {
            const cursors = this.input.keyboard.createCursorKeys();
            Object.assign(directions, {
                left: cursors.left!.isDown,
                right: cursors.right!.isDown,
                down: cursors.up!.isDown,
                up: cursors.down!.isDown,
                x: player.x,
                y: player.y
            });
            applyPhysicsAndAnimations(player, directions)
        } else {
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
                player.y = directions.y
            } else {
                applyPhysicsAndAnimations(player, directions)
            }
        }
    }
}

socket.on(SocketEvents.Disconnect, () => {
    delete state.playerRegistry[socket.id]
});

// Movement updates
setInterval(function () {
    const player = state.playerRegistry[socket.id];
    if (player) {
        socket.emit(SocketEvents.Movement, player.directions);
    }
}, SOCKET_UPDATE_INTERVAL);
