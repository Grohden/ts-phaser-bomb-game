import * as React from 'react'
import { useEffect, useState } from 'react'
import { BombGame } from '../lib/Game'
import { PlayerStatus } from 'commons'
import { createStyle } from '../lib/ui/utils'
import StatusBar from '../components/StatusBar'

type TProps = {
  socket: SocketIOClient.Socket
}

const GAME_CONTAINER = 'game-container'

const styles = createStyle({
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }
})

const GameContainer = (props: TProps) => {
  const [status, setStatus] = useState<PlayerStatus>({
    maxBombCount: 1,
    bombRange: 2
  })

  const handleStatusChange = (status: PlayerStatus) => {
    setStatus(status)
  }

  useEffect(() => {
    try {
      BombGame(props.socket, {
        parent: GAME_CONTAINER,
        onDeath: () => {
        },
        onStart: () => {
        },
        onStatusUpdate: handleStatusChange
      }).startGame()
    } catch (e) {
      console.error(e)
    }
  }, [])

  const renderDeathContainer = () => {
    return null

    //   <div className="nes-container">
    //   <div className="column" style={styles.deathContainer}>
    //   <div>You died!</div>
    // </div>
    // </div>

  }
  return (
    <div style={ styles.container }>
      { renderDeathContainer() }
      <div id={ GAME_CONTAINER }>
        <StatusBar
          bombRange={ status.bombRange }
          maxBombCount={ status.maxBombCount }
        />
      </div>
    </div>
  )
}

export default GameContainer