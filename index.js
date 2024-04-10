import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import moment from 'moment'; // Make sure to install moment with 'npm install moment'


const app = express();
const server = createServer(app);
const io = new Server(server);
const rooms = { "Everyone": { users: [] } }; // Initialize with the "Everyone" room

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.use('/static', express.static('static'));
app.use('/js', express.static('js'));

io.on('connection', (socket) => {
  // Emit the current list of rooms to the new client
  socket.emit('update room list', Object.keys(rooms));

  socket.emit('chooseName'); // Prompt the client to choose a name

  socket.on('chooseName', (userName) => {
    socket.userName = userName;
    const defaultRoom = "Everyone";
    socket.join(defaultRoom);
    socket.currentRoom = defaultRoom;
    if (!rooms[defaultRoom].users.includes(userName)) {
      rooms[defaultRoom].users.push(userName);
    }
    socket.emit('update current room', defaultRoom);
    io.to(defaultRoom).emit('updateUserList', rooms[defaultRoom].users);
    socket.to(defaultRoom).emit('chat message', `${userName} has joined the room.`);
  });

  socket.on('create room', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = { users: [] };
      // Update all clients with the new list of rooms
      io.emit('update room list', Object.keys(rooms));
    }
  });

  socket.on('join room', (roomName) => {
    if (!rooms[roomName]) {
        console.error(`Room ${roomName} does not exist.`);
        return; // Exit early if room doesn't exist
    }

    // Notify users in the previous room
    socket.to(socket.currentRoom).emit('chat message', `${socket.userName} has left the room.`);
    const index = rooms[socket.currentRoom].users.indexOf(socket.userName);
    if (index !== -1) {
        rooms[socket.currentRoom].users.splice(index, 1);
        io.to(socket.currentRoom).emit('updateUserList', rooms[socket.currentRoom].users);
    }
    socket.leave(socket.currentRoom); // Leave the current room

    // Join the new room
    socket.join(roomName);
    socket.currentRoom = roomName; // Update the socket's current room
    if (!rooms[roomName].users.includes(socket.userName)) {
        rooms[roomName].users.push(socket.userName);
    }
    socket.emit('update current room', roomName); // Update the client about its new current room
    io.to(roomName).emit('updateUserList', rooms[roomName].users); // Update user list for the new room
    socket.to(roomName).emit('chat message', `${socket.userName} has joined the room.`);
  });


  socket.on('chat message', (msg) => {
    const formattedTime = moment().format('HH:mm'); // Use moment.js to format the timestamp
    const messageWithTimestamp = `${formattedTime} - ${socket.userName}: ${msg}`;
    io.to(socket.currentRoom).emit('chat message', messageWithTimestamp);
  });

  socket.on('disconnect', () => {
    // Notify others in the room that the user has left
    socket.to(socket.currentRoom).emit('chat message', `${socket.userName} has left the room.`);
    const roomIndex = rooms[socket.currentRoom].users.indexOf(socket.userName);
    if (roomIndex !== -1) {
      rooms[socket.currentRoom].users.splice(roomIndex, 1);
      io.to(socket.currentRoom).emit('updateUserList', rooms[socket.currentRoom].users);
    }
    // Optionally, update the room list if you are removing empty rooms
    io.emit('update room list', Object.keys(rooms));
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
