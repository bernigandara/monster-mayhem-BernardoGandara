const socket = io();
let playerId = null;
let gameId = null;

document.getElementById('registerUser').addEventListener('click', () => {
  const username = document.getElementById('username').value;
  if (username) {
    playerId = generatePlayerId(username);
    alert(`User ${username} registered with ID: ${playerId}`);
  }
});

document.getElementById('createGame').addEventListener('click', () => {
  const gameName = document.getElementById('gameName').value;
  console.log('Create game button clicked:', playerId, gameName);
  if (playerId && gameName) {
    socket.emit('createGame', { playerId, gameName });
  } else {
    alert('Please register a user and enter a game name.');
  }
});

document.getElementById('joinGame').addEventListener('click', () => {
  const inputGameId = document.getElementById('gameId').value;
  console.log('Join game button clicked:', playerId, inputGameId);
  if (playerId && inputGameId) {
    socket.emit('joinGame', { playerId, gameId: inputGameId });
  } else {
    alert('Please register a user and enter a game ID.');
  }
});

socket.on('gameCreated', ({ gameId: newGameId, gameName }) => {
  console.log('Game created:', newGameId, gameName);
  alert(`Game "${gameName}" created with ID: ${newGameId}`);
  gameId = newGameId; // Correctly set the gameId
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  document.getElementById('gameInfo').innerText = `Game ID: ${newGameId} (Use this ID to share the game with your friends!)`;
  renderGrid();
});

socket.on('gameJoined', ({ gameId: joinedGameId, players }) => {
  console.log('Game joined:', joinedGameId, players);
  alert(`Joined game with ID: ${joinedGameId}`);
  gameId = joinedGameId; // Correctly set the gameId
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  document.getElementById('gameInfo').innerText = `Game ID: ${joinedGameId} (Use this ID to share the game with your friends!)`;
  updatePlayers(players);
  renderGrid();
});

socket.on('playerJoined', ({ gameId, players }) => {
  console.log('Player joined game:', gameId, players);
  updatePlayers(players);
});

socket.on('updateGrid', (grid) => {
  console.log('Grid updated:', grid);
  renderGrid(grid);
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
      if (grid && grid[row][col]) {
        square.textContent = grid[row][col].type[0].toUpperCase();
        square.style.backgroundColor = getPlayerColor(grid[row][col].playerId);
      }
      square.addEventListener('click', () => placeMonster(row, col));
      board.appendChild(square);
    }
  }
}

function updatePlayers(players) {
  const playersDiv = document.getElementById('players');
  playersDiv.innerHTML = '<h3>Players:</h3>';
  players.forEach(player => {
    const playerElement = document.createElement('div');
    playerElement.textContent = player;
    playersDiv.appendChild(playerElement);
  });
}

function placeMonster(row, col) {
  const type = prompt("Enter monster type (vampire, werewolf, ghost):");
  console.log('Placing monster:', gameId, playerId, row, col, type);
  if (type === 'vampire' || type === 'werewolf' || type === 'ghost') {
    socket.emit('placeMonster', { gameId, playerId, row, col, type });
  } else {
    alert('Invalid monster type');
  }
}

function getPlayerColor(playerId) {
  // Assign a color based on playerId for visualization
  const colors = ['red', 'blue', 'green', 'purple', 'orange'];
  return colors[playerId.charCodeAt(playerId.length - 1) % colors.length];
}
