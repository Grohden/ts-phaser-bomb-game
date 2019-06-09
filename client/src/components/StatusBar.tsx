import * as React from 'react'
import { createStyle } from '../lib/ui/utils'

type TProps = {
  remainingTime: number
  maxBombCount: number
  bombRange: number
}

const styles = createStyle({
  container: {
    display: 'flex'
  },
  leftColumn: {
    flex: 1,
    display: 'flex'
  },
  rightColumn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center'
  }
})

const StatusBar = (props: TProps) => {

  const format = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const formattedSeconds = ((seconds % 60) + '').padStart(2, '0')

    return `${ minutes }:${ formattedSeconds }`
  }

  return (
    <div style={ styles.container }>
      <div style={ styles.leftColumn }>
        <div className="status-info">
          <img src="./gui/bomb.png"/>
          <span> { props.maxBombCount } </span>
        </div>
        <div className="status-info">
          <img src="./gui/explosion.png"/>
          <span> { props.bombRange } </span>
        </div>
      </div>
      <div style={ styles.rightColumn }>
        <span> { format(props.remainingTime) }</span>
      </div>
    </div>
  )
}
export default StatusBar