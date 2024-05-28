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

    socket.on('joinGame', ({ playerId, gameId }) => {
        console.log('Join game request received:', playerId, gameId);
        if (games[gameId]) {
            games[gameId].players.push(playerId);
            playerStats[playerId] = playerStats[playerId] || { won: 0, lost: 0 };
            socket.join(gameId);
            io.to(gameId).emit('playerJoined', { gameId, players: games[gameId].players });
            console.log('Player joined game:', playerId, gameId);
            socket.emit('gameJoined', { gameId, players: games[gameId].players });
            updateStats();
        } else {
            socket.emit('error', 'Game ID not found');
        }
    });

    socket.on('placeMonster', ({ gameId, playerId, row, col, type }) => {
        console.log('Place monster request received:', gameId, playerId, row, col, type);
        const game = games[gameId];
        if (game && game.players.includes(playerId)) {
            game.grid[row][col] = { type, playerId };
            console.log('Updated grid:', game.grid);
            io.to(gameId).emit('updateGrid', game.grid);
        }
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
