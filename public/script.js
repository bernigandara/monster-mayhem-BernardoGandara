const socket = io();
let playerId = null;
let gameId = null;
let playerEdge = null;
let currentTurn = null;

//Register a new user and generate a playerID
document.getElementById('registerUser').addEventListener('click', () => {
    const username = document.getElementById('username').value;
    if (username) {
        playerId = generatePlayerId(username);
        alert(`User ${username} registered with ID: ${playerId}`);
    }
});

//Create new game using user input for game name
document.getElementById('createGame').addEventListener('click', () => {
    const gameName = document.getElementById('gameName').value;
    if (gameName) {
        playerId = 'player1';
        socket.emit('createGame', { playerId, gameName });
    } else {
        alert('Please enter a game name.');
    }
});

//Join an existing game with the provided gameID
document.getElementById('joinGame').addEventListener('click', () => {
    const inputGameId = document.getElementById('gameId').value;
    if (inputGameId) {
        const playerNumber = prompt("Enter player number (1-4):");
        playerId = `player${playerNumber}`; // Adjust player ID based on input
        socket.emit('joinGame', { playerId, gameId: inputGameId });
    } else {
        alert('Please enter a game ID.');
    }
});

// Handle the 'gameCreated' event from the server
socket.on('gameCreated', ({ gameId: newGameId, gameName, edge }) => {
    gameId = newGameId;
    playerEdge = edge;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('gameInfo').innerText = `Game ID: ${newGameId} (Use this ID to share the game with your friends!)`;
    renderGrid();
    currentTurn = 'player1';
    const currentTurnElement = document.getElementById('currentTurn');
    const currentTurnDisplayElement = document.getElementById('currentTurnDisplay');
    if (currentTurnElement) {
        currentTurnElement.innerText = `Current Turn: player1`;
    }
    if (currentTurnDisplayElement) {
        currentTurnDisplayElement.innerText = `Turn: player1`;
    }
    updateScores({ player1: 0, player2: 0, player3: 0, player4: 0 }); // Reset scores
});

// Handle the 'gameJoined' event from the server
socket.on('gameJoined', ({ gameId: joinedGameId, players, edge }) => {
    gameId = joinedGameId;
    playerEdge = edge;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('gameInfo').innerText = `Game ID: ${joinedGameId} (Use this ID to share the game with your friends!)`;
    updatePlayers(players);
    renderGrid();
    socket.emit('requestTurn', gameId); // Request the current turn from the server
    updateScores({ player1: 0, player2: 0, player3: 0, player4: 0 }); // Reset scores
});

//Update player list when a new player joins the game
socket.on('playerJoined', ({ gameId, players }) => {
    updatePlayers(players);
    updateScores(scores);
});

//update the game grid
socket.on('updateGrid', (grid) => {
    renderGrid(grid);
});

// Handle the turn change event
socket.on('turnChanged', (newTurn) => {
    currentTurn = newTurn;
    const currentTurnElement = document.getElementById('currentTurn');
    const currentTurnDisplayElement = document.getElementById('currentTurnDisplay');
    if (currentTurnElement) {
        currentTurnElement.innerText = `Current Turn: ${newTurn}`;
    }
    if (currentTurnDisplayElement) {
        currentTurnDisplayElement.innerText = `Turn: ${newTurn}`;
    }
    alert(`Turn switched! Now playing: ${newTurn}`);
});


//Update the scores
socket.on('updateScores', (scores) => {
    updateScores(scores);
});

//Handles the game over event
socket.on('gameOver', ({ winner }) => {
    displayGameOver(winner);
});

//Generates a unique paler ID using the username
function generatePlayerId(username) {
    return `${username}-${Math.random().toString(36).substr(2, 9)}`;
}

//Render the game grid on the board
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
                if (currentTurn === playerId && isOnPlayerEdge(playerEdge, row, col)) {
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

//Updates the player list
function updatePlayers(players) {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '<h3>Players:</h3>';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.textContent = `Player ID: ${player.id}, Edge: ${player.edge}`;
        playersDiv.appendChild(playerElement);
    });
}

// Update the score display
function updateScores(scores) {
    document.getElementById('player1Score').innerText = `Player 1: ${scores.player1}`;
    document.getElementById('player2Score').innerText = `Player 2: ${scores.player2}`;
    document.getElementById('player3Score').innerText = `Player 3: ${scores.player3}`;
    document.getElementById('player4Score').innerText = `Player 4: ${scores.player4}`;
}


//Display game over message
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

//Prompts the user to place a monster on the board
function placeMonster(row, col) {
    const type = prompt("Enter monster type (vampire, werewolf, ghost):");
    if (type === 'vampire' || type === 'werewolf' || type === 'ghost') {
        socket.emit('placeMonster', { gameId, playerId, row, col, type });
    } else {
        alert('Invalid monster type');
    }
}

//Emits event ot end the current turn
function endTurn() {
    socket.emit('endTurn', { gameId, playerId });
}

//Handles the drag start event for a monster
function handleDragStart(event) {
    const row = event.target.dataset.row;
    const col = event.target.dataset.col;
    const type = event.target.dataset.type;
    const playerId = event.target.dataset.playerId;
    event.dataTransfer.setData('text/plain', JSON.stringify({ row, col, type, playerId }));
}

//Handles the dar over event allowing dropping
function handleDragOver(event) {
    event.preventDefault();
}

// Handle the drop event for a monster
function handleDrop(event) {
    event.preventDefault();
    if (currentTurn === playerId) {
        const data = event.dataTransfer.getData('text/plain');
        const { row: oldRow, col: oldCol, type, playerId: ownerPlayerId } = JSON.parse(data);
        const newRow = parseInt(event.target.dataset.row);
        const newCol = parseInt(event.target.dataset.col);

        if (playerId === ownerPlayerId) {
            // Calculate the difference in rows and columns
            const rowDiff = Math.abs(newRow - oldRow);
            const colDiff = Math.abs(newCol - oldCol);

            // Check if the move is valid
            if ((rowDiff === 0 && colDiff > 0) || (colDiff === 0 && rowDiff > 0) || (rowDiff <= 2 && colDiff <= 2)) {
                socket.emit('moveMonster', { gameId, playerId, oldRow, oldCol, newRow, newCol, type });
            } else {
                alert('Invalid move! Monsters can only move freely vertically and horizontally, or exactly two squares diagonally.');
            }
        }
    } else {
        alert('It is not your turn!');
    }
}

//Check if the square is on the player's edge
function isOnPlayerEdge(playerEdge, row, col) {
    if ((playerEdge === 'top' && row === 0) ||
        (playerEdge === 'bottom' && row === 9) ||
        (playerEdge === 'left' && col === 0) ||
        (playerEdge === 'right' && col === 9)) {
        return true;
    }
    return false;
}


//Returns image path for the given monster type
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

//Returns the colour for the given player ID
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
