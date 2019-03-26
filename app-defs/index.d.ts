export interface PlayerDirections {
    up: boolean,
    down: boolean,
    left: boolean,
    right: boolean,
    x: number,
    y: number
}

export enum SocketEvents {
    Connection = 'connection',
    Movement = 'MOVEMENT',
    NewPlayer = 'NEW_PLAYER',
    Disconnect = 'DISCONNECT',
    StateChange = 'STATE_CHANGE'
}    


export interface GamePlayer {
    id: String,
    x: number,
    y: number
}
