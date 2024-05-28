const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let games = {};  // Store game states
let playerStats = {};  // Store player statistics

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('createGame', ({ playerId, gameName }) => {
        console.log('Create game request received:', playerId, gameName);
        const gameId = generateGameId();
        games[gameId] = {
            id: gameId,
            name: gameName,
            players: [playerId],
            grid: Array(10).fill().map(() => Array(10).fill(null))
        };
        playerStats[playerId] = playerStats[playerId] || { won: 0, lost: 0 };
        socket.join(gameId);
        console.log('Game created:', gameId);
        socket.emit('gameCreated', { gameId, gameName });
        updateStats();
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    function updateStats() {
        io.emit('updateStats', playerStats);
    }

    function generateGameId() {
        return 'game-' + Math.random().toString(36).substr(2, 9);
    }
});

server.listen(4001, () => {
    console.log('Listening on port 4001');
});
