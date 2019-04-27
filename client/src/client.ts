import io from "socket.io-client";
import {BombGame} from "./game";

(function() {
  function startGame() {
    try {
      const socket = io();
      new BombGame(socket, {
        parent: 'game-container',
        onDeath: showDeathMessage,
        onStart: () => setState("state-playing")
      }).startGame();
    } catch (e) {
      console.error(e);
    }
  }

  function showDeathMessage() {
    setState("state-died");
  }

  function setState(state: "state-waiting" | "state-died" | "state-playing") {
    document.body.className = "";
    document.body.classList.add(state);
  }

  window.onload = function() {
    const startGameButton = <HTMLButtonElement>(
      document.getElementById("start-button")
    );

    startGameButton.onclick = function() {
      setState("state-waiting");
      startGame();
    };
  };
})();
