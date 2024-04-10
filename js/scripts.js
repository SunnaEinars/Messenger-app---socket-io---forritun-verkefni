const socket = io();

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

// Emit a "join" event with the username
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

socket.on('chooseName', () => {
    let userName = prompt('Pick a user name')
    socket.emit('chooseName', userName); // Send the chosen name back to the server
    socket.emit('join', {userName});
});

// Update current room display
function updateCurrentRoom(roomName) {
    const currentRoomDisplay = document.querySelector('.current-room');
    currentRoomDisplay.textContent = `Current Room: ${roomName}`;
}

// Listening for updates to the user list
socket.on('updateUserList', userList => {
    const sidebar = document.querySelector('.current-users');
    sidebar.innerHTML = userList.map(user => `<li>${user}</li>`).join('');
});

// Listen for available rooms update
socket.on('update room list', (rooms) => {
    const roomList = document.querySelector('.available-rooms');
    roomList.innerHTML = ''; // Clear existing rooms
    rooms.forEach(roomName => {
        const listItem = document.createElement('li');
        const roomButton = document.createElement('button');
        roomButton.textContent = roomName;
        roomButton.classList.add('room-name');
        roomButton.onclick = function() { // Attach event listener for each room
            socket.emit('join room', roomName);
        };
        listItem.appendChild(roomButton);
        roomList.appendChild(listItem);
    });
});


// Listen for room creation
document.getElementById('createRoom').addEventListener('click', function() {
    const roomName = document.getElementById('newRoomName').value;
    if (roomName) {
        socket.emit('create room', roomName);
        document.getElementById('newRoomName').value = ''; // Clear the input after sending
    }
});

// Listen for an event to update the current room
socket.on('update current room', (roomName) => {
    updateCurrentRoom(roomName); // This function should update the UI
});

function updateCurrentRoom(roomName) {
    const currentRoomDisplay = document.querySelector('.current-room');
    if (currentRoomDisplay) {
        currentRoomDisplay.textContent = `Current Room: ${roomName}`;
    } else {
        console.error('Current room display element not found');
    }
}

socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg; // msg now includes the timestamp
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});
