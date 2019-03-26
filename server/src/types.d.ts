interface GamePlayer {
    id: String,
    x: number,
    y: number
}

interface BackendState {
    players: { [id: string]: GamePlayer };
}
