import * as React from 'react'

const styles = {
  container: {
    display: 'flex'
  },
  line: {
    display: 'flex',
    justifyContent: 'center'
  }
}

const Instructions = () =>
  <div style={ styles.container }>
    <div>
      <div style={ styles.line }>
        <a className="nes-btn">↑</a>
      </div>
      <div style={ styles.line }>
        <a className="nes-btn">&#8592;</a>
        <a className="nes-btn">↓</a>
        <a className="nes-btn">&#8594;</a>
      </div>
      <div style={ styles.line }>
        <a className="nes-btn">Space = Bomb</a>
      </div>
    </div>
  </div>

export default Instructions