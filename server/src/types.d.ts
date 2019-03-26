interface GamePlayer {
    id: String,
    x: number,
    y: number
}

interface BackendState {
    players: { [id: string]: GamePlayer };
}

declare enum SocketEvents {
    Connection = 'connection',
    Movement = 'MOVEMENT',
    NewPlayer = 'NEW_PLAYER',
    Disconnect = 'DISCONNECT',
    StateChange = 'STATE_CHANGE'
}