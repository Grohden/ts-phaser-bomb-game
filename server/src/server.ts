import {BackendState, PlayerDirections, SOCKET_UPDATE_INTERVAL, SocketEvents} from 'commons'
import express from 'express'
import http from 'http'
import path from 'path'
import socketIO from 'socket.io'


const app = express();
const server = new http.Server(app);
const io = socketIO(server);

app.set('port', 5000);

app.use('/static', express.static(__dirname + '/static'));

app.use('/assets', express.static(__dirname + '/static/assets'));

// Routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, '/static/index.html'));
});

// Starts the server.
server.listen(5000, function () {
    console.log('Starting server on port 5000');
});


const state: BackendState = {
    playerRegistry: {}
};

io.on('connection', function (socket) {
    socket.on(SocketEvents.NewPlayer, () => {
        state.playerRegistry[socket.id] = {
            directions: {
                down: false,
                left: false,
                right: false,
                up: false,
                x: 0,
                y: 0
            }
        };
    });

    socket.on(SocketEvents.Movement, (directions: PlayerDirections) => {
        const player = state.playerRegistry[socket.id];
        if (player) {
            player.directions = directions
        }
    });

    socket.on(SocketEvents.Disconnect, () => {
        if (socket.id in state.playerRegistry) {
            delete state.playerRegistry[socket.id]
        }
    });
});

setInterval(function () {
    io.sockets.emit(SocketEvents.StateUpdate, state);
}, SOCKET_UPDATE_INTERVAL);