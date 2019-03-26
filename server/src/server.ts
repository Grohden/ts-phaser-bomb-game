import express from 'express';
import http from 'http';
import path from 'path';
import socketIO from 'socket.io';

const SocketEvents = {
    Movement: 'MOVEMENT',
    NewPlayer: 'NEW_PLAYER',
    Disconnect: 'DISCONNECT',
    StateChange: 'STATE_CHANGE'
}

const SOCKET_UPDATE_INTERVAL = 1000 / 60;
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
    players: {}
};

io.on('connection', function (socket) {
    socket.on(SocketEvents.NewPlayer, () => {
        state.players[socket.id] = {
            id: socket.id,
            x: 100,
            y: 100
        };
    });
    socket.on(SocketEvents.Movement, (data: GamePlayer) => {
        state.players[socket.id] = data
    });

    socket.on(SocketEvents.Disconnect, () => {
        if (socket.id in state.players) {
            delete state.players[socket.id]
        }
    });
});

setInterval(function () {
    io.sockets.emit(SocketEvents.StateChange, state.players);
}, SOCKET_UPDATE_INTERVAL);