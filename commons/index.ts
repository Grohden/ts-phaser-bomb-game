export const SERVER_UPDATE_INTERVAL = 1000 / 60;
export const CLIENT_UPDATE_INTERVAL = 1000 / 60;

export const GameDimensions = {
    gameWidth: 540,
    gameHeight: 540,
    playerWidth: 32,
    playerHeight: 48,
    tileWidth: 36,
    tileHeight: 36
};

export interface PlayerDirections {
    up: boolean,
    down: boolean,
    left: boolean,
    right: boolean,
    x: number,
    y: number
}

export const enum SocketEvents {
    InitWithState = 'init_with_state',
    Movement = 'movement',
    NewPlayer = 'new_player',
    Disconnect = 'disconnect',
    PlayerDisconnect = 'player_disconnect',
    StateUpdate = 'state_change'
}


export interface BackendState {
    playerRegistry: {
        [id: string]: {
            directions: PlayerDirections
        }
    };
}