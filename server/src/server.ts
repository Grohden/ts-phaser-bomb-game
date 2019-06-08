import express from 'express'
import http from 'http'
import path from 'path'
import socketIO, { Socket } from 'socket.io'
import { initGameSocketListeners } from './game-socket-listeners'

const app = express()
const server = new http.Server(app)
const io = socketIO(server)
const clientPath = '../../client'

app.set('port', 5000)

app.use('/', express.static(path.resolve(__dirname, clientPath, 'build')))

app.use('/assets', express.static(path.resolve(__dirname, clientPath, 'build/assets')))

app.use(
  '/libs/react',
  express.static(path.resolve(__dirname, '../../node_modules/react'))
)

app.use(
  '/libs/react-dom',
  express.static(path.resolve(__dirname, '../../node_modules/react-dom'))
)

// Routing
app.get('/', function (request, response) {
  response.sendFile(path.resolve(__dirname, clientPath, 'index.html'))
})

// Starts the server.
server.listen(5000, function () {
  console.log('Address', server.address())
  console.log('Starting server on port 5000')
})

let currentTimer: null | NodeJS.Timeout = null

type TConItem = {
  id: string,
  socket: Socket
}
let playerList: TConItem[] = []
let timerCount = 10
let runningGame: ((playerId: string, socket: Socket) => void) | null = null

function setupCountdown() {
  currentTimer && clearInterval(currentTimer)
  timerCount = 10

  currentTimer = setInterval(function () {
    timerCount--

    if (timerCount > 0) {
      io.sockets.emit('ReadyForSessionCountDown', {
        playerCount: playerList.length,
        timerCount
      })
    } else {
      io.sockets.emit('StartGame')
      currentTimer && clearInterval(currentTimer)

      if (!runningGame) {
        runningGame = initGameSocketListeners(io)
      }

      playerList.forEach(it => {
        runningGame!(it.id, it.socket)
      })
    }
  }, 1000)
}

io.on('connection', function (socket) {
  const playerId = socket.id //socket.request.socket.remoteAddress

  if (runningGame) {
    runningGame(playerId, socket)
  } else {
    let isReady = false

    socket.on('ReadyForSession', () => {
      timerCount = 10
      isReady = true
      playerList.push({
        id: playerId,
        socket
      })

      if (playerList.length > 1) {
        setupCountdown()
      }
    })

    socket.on('disconnect', () => {
      if (isReady) {
        playerList = playerList.filter(it => it.id !== playerId)
      }

      if (playerList.length > 1) {
        setupCountdown()
      } else {
        currentTimer && clearInterval(currentTimer)

        timerCount = 10
        io.sockets.emit('ReadyForSessionCountDown', {
          playerCount: playerList.length,
          timerCount
        })
      }
    })
  }
})