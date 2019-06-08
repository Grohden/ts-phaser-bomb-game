import * as React from 'react'
import { createStyle } from '../lib/ui/utils'

type TProps = {
  maxBombCount: number
  bombRange: number
}

const styles = createStyle({
  container: {
    display: 'flex'
  }
})

const StatusBar = (props: TProps) =>
  <div style={ styles.container }>
    <div className="status-info">
      <img src="./gui/bomb.png"/>
      <span> { props.maxBombCount } </span>
    </div>
    <div className="status-info">
      <img src="./gui/explosion.png"/>
      <span> { props.bombRange } </span>
    </div>
  </div>

export default StatusBar