const socket = io();
let playerId = null;
let gameId = null;
let playerEdge = null;
let currentTurn = null;

document.getElementById('registerUser').addEventListener('click', () => {
    const username = document.getElementById('username').value;
    if (username) {
        playerId = generatePlayerId(username);
        alert(`User ${username} registered with ID: ${playerId}`);
    }
});

document.getElementById('createGame').addEventListener('click', () => {
    const gameName = document.getElementById('gameName').value;
    if (gameName) {
        playerId = 'player1';
        socket.emit('createGame', { playerId, gameName });
    } else {
        alert('Please enter a game name.');
    }
});

document.getElementById('joinGame').addEventListener('click', () => {
    const inputGameId = document.getElementById('gameId').value;
    if (inputGameId) {
        playerId = 'player2'; // Assume only two players for simplicity
        socket.emit('joinGame', { playerId, gameId: inputGameId });
    } else {
        alert('Please enter a game ID.');
    }
});

document.getElementById('switchTurn').addEventListener('click', () => {
    socket.emit('endTurn', { gameId, playerId });
});

socket.on('gameCreated', ({ gameId: newGameId, gameName, edge }) => {
    gameId = newGameId;
    playerEdge = edge;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('gameInfo').innerText = `Game ID: ${newGameId} (Use this ID to share the game with your friends!)`;
    renderGrid();
    currentTurn = 'player1';
    document.getElementById('currentTurn').innerText = `Current Turn: player1`;
    updateScores({ player1: 0, player2: 0 }); // Reset scores
});

socket.on('gameJoined', ({ gameId: joinedGameId, players, edge }) => {
    gameId = joinedGameId;
    playerEdge = edge;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('gameInfo').innerText = `Game ID: ${joinedGameId} (Use this ID to share the game with your friends!)`;
    updatePlayers(players);
    renderGrid();
    socket.emit('requestTurn', gameId);
    updateScores({ player1: 0, player2: 0 }); // Reset scores
});

socket.on('playerJoined', ({ gameId, players }) => {
    updatePlayers(players);
    updateScores(scores);
});

socket.on('updateGrid', (grid) => {
    renderGrid(grid);
});

socket.on('turnChanged', (newTurn) => {
    currentTurn = newTurn;
    document.getElementById('currentTurn').innerText = `Current Turn: ${newTurn}`;
});

socket.on('updateScores', (scores) => {
    updateScores(scores);
});

socket.on('gameOver', ({ winner }) => {
    displayGameOver(winner);
});

function generatePlayerId(username) {
    return `${username}-${Math.random().toString(36).substr(2, 9)}`;
}

function renderGrid(grid) {
    const board = document.getElementById('board');
    board.innerHTML = ''; // Clear the board
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.dataset.row = row;
            square.dataset.col = col;
            if (grid && grid[row][col]) {
                const img = document.createElement('img');
                img.src = getMonsterImage(grid[row][col].type);
                img.draggable = true;
                img.dataset.row = row;
                img.dataset.col = col;
                img.dataset.type = grid[row][col].type;
                img.dataset.playerId = grid[row][col].playerId;
                img.addEventListener('dragstart', handleDragStart);
                square.appendChild(img);
                square.style.backgroundColor = getPlayerColor(grid[row][col].playerId);
            }
            square.addEventListener('click', () => {
                if (currentTurn === playerId && isOnPlayerEdge(row, col)) {
                    placeMonster(row, col);
                } else {
                    alert('You can only place monsters on your edge or it is not your turn!');
                }
            });
            square.addEventListener('dragover', handleDragOver);
            square.addEventListener('drop', handleDrop);
            board.appendChild(square);
        }
    }
}

function updatePlayers(players) {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '<h3>Players:</h3>';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.textContent = `Player ID: ${player.id}, Edge: ${player.edge}`;
        playersDiv.appendChild(playerElement);
    });
}

function updateScores(scores) {
    document.getElementById('player1Score').innerText = `Player 1: ${scores.player1}`;
    document.getElementById('player2Score').innerText = `Player 2: ${scores.player2}`;
}

function displayGameOver(winner) {
    alert(`Game Over! The winner is ${winner}`);
    document.getElementById('gameScreen').innerHTML += `<h2>Game Over! The winner is ${winner}</h2>`;
    document.querySelectorAll('.square').forEach(square => {
        square.removeEventListener('click', placeMonster);
        square.removeEventListener('dragover', handleDragOver);
        square.removeEventListener('drop', handleDrop);
    });
    document.getElementById('switchTurn').disabled = true; // Disable switch turn button
}

function placeMonster(row, col) {
    const type = prompt("Enter monster type (vampire, werewolf, ghost):");
    if (type === 'vampire' || type === 'werewolf' || type === 'ghost') {
        socket.emit('placeMonster', { gameId, playerId, row, col, type });
        endTurn();
    } else {
        alert('Invalid monster type');
    }
}

function endTurn() {
    socket.emit('endTurn', { gameId, playerId });
}

function handleDragStart(event) {
    const row = event.target.dataset.row;
    const col = event.target.dataset.col;
    const type = event.target.dataset.type;
    const playerId = event.target.dataset.playerId;
    event.dataTransfer.setData('text/plain', JSON.stringify({ row, col, type, playerId }));
}

function handleDragOver(event) {
    event.preventDefault();
}

function handleDrop(event) {
    event.preventDefault();
    if (currentTurn === playerId) {
        const data = event.dataTransfer.getData('text/plain');
        const { row: oldRow, col: oldCol, type, playerId: ownerPlayerId } = JSON.parse(data);
        const newRow = event.target.dataset.row;
        const newCol = event.target.dataset.col;

        if (playerId === ownerPlayerId) {
            socket.emit('moveMonster', { gameId, playerId, oldRow, oldCol, newRow, newCol, type });
            endTurn();
        }
    } else {
        alert('It is not your turn!');
    }
}

function isOnPlayerEdge(row, col) {
    if (playerEdge === 'top' && row === 0) return true;
    if (playerEdge === 'bottom' && row === 9) return true;
    return false;
}

function getMonsterImage(type) {
    switch (type) {
        case 'vampire':
            return 'images/vampire.png';
        case 'werewolf':
            return 'images/werewolf.png';
        case 'ghost':
            return 'images/ghost.png';
        default:
            return '';
    }
}

function getPlayerColor(playerId) {
    const colors = {
        'player1': '#008000', // Green
        'player2': '#FFA500'  // Orange
    };

    if (playerId in colors) {
        return colors[playerId];
    } else {
        const defaultColors = ['#FF0000', '#0000FF', '#800080'];
        return defaultColors[playerId.charCodeAt(playerId.length - 1) % defaultColors.length];
    }
}
