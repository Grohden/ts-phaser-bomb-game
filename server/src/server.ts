import {BackendState, PlayerDirections, SERVER_UPDATE_INTERVAL, SimpleCoordinates, SocketEvents} from 'commons'
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
    response.sendFile(path.join(__dirname, '/static/index.html'))
});

// Starts the server.
server.listen(5000, function () {
    console.log("Address", server.address());
    console.log('Starting server on port 5000')
});


const state: BackendState = {
    playerRegistry: {},
    destroyedWalls: []
};

io.on('connection', function (socket) {
    const playerId = socket.id; //socket.request.socket.remoteAddress
    const newPlayer = {
        isDead: false,
        directions: {
            down: false,
            left: false,
            right: false,
            up: false,
            x: 0,
            y: 0
        }
    };

    state.playerRegistry[playerId] = newPlayer;

    socket.emit(SocketEvents.InitWithState, {...state, id: playerId});
    socket.broadcast.emit(SocketEvents.NewPlayer, {...newPlayer, id: playerId});

    socket.on(SocketEvents.Movement, (directions: PlayerDirections) => {
        const player = state.playerRegistry[playerId];
        if (player) {
            player.directions = directions
        }
    });

    socket.on(SocketEvents.Disconnect, () => {
        if (playerId in state.playerRegistry) {
            delete state.playerRegistry[playerId]
        }

        io.sockets.emit(SocketEvents.PlayerDisconnect, playerId)
    });

    socket.on(SocketEvents.NewBombAt, (coords: SimpleCoordinates) => {
        socket.broadcast.emit(SocketEvents.NewBombAt, coords)
    });

    socket.on(SocketEvents.WallDestroyed, (coordinates: SimpleCoordinates) => {
        state.destroyedWalls = state.destroyedWalls.concat(coordinates)
    });

    socket.on(SocketEvents.PlayerDied, (deadPlayerId: string) => {
        console.log('Player ', deadPlayerId, ' died');

        if (deadPlayerId in state.playerRegistry) {
            state.playerRegistry[deadPlayerId].isDead = true
        }

        socket.broadcast.emit(SocketEvents.PlayerDied, deadPlayerId)
    })

});

setInterval(function () {
    io.sockets.emit(SocketEvents.StateUpdate, state)
}, SERVER_UPDATE_INTERVAL);