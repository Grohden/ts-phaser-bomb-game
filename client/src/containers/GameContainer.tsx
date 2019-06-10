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
  },
  deathContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255, 0.7)'
  }
})

type TFinishType = 'timeout' | 'death'

const GameContainer = (props: TProps) => {
  const [finishBy, setFinishBy] = useState<null | TFinishType>()
  const [remainingTime, setRemainingTime] = useState(300)
  const [status, setStatus] = useState<PlayerStatus>({
    maxBombCount: 1,
    bombRange: 2
  })

  const handleTimeout = () =>
    setFinishBy('timeout')

  const handleStatusChange = (status: PlayerStatus) =>
    setStatus(status)

  const handleRemainingTimeChange = (time: number) =>
    setRemainingTime(time)

  useEffect(() => {
    try {
      BombGame(props.socket, {
        parent: GAME_CONTAINER,
        onDeath: () => {
        },
        onStart: () => {
        },
        onTimeout: handleTimeout,
        onStatusUpdate: handleStatusChange,
        onUpdateTime: handleRemainingTimeChange
      }).startGame()
    } catch (e) {
      console.error(e)
    }
  }, [])

  const getFinishMessage = (type: TFinishType) => {
    if (type === 'timeout') {
      return 'Time out!'
    }

    if (type === 'death') {
      return 'You died!'
    }
  }

  const renderDeathContainer = () => {
    if (!finishBy) {
      return null
    }

    return (
      <div className="nes-container" style={ styles.deathContainer }>
        <div className="column">
          <div>{ getFinishMessage(finishBy) }</div>
        </div>
      </div>
    )
  }

  return (
    <div style={ styles.container }>
      { renderDeathContainer() }
      <div id={ GAME_CONTAINER }>
        <StatusBar
          remainingTime={ remainingTime }
          bombRange={ status.bombRange }
          maxBombCount={ status.maxBombCount }
        />
      </div>
    </div>
  )
}

export default GameContainer