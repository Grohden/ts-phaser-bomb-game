export const SERVER_UPDATE_INTERVAL = 1000 / 60
export const CLIENT_UPDATE_INTERVAL = 1000 / 60

// TODO: use ramda
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export interface SimpleCoordinates {
  x: number,
  y: number
}

const tileWidth = 36
export const GameDimensions = {
  gameWidth: 540,
  gameHeight: 540,
  playerWidth: 32,
  playerHeight: 48,
  tileWidth: tileWidth,
  tileHeight: 36,
  playerBoxRadius: tileWidth / 4
}

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
  NewBombAt = 'new_bomb_at',
  Movement = 'movement',
  NewPlayer = 'new_player',
  Disconnect = 'disconnect',
  PlayerDisconnect = 'player_disconnect',
  StateUpdate = 'state_change',
  WallDestroyed = 'wall_destroyed',
  PlayerDied = 'player_died',
  NewPowerUpAt = 'new_power_up',
  PowerUpCollected = 'power_up_collected',
  PlayerStatusUpdate = 'player_status_updated'
}


export type TPowerUpType = 'BombCount' | 'BombRange'
export type TPowerUpInfo = SimpleCoordinates & {
  powerUpType: TPowerUpType
}

export interface PlayerStatus {
  maxBombCount: number,
  bombRange: number
}

export interface PlayerRegistry {
  isDead: boolean,
  status: PlayerStatus
  slot: keyof BackendState['slots']
  directions: PlayerDirections
}

export interface BackendState {
  remainingTime: 300,
  slots: {
    first?: SimpleCoordinates,
    second?: SimpleCoordinates,
    third?: SimpleCoordinates,
    fourth?: SimpleCoordinates
  }
  playerRegistry: {
    [id: string]: PlayerRegistry
  },
  destroyedWalls: Array<SimpleCoordinates>
}