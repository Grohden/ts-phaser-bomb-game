import {
    BackendState,
    GameDimensions,
    PlayerDirections,
    SERVER_UPDATE_INTERVAL,
    SimpleCoordinates,
    SocketEvents
} from 'commons'
import express from 'express'
import http from 'http'
import path from 'path'
import socketIO from 'socket.io'


const app = express();
const server = new http.Server(app);
const io = socketIO(server);
const clientPath = '../../client';

app.set('port', 5000);

app.use('/static', express.static(path.resolve(__dirname, clientPath, 'build')));

app.use('/assets', express.static(path.resolve(__dirname, clientPath, 'build/assets')));

// Routing
app.get('/', function (request, response) {
    response.sendFile(path.resolve(__dirname, clientPath, 'build/index.html'))
});

// Starts the server.
server.listen(5000, function () {
    console.log("Address", server.address());
    console.log('Starting server on port 5000')
});


const state: BackendState = {
    slots: {},
    playerRegistry: {},
    destroyedWalls: []
};


type TRandomSlot = SimpleCoordinates & { slot: keyof BackendState['slots'] }
function findRandomSlot(): TRandomSlot | undefined {
    const centerXOffset = (GameDimensions.tileWidth / 2) - (GameDimensions.playerHeight / 2);
    const centerYOffset = (GameDimensions.tileHeight / 2) - (GameDimensions.playerWidth / 2);
    const availableSlots: TRandomSlot[] = [];

    if (!state.slots.first) {
        availableSlots.push({
            slot: 'first',
            x: centerXOffset,
            y: centerYOffset
        })
    }

    if (!state.slots.second) {
        availableSlots.push({
            slot: 'second',
            x: GameDimensions.gameWidth - centerXOffset,
            y: centerYOffset
        })
    }

    if (!state.slots.third) {
        availableSlots.push({
            slot: 'third',
            x: centerXOffset,
            y: GameDimensions.gameHeight - centerYOffset
        })
    }

    if (!state.slots.fourth) {
        availableSlots.push({
            slot: 'fourth',
            x: GameDimensions.gameWidth - centerXOffset,
            y: GameDimensions.gameHeight - centerYOffset
        })
    }


    if(availableSlots.length >= 1){
        return availableSlots[Math.floor(Math.random()*availableSlots.length)];
    }
}

io.on('connection', function (socket) {
    const playerId = socket.id; //socket.request.socket.remoteAddress

    const position = findRandomSlot();
    if (position) {
        const newPlayer = {
            isDead: false,
            slot: position.slot,
            directions: {
                down: false,
                left: false,
                right: false,
                up: false,
                ...position
            }
        };

        console.log(`New player ${playerId} joins at x ${newPlayer.directions.x} y ${newPlayer.directions.x} on slot ${[position.slot]}`);
        state.slots[newPlayer.slot] = position;
        state.playerRegistry[playerId] = newPlayer;

        socket.emit(SocketEvents.InitWithState, {...state, id: playerId});
        socket.broadcast.emit(SocketEvents.NewPlayer, {...newPlayer, id: playerId});
    } else {
        socket.emit(SocketEvents.InitWithState, {...state, id: playerId});
    }

    socket.on(SocketEvents.Movement, (directions: PlayerDirections) => {
        const player = state.playerRegistry[playerId];
        if (player) {
            player.directions = directions
        }
    });

    socket.on(SocketEvents.Disconnect, () => {
        const player = state.playerRegistry[playerId];
        if (player) {
            delete state.slots[player.slot];
            delete state.playerRegistry[playerId];
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