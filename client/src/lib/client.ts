import io from 'socket.io-client'
import { BombGame } from './Game'
import { PlayerStatus } from 'commons'

(function () {

  function startGame() {
    const socket = io()
    try {
      BombGame(socket, {
        parent: 'game-container',
        onDeath: showDeathMessage,
        onStart: () => setState('state-playing'),
        onStatusUpdate: onStatusUpdate
      }).startGame()
    } catch (e) {
      console.error(e)
    }
  }

  function showDeathMessage() {
    setState('state-died')
  }

  function setState(state: 'state-waiting' | 'state-died' | 'state-playing') {
    if (state === 'state-waiting') {

      return
    }

    if (state === 'state-died') {

      return
    }

    if (state === 'state-playing') {

      return
    }
  }

  function onStatusUpdate(status: PlayerStatus) {
    const bombCount = <HTMLElement>(
      document.getElementById('bomb-count')
    )
    const bombRange = <HTMLElement>(
      document.getElementById('bomb-range')
    )

    bombCount.innerHTML = status.maxBombCount + ''
    bombRange.innerHTML = status.bombRange + ''
  }

  window.onload = function () {
    const startGameButton = <HTMLButtonElement>(
      document.getElementById('im-ready-button')
    )

    startGameButton.onclick = function () {
      setState('state-waiting')
      startGame()
    }
  }
})()
