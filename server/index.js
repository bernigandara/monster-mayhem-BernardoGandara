const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let games = {};  // Store game states
let playerStats = {};  // Store player statistics
let scores = {}; // Store player scores

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected');

    //Handle the creation of a new game
    socket.on('createGame', ({ playerId, gameName }) => {
        console.log('Create game request received:', playerId, gameName);
        const gameId = generateGameId(gameName);
        games[gameId] = {
            id: gameId,
            name: gameName,
            players: [{ id: 'player1', edge: 'top' }],
            grid: Array(10).fill().map(() => Array(10).fill(null)),
            currentTurn: 'player1'  // Set the initial turn to player1
        };
        playerStats['player1'] = playerStats['player1'] || { won: 0, lost: 0 };
        scores[gameId] = { player1: 0, player2: 0 }; // Initialize scores
        socket.join(gameId);
        console.log('Game created:', gameId);
        socket.emit('gameCreated', { gameId, gameName, edge: 'top' });
        updateStats();
    });

    //Handle a player joining an existing game
    socket.on('joinGame', ({ playerId, gameId }) => {
        console.log('Join game request received:', playerId, gameId);
        if (games[gameId]) {
            const playerNumber = games[gameId].players.length + 1;
            let edge;
            let newPlayerId;
    
            switch (playerNumber) {
                case 2:
                    edge = 'bottom';
                    newPlayerId = 'player2';
                    break;
                case 3:
                    edge = 'left';
                    newPlayerId = 'player3';
                    break;
                case 4:
                    edge = 'right';
                    newPlayerId = 'player4';
                    break;
                default:
                    socket.emit('error', 'Game is full');
                    return;
            }
    
            games[gameId].players.push({ id: newPlayerId, edge });
            playerStats[newPlayerId] = playerStats[newPlayerId] || { won: 0, lost: 0 };
            socket.join(gameId);
            io.to(gameId).emit('playerJoined', { gameId, players: games[gameId].players });
            console.log('Player joined game:', newPlayerId, gameId);
            socket.emit('gameJoined', { gameId, players: games[gameId].players, edge });
            io.to(gameId).emit('turnChanged', games[gameId].currentTurn); // Notify the current turn
            updateStats();
        } else {
            socket.emit('error', 'Game ID not found');
        }
    });
    

    //Handle a player placing a monster on the grid
    socket.on('placeMonster', ({ gameId, playerId, row, col, type }) => {
        console.log('Place monster request received:', gameId, playerId, row, col, type);
        const game = games[gameId];
        if (game && game.players.some(player => player.id === playerId) && game.currentTurn === playerId) {
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
            io.to(gameId).emit('updateScores', scores[gameId]); // Emit updated scores
    
            // Check for win condition
            if (scores[gameId][playerId] >= 10) {
                io.to(gameId).emit('gameOver', { winner: playerId });
            } else {
                endTurn(gameId);  // Automatically end the turn
            }
        } else {
            socket.emit('alert', 'It is not your turn!');
        }
    });    

    //Handle moving a monster on the grid
    socket.on('moveMonster', ({ gameId, playerId, oldRow, oldCol, newRow, newCol, type }) => {
        console.log('Move monster request received:', gameId, playerId, oldRow, oldCol, newRow, newCol, type);
        const game = games[gameId];
        if (game && game.players.some(player => player.id === playerId) && game.currentTurn === playerId) {
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
            io.to(gameId).emit('updateScores', scores[gameId]); // Emit updated scores
    
            // Check for win condition
            if (scores[gameId][playerId] >= 10) {
                io.to(gameId).emit('gameOver', { winner: playerId });
            } else {
                endTurn(gameId);  // Automatically end the turn
            }
        } else {
            socket.emit('alert', 'It is not your turn!');
        }
    });    

    //Handle ending the current turn and switching to the next player
    //Handle ending the current turn and switching to the next player
    function endTurn(gameId) {
        const game = games[gameId];
        const currentPlayerIndex = game.players.findIndex(player => player.id === game.currentTurn);
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        game.currentTurn = game.players[nextPlayerIndex].id;
        console.log(`Turn changed: ${game.currentTurn}`);  // Add this line
        io.to(gameId).emit('turnChanged', game.currentTurn);
    }


    //Handle client disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    //Emit updated player statistics
    function updateStats() {
        io.emit('updateStats', playerStats);
    }

    //Generate a unique game ID based on the game name
    function generateGameId(gameName) {
        const randomCode = Math.random().toString(36).substr(2, 9);
        return `${gameName}-${randomCode}`;
    }

    //handle ending the current turn via socket event
    socket.on('endTurn', ({ gameId, playerId }) => {
        endTurn(gameId);
    });

    // Handle monster confrontations and determine the winner
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
            scores[gameId][newMonster.playerId]++;
            scores[gameId][existingMonster.playerId]++;
            return { removeBoth: true };
        } else {
            const winnerType = confrontationRules[newMonster.type][existingMonster.type];
            console.log(`Winner type based on rules: ${winnerType}`);
            if (winnerType === newMonster.type) {
                console.log('New monster wins the confrontation.');
                scores[gameId][newMonster.playerId]++;
                return { winner: newMonster };
            } else {
                console.log('Existing monster wins the confrontation.');
                scores[gameId][existingMonster.playerId]++;
                return { winner: existingMonster };
            }
        }
    }
});

server.listen(3000, () => {
    console.log('Listening on port 3000');
});
