
const express = require('express');
const http = require('http');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Serve static
app.use(express.static(path.join(__dirname, 'public')));

// --------- Room State ---------
/**
 * rooms = {
 *   [roomId]: {
 *     players: {
 *       [socketId]: { id, name, color, ready:false, state:{} }
 *     },
 *     started: false,
 *     perPlayerLives: 3,
 *     sharedLives: 0,
 *     level: 1
 *   }
 * }
 */
const rooms = {};

function getRoom(roomId){
  if(!rooms[roomId]) {
    rooms[roomId] = {
      players: {},
      started: false,
      perPlayerLives: 3,
      sharedLives: 0,
      level: 1
    };
  }
  return rooms[roomId];
}

function roomPlayerCount(room){
  return Object.keys(room.players).length;
}

function allReady(room){
  const ids = Object.keys(room.players);
  if(ids.length < 2) return false; // need at least 2 for coop
  return ids.every(id => !!room.players[id].ready);
}

function emitRoomUpdate(roomId){
  const room = rooms[roomId];
  if(!room) return;
  const safe = {
    players: Object.fromEntries(Object.entries(room.players).map(([id,p]) => [id, { id, name:p.name, color:p.color, ready:p.ready }])),
    started: room.started,
    sharedLives: room.sharedLives,
    perPlayerLives: room.perPlayerLives,
    level: room.level
  };
  io.to(roomId).emit('roomUpdate', safe);
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('joinRoom', ({ roomId, name, color, perPlayerLives }) => {
    if(!roomId) roomId = 'public';
    const room = getRoom(roomId);
    if(Number.isInteger(perPlayerLives) && perPlayerLives > 0 && perPlayerLives <= 10){
      room.perPlayerLives = perPlayerLives;
    }
    room.players[socket.id] = {
      id: socket.id,
      name: name || 'Jogador',
      color: color || '#ffffff',
      ready: false,
      state: {}
    };
    currentRoom = roomId;
    socket.join(roomId);
    emitRoomUpdate(roomId);
  });

  socket.on('setReady', (ready) => {
    if(!currentRoom) return;
    const room = rooms[currentRoom];
    if(!room) return;
    const p = room.players[socket.id];
    if(!p) return;
    p.ready = !!ready;
    emitRoomUpdate(currentRoom);
    // Start when all ready (and at least 2)
    if(!room.started && allReady(room)){
      room.started = true;
      room.sharedLives = room.perPlayerLives * roomPlayerCount(room);
      io.to(currentRoom).emit('startGame', {
        sharedLives: room.sharedLives,
        perPlayerLives: room.perPlayerLives,
        level: room.level,
        startedAt: Date.now()
      });
      emitRoomUpdate(currentRoom);
    }
  });

  socket.on('stateUpdate', (state) => {
    if(!currentRoom) return;
    const room = rooms[currentRoom];
    if(!room) return;
    const p = room.players[socket.id];
    if(!p) return;
    p.state = state || {};
    socket.to(currentRoom).emit('playerState', { id: socket.id, state: p.state });
  });

  socket.on('scoreHit', ({ correct }) => {
    if(!currentRoom) return;
    const room = rooms[currentRoom];
    if(!room || !room.started) return;
    if(!correct){
      room.sharedLives = Math.max(0, room.sharedLives - 1);
      io.to(currentRoom).emit('sharedLivesUpdate', { sharedLives: room.sharedLives });
      if(room.sharedLives <= 0){
        io.to(currentRoom).emit('gameOverAll');
        // Reset for next round
        room.started = false;
        for(const pid of Object.keys(room.players)){
          room.players[pid].ready = false;
        }
        emitRoomUpdate(currentRoom);
      }
    }
  });

  socket.on('advanceLevel', () => {
    if(!currentRoom) return;
    const room = rooms[currentRoom];
    if(!room) return;
    room.level += 1;
    io.to(currentRoom).emit('levelUpdate', { level: room.level });
  });

  socket.on('disconnect', () => {
    if(!currentRoom) return;
    const room = rooms[currentRoom];
    if(!room) return;
    delete room.players[socket.id];
    socket.leave(currentRoom);
    if(roomPlayerCount(room) === 0){
      delete rooms[currentRoom];
    } else {
      // If players drop, keep game running; optionally could pause when <2
      emitRoomUpdate(currentRoom);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
