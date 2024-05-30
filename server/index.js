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
            players: [{ id: 'player1', edge: 'top' }],
            grid: Array(10).fill().map(() => Array(10).fill(null))
        };
        playerStats['player1'] = playerStats['player1'] || { won: 0, lost: 0 };
        socket.join(gameId);
        console.log('Game created:', gameId);
        socket.emit('gameCreated', { gameId, gameName, edge: 'top' });
        updateStats();
    });
    
    socket.on('joinGame', ({ playerId, gameId }) => {
        console.log('Join game request received:', playerId, gameId);
        if (games[gameId]) {
            const playerNumber = games[gameId].players.length + 1;
            const edge = playerNumber === 2 ? 'bottom' : null; // Add more logic for additional players
            const newPlayerId = playerNumber === 2 ? 'player2' : playerId;
            games[gameId].players.push({ id: newPlayerId, edge });
            playerStats[newPlayerId] = playerStats[newPlayerId] || { won: 0, lost: 0 };
            socket.join(gameId);
            io.to(gameId).emit('playerJoined', { gameId, players: games[gameId].players });
            console.log('Player joined game:', newPlayerId, gameId);
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
            const newMonster = { type, playerId };
            if (game.grid[row][col]) {
                const result = handleConfrontation(gameId, row, col, newMonster);
                if (result.alert) {
                    socket.emit('alert', result.alert);
                    return;
                } else if (result.removeBoth) {
                    game.grid[row][col] = null;
                } else {
                    game.grid[row][col] = result.winner;
                }
            } else {
                game.grid[row][col] = newMonster;
            }
            console.log('Updated grid:', game.grid);
            io.to(gameId).emit('updateGrid', game.grid);
            endTurn(gameId);
        }
    });

    socket.on('moveMonster', ({ gameId, playerId, oldRow, oldCol, newRow, newCol, type }) => {
        console.log('Move monster request received:', gameId, playerId, oldRow, oldCol, newRow, newCol, type);
        const game = games[gameId];
        if (game && game.players.some(player => player.id === playerId)) {
            const newMonster = { type, playerId };
            if (game.grid[newRow][newCol]) {
                const result = handleConfrontation(gameId, newRow, newCol, newMonster);
                if (result.alert) {
                    socket.emit('alert', result.alert);
                    return;
                } else if (result.removeBoth) {
                    game.grid[newRow][newCol] = null;
                } else {
                    game.grid[newRow][newCol] = result.winner;
                }
            } else {
                game.grid[newRow][newCol] = newMonster;
            }
            game.grid[oldRow][oldCol] = null;
            console.log('Updated grid after move:', game.grid);
            io.to(gameId).emit('updateGrid', game.grid);
            endTurn(gameId);
        }
    });

    function endTurn(gameId) {
        const game = games[gameId];
        const currentPlayerIndex = game.players.findIndex(player => player.id === game.currentTurn);
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        game.currentTurn = game.players[nextPlayerIndex].id;
        io.to(gameId).emit('turnChanged', game.currentTurn);
    }

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    function updateStats() {
        io.emit('updateStats', playerStats);
    }

    function generateGameId() {
        return 'game-' + Math.random().toString(36).substr(2, 9);
    }

    socket.on('endTurn', ({ gameId, playerId }) => {
        const game = games[gameId];
        const currentPlayerIndex = game.players.findIndex(player => player.id === playerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        game.currentTurn = game.players[nextPlayerIndex].id;
        io.to(gameId).emit('turnChanged', game.currentTurn);
    });

    socket.on('turnChanged', (newTurn) => {
        currentTurn = newTurn;
        document.getElementById('currentTurn').innerText = `Current Turn: ${newTurn}`;
      });


    // Additional function to handle confrontations
    function handleConfrontation(gameId, row, col, newMonster) {
        const existingMonster = games[gameId].grid[row][col];
    
        if (existingMonster.playerId === newMonster.playerId) {
            // Both monsters belong to the same player
            return { alert: "That square is occupied by your monster!" };
        }
    
        const confrontationRules = {
            'vampire': { 'werewolf': 'vampire', 'ghost': 'ghost' },
            'werewolf': { 'vampire': 'vampire', 'ghost': 'werewolf' },
            'ghost': { 'vampire': 'ghost', 'werewolf': 'werewolf' }
        };
    
        console.log(`Confrontation: New Monster (${newMonster.type}) vs Existing Monster (${existingMonster.type})`);
    
        if (newMonster.type === existingMonster.type) {
            console.log('Both monsters are of the same type. Both will be removed.');
            return { removeBoth: true };
        } else {
            const winnerType = confrontationRules[newMonster.type][existingMonster.type];
            console.log(`Winner type based on rules: ${winnerType}`);
            if (winnerType === newMonster.type) {
                console.log('New monster wins the confrontation.');
                return { winner: newMonster };
            } else {
                console.log('Existing monster wins the confrontation.');
                return { winner: existingMonster };
            }
        }
    }    
        
});

server.listen(4001, () => {
    console.log('Listening on port 4001');
});
