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
  if (playerId && gameName) {
    socket.emit('createGame', { playerId, gameName });
  } else {
    alert('Please register a user and enter a game name.');
  }
});

socket.on('gameCreated', ({ gameId, gameName }) => {
  alert(`Game "${gameName}" created with ID: ${gameId}`);
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
});

function generatePlayerId(username) {
  return `${username}-${Math.random().toString(36).substr(2, 9)}`;
}
