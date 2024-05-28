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
            players: [{ id: playerId, edge: 'top' }],
            grid: Array(10).fill().map(() => Array(10).fill(null))
        };
        playerStats[playerId] = playerStats[playerId] || { won: 0, lost: 0 };
        socket.join(gameId);
        console.log('Game created:', gameId);
        socket.emit('gameCreated', { gameId, gameName, edge: 'top' });
        updateStats();
    });

    socket.on('joinGame', ({ playerId, gameId }) => {
        console.log('Join game request received:', playerId, gameId);
        if (games[gameId]) {
            const edge = games[gameId].players.length === 1 ? 'bottom' : null; // Add more logic for additional players
            games[gameId].players.push({ id: playerId, edge });
            playerStats[playerId] = playerStats[playerId] || { won: 0, lost: 0 };
            socket.join(gameId);
            io.to(gameId).emit('playerJoined', { gameId, players: games[gameId].players });
            console.log('Player joined game:', playerId, gameId);
            socket.emit('gameJoined', { gameId, players: games[gameId].players, edge });
            updateStats();
        } else {
            socket.emit('error', 'Game ID not found');
        }
    });

    socket.on('placeMonster', ({ gameId, playerId, row, col, type }) => {
        console.log('Place monster request received:', gameId, playerId, row, col, type);
        const game = games[gameId];
        if (game && game.players.some(player => player.id === playerId)) {
            game.grid[row][col] = { type, playerId };
            console.log('Updated grid:', game.grid);
            io.to(gameId).emit('updateGrid', game.grid);
        }
    });

    socket.on('moveMonster', ({ gameId, playerId, oldRow, oldCol, newRow, newCol, type }) => {
        console.log('Move monster request received:', gameId, playerId, oldRow, oldCol, newRow, newCol, type);
        const game = games[gameId];
        if (game && game.players.some(player => player.id === playerId)) {
            // Clear old position
            game.grid[oldRow][oldCol] = null;
            // Set new position
            game.grid[newRow][newCol] = { type, playerId };
            console.log('Updated grid after move:', game.grid);
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
