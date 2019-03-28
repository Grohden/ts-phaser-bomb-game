import io from 'socket.io-client';
import {BombGame} from "./game";

function startGame(addres: string) {
    try {
        const socket = io();
        new BombGame(socket).startGame();
    } catch (e) {
        console.error(e)
    }
}


window.onload = function () {
    const connect = document
        .getElementById("connect") as HTMLButtonElement;
    const address = document
        .getElementById("address") as HTMLInputElement;

    connect.onclick = function () {
        startGame(address.value);
    }
};

