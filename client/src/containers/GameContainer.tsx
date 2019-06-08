import * as React from 'react'

type TProps = {
  socket: SocketIOClient.Socket
}

const GameContainer = (props: TProps) => {
  return (
    <div>
      <div className="nes-container">
        <div className="column">
          <div>You died!</div>
        </div>
      </div>
      <div id="status-container">
        <div className="status-info">
          <img src="./gui/bomb.png"/>
          <span id="bomb-count">2</span>
        </div>
        <div className="status-info">
          <img src="./gui/explosion.png"/>
          <span id="bomb-range">2</span>
        </div>
      </div>
    </div>
  )
}

export default GameContainer