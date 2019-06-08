import * as React from 'react'
import Instructions from '../components/Instructions'

type TProps = {
  onJoinPress: () => void
}

const styles = {
  container: {
    display: 'flex',
    flex: 1
  },
  rightColumn: {
    flex: 1
  },
  leftColumn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignSelf: 'center'
  }
}

const JoinSessionContainer = (props: TProps) => {
  return (
    <div className="nes-container" style={ styles.container }>
      <div style={ styles.rightColumn }>
        <div>Instructions:</div>
        <Instructions/>
      </div>
      <div style={ styles.leftColumn }>
        <a
          onClick={ props.onJoinPress }
          className="nes-btn">
          Join session
        </a>
      </div>
    </div>
  )
}

export default JoinSessionContainer