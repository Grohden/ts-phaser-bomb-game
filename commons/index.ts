export const SOCKET_UPDATE_INTERVAL = 1000 / 60;

export interface PlayerDirections {
    up: boolean,
    down: boolean,
    left: boolean,
    right: boolean,
    x: number,
    y: number
}

export const enum SocketEvents {
    Movement = 'movement',
    NewPlayer = 'new_player',
    Disconnect = 'disconnect',
    StateChange = 'state_change'
}


export interface GamePlayer {
    id: String,
    x: number,
    y: number
}
