import io from "socket.io-client";
import {BombGame} from "./game";

function startGame() {
  try {
    const socket = io();
    new BombGame(socket).startGame();
  } catch (e) {
    console.error(e);
  }
}

window.onload = function() {
  const startGameButton = <HTMLButtonElement>(
    document.getElementById("start-button")
  );

  startGameButton.onclick = function() {
    document.body.className = "";
    document.body.classList.add("state-waiting");
    startGame();
  };
};
