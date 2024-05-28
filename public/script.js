const socket = io();
let playerId = null;
let gameId = null;
let playerEdge = null;

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

socket.on('gameCreated', ({ gameId: newGameId, gameName, edge }) => {
  console.log('Game created:', newGameId, gameName);
  alert(`Game "${gameName}" created with ID: ${newGameId}`);
  gameId = newGameId; // Correctly set the gameId
  playerEdge = edge; // Set player edge
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  document.getElementById('gameInfo').innerText = `Game ID: ${newGameId} (Use this ID to share the game with your friends!)`;
  renderGrid();
});

socket.on('gameJoined', ({ gameId: joinedGameId, players, edge }) => {
  console.log('Game joined:', joinedGameId, players);
  alert(`Joined game with ID: ${joinedGameId}`);
  gameId = joinedGameId; // Correctly set the gameId
  playerEdge = edge; // Set player edge
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
        console.log('Square clicked:', row, col);
        if (isOnPlayerEdge(row, col)) {
          placeMonster(row, col);
        } else {
          alert('You can only place monsters on your edge!');
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

function handleDragStart(event) {
  const row = event.target.dataset.row;
  const col = event.target.dataset.col;
  const type = event.target.dataset.type;
  const playerId = event.target.dataset.playerId;
  event.dataTransfer.setData('text/plain', JSON.stringify({ row, col, type, playerId }));
  console.log('Drag started:', { row, col, type, playerId });
}

function handleDragOver(event) {
  event.preventDefault();
}

function handleDrop(event) {
  event.preventDefault();
  const data = event.dataTransfer.getData('text/plain');
  const { row: oldRow, col: oldCol, type, playerId } = JSON.parse(data);
  const newRow = event.target.dataset.row;
  const newCol = event.target.dataset.col;

  console.log('Dropped:', { oldRow, oldCol, newRow, newCol, type, playerId });

  if (playerId === playerId) { // Only allow the player who owns the monster to move it
    socket.emit('moveMonster', { gameId, playerId, oldRow, oldCol, newRow, newCol, type });
  }
}

function isOnPlayerEdge(row, col) {
  if (playerEdge === 'top' && row === 0) return true;
  if (playerEdge === 'bottom' && row === 9) return true;
  // Add more edges if needed for more players
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
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'purple': '#800080',
    'orange': '#FFA500'
  };
  const colorKeys = Object.keys(colors);
  return colors[colorKeys[playerId.charCodeAt(playerId.length - 1) % colorKeys.length]];
}
