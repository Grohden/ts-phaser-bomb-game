declare interface PlayerDirections {
    up: boolean,
    down: boolean,
    left: boolean,
    right: boolean,
    x: number,
    y: number
}

interface FrontEndState {
    playerRegistry: {
        [id: string]: {
            directions: PlayerDirections,
            player: Phaser.Physics.Arcade.Sprite
        }
    };
}

declare enum SocketEvents {
    Connection = 'connection',
    Movement = 'MOVEMENT',
    NewPlayer = 'NEW_PLAYER',
    Disconnect = 'DISCONNECT',
    StateChange = 'STATE_CHANGE'
}