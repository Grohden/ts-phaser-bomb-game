"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = __importDefault(require("socket.io"));
const SocketEvents = {
    Movement: 'MOVEMENT',
    NewPlayer: 'NEW_PLAYER',
    Disconnect: 'DISCONNECT',
    StateChange: 'STATE_CHANGE'
};
const SOCKET_UPDATE_INTERVAL = 1000 / 60;
const app = express_1.default();
const server = new http_1.default.Server(app);
const io = socket_io_1.default(server);
app.set('port', 5000);
app.use('/static', express_1.default.static(__dirname + '/static'));
app.use('/assets', express_1.default.static(__dirname + '/static/assets'));
// Routing
app.get('/', function (request, response) {
    response.sendFile(path_1.default.join(__dirname, '/static/index.html'));
});
// Starts the server.
server.listen(5000, function () {
    console.log('Starting server on port 5000');
});
const state = {
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
    socket.on(SocketEvents.Movement, (data) => {
        state.players[socket.id] = data;
    });
    socket.on(SocketEvents.Disconnect, () => {
        if (socket.id in state.players) {
            delete state.players[socket.id];
        }
    });
});
setInterval(function () {
    io.sockets.emit(SocketEvents.StateChange, state.players);
}, SOCKET_UPDATE_INTERVAL);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHNEQUE4QjtBQUM5QixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDBEQUFpQztBQU1qQyxNQUFNLFlBQVksR0FBRztJQUNqQixRQUFRLEVBQUUsVUFBVTtJQUNwQixTQUFTLEVBQUUsWUFBWTtJQUN2QixVQUFVLEVBQUUsWUFBWTtJQUN4QixXQUFXLEVBQUUsY0FBYztDQUM5QixDQUFBO0FBRUQsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ3pDLE1BQU0sR0FBRyxHQUFHLGlCQUFPLEVBQUUsQ0FBQztBQUN0QixNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEMsTUFBTSxFQUFFLEdBQUcsbUJBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUU1QixHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUV0QixHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUUxRCxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBRWpFLFVBQVU7QUFDVixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxVQUFVLE9BQU8sRUFBRSxRQUFRO0lBQ3BDLFFBQVEsQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDO0FBRUgscUJBQXFCO0FBQ3JCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFO0lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sS0FBSyxHQUFpQjtJQUN4QixPQUFPLEVBQUUsRUFBRTtDQUNkLENBQUM7QUFFRixFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxVQUFVLE1BQU07SUFDaEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUNuQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRztZQUN2QixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDYixDQUFDLEVBQUUsR0FBRztZQUNOLENBQUMsRUFBRSxHQUFHO1NBQ1QsQ0FBQztJQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBZ0IsRUFBRSxFQUFFO1FBQ2xELEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDcEMsSUFBSSxNQUFNLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDNUIsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtTQUNsQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUM7QUFFSCxXQUFXLENBQUM7SUFDUixFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3RCxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyJ9