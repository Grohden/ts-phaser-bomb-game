import express from 'express'
import http from 'http'
import path from 'path'
import { init } from './game';

const app = express();
const server = new http.Server(app);
const clientPath = '../../client';

app.set('port', 5000);

app.use('/', express.static(path.resolve(__dirname, clientPath, 'build')));

app.use('/assets', express.static(path.resolve(__dirname, clientPath, 'build/assets')));

// Routing
app.get('/', (_, response) => {
  response.sendFile(path.resolve(__dirname, clientPath, 'build/index.html'))
});

// Starts the server.
server.listen(5000, () => {
  console.log("Address", server.address());
  console.log('Starting server on port 5000')
});

// Init the game instance
init(server)
