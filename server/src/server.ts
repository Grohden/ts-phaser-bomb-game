import express from 'express'
import http from 'http'
import path from 'path'
import socketIO from 'socket.io'

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
let playerCount = 0
let timerCount = 30
let gameRunning = false

function setupCountdown() {
  currentTimer && clearInterval(currentTimer)
  timerCount = 30

  currentTimer = setInterval(function () {
    timerCount--

    if (timerCount > 0) {
      io.sockets.emit('ReadyForSessionCountDown', {
        playerCount,
        timerCount
      })
    } else {
      gameRunning = true
      io.sockets.emit('StartGame')
      currentTimer && clearInterval(currentTimer)
    }
  }, 1000)
}

io.on('connection', function (socket) {
  const playerId = socket.id //socket.request.socket.remoteAddress

  if (gameRunning) {
  } else {
    let isReady = false

    socket.on('ReadyForSession', () => {
      timerCount = 30
      isReady = true
      playerCount++

      if (playerCount > 1) {
        setupCountdown()
      }
    })

    socket.on('disconnect', () => {
      if (isReady) {
        playerCount--
      }
      if (playerCount > 1) {
        setupCountdown()
      } else {
        currentTimer && clearInterval(currentTimer)

        timerCount = 30
        io.sockets.emit('ReadyForSessionCountDown', {
          playerCount,
          timerCount
        })

      }
    })
  }
})