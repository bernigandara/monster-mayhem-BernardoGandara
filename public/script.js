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

socket.on('gameCreated', ({ gameId, gameName }) => {
  console.log('Game created:', gameId, gameName);
  alert(`Game "${gameName}" created with ID: ${gameId}`);
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  // Store the game ID for later use
  gameId = gameId;
  renderGrid();
});

function generatePlayerId(username) {
  return `${username}-${Math.random().toString(36).substr(2, 9)}`;
}

function renderGrid() {
  const board = document.getElementById('board');
  board.innerHTML = ''; // Clear the board
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const square = document.createElement('div');
      square.className = 'square';
      board.appendChild(square);
    }
  }
}
