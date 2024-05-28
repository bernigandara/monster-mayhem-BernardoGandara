const socket = io();

socket.on('connect', () => {
    document.getElementById('status').innerText = 'Connected to server';
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    document.getElementById('status').innerText = 'Disconnected from server';
    console.log('Disconnected from server');
});
