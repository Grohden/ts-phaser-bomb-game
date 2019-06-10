import * as React from 'react'
import { useEffect, useState } from 'react'
import { createStyle } from '../lib/ui/utils'
import { WAIT_SESSION_TIME } from 'commons'

type TProps = {
  socket: SocketIOClient.Socket
  onReady: () => void
}

const styles = createStyle({
  container: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column'
  }
})

const WaitPlayersContainer = (props: TProps) => {
  const [waitState, setWaitState] = useState({
    playerCount: 1,
    timerCount: WAIT_SESSION_TIME
  })

  useEffect(() => {
    props.socket.on('ReadyForSessionCountDown', (state: {
      playerCount: number,
      timerCount: number
    }) => {
      setWaitState(state)
    })

    props.socket.on('StartGame', () => {
      props.onReady()
    })

    props.socket.emit('ReadyForSession')

    return () => {
      props.socket.removeEventListener('ReadyForSessionCountDown')
      props.socket.removeEventListener('StartGame')
    }
  }, [props.socket])

  return (
    <div style={ styles.container }>
      <h1> Starting in { waitState.timerCount }s </h1>
      <h2> { waitState.playerCount } players online </h2>
    </div>
  )
}

export default WaitPlayersContainer