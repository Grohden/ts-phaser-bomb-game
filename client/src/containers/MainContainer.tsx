import * as React from 'react'
import { useState } from 'react'
import JoinSessionContainer from './JoinSessionContainer'
import WaitPlayersContainer from './WaitPlayersContainer'
import io from 'socket.io-client'
import GameContainer from './GameContainer'

type AvailableRoutes =
  | 'to-join-session'
  | 'waiting-players'
  | 'playing'
  | 'died'

export const MainContainer = () => {
  const [socket] = useState(io())
  const [route, setCurrentRoute] = useState<AvailableRoutes>(
    'to-join-session'
  )

  if (route === 'to-join-session') {
    return (
      <JoinSessionContainer
        onJoinPress={ () => setCurrentRoute('waiting-players') }
      />
    )
  }

  if (route === 'waiting-players') {
    return (
      <WaitPlayersContainer
        socket={ socket }
        onReady={ () => setCurrentRoute('playing') }
      />
    )
  }

  if (route === 'playing') {
    return (
      <GameContainer
        socket={ socket }
      />
    )
  }

  return null
}