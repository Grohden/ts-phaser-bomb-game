import io from 'socket.io-client'
import { BombGame } from "./game"

function startGame() {
    try {
        const socket = io()
        new BombGame(socket).startGame()
    } catch (e) {
        console.error(e)
    }
}


window.onload = function () {
    startGame()
}

