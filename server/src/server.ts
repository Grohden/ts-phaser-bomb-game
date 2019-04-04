import { BackendState, PlayerDirections, SERVER_UPDATE_INTERVAL, SocketEvents, SimpleCoordinates } from 'commons'
import express from 'express'
import http from 'http'
import path from 'path'
import socketIO from 'socket.io'
import { Socket } from 'dgram';


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
    console.log("Address", server.address());
    console.log('Starting server on port 5000');
});


const state: BackendState = {
    playerRegistry: {},
    destroyedWalls: []
};

io.on('connection', function (socket) {
    const newPlayer = {
        directions: {
            down: false,
            left: false,
            right: false,
            up: false,
            x: 0,
            y: 0
        }
    };
    state.playerRegistry[socket.id] = newPlayer

    socket.emit(SocketEvents.InitWithState, state)
    socket.broadcast.emit(SocketEvents.NewPlayer, { ...newPlayer, id: socket.id })

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

        io.sockets.emit(SocketEvents.PlayerDisconnect, socket.id)
    });

    socket.on(SocketEvents.WallDestroyed, (coordinates: SimpleCoordinates) => {
        state.destroyedWalls = state.destroyedWalls.concat(coordinates)
    })

});

setInterval(function () {
    io.sockets.emit(SocketEvents.StateUpdate, state);
}, SERVER_UPDATE_INTERVAL);