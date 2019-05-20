import io from "socket.io-client";
import {BombGame} from "./Game";
import {PlayerStatus} from "commons";

(function () {
    function startGame() {
        try {
            const socket = io();
            new BombGame(socket, {
                parent: 'game-container',
                onDeath: showDeathMessage,
                onStart: () => setState("state-playing"),
                onStatusUpdate: onStatusUpdate
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

    function onStatusUpdate(status: PlayerStatus) {
        const bombCount = <HTMLElement>(
            document.getElementById("bomb-count")
        );
        const bombRange = <HTMLElement>(
            document.getElementById("bomb-range")
        );

        bombCount.innerHTML = status.maxBombCount + '';
        bombRange.innerHTML = status.bombRange + '';
    }

    window.onload = function () {
        const startGameButton = <HTMLButtonElement>(
            document.getElementById("start-button")
        );

        startGameButton.onclick = function () {
            setState("state-waiting");
            startGame();
        };
    };
})();
