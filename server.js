
/* Simple Retro RPG Online Server - Express + Socket.IO */
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

function makeSeed() {
  return Math.floor(Math.random() * 2_000_000_000);
}

const rooms = new Map(); // roomId -> { seed, players: Map<socketId, player>, createdAt }

io.on("connection", (socket) => {
  // Join or create a room
  socket.on("createRoom", ({ name, colors }) => {
    let roomId = uuidv4().slice(0, 6).toUpperCase();
    const seed = makeSeed();
    const room = { seed, players: new Map(), createdAt: Date.now() };
    rooms.set(roomId, room);

    // Spawn position
    const spawn = { x: (Math.random()*2000-1000)|0, y: (Math.random()*2000-1000)|0 };
    const player = {
      id: socket.id,
      name: (name || "Jogador").slice(0, 16),
      colors,
      x: spawn.x, y: spawn.y,
      lastSeen: Date.now()
    };
    room.players.set(socket.id, player);
    socket.join(roomId);
    socket.data.roomId = roomId;

    // Ack
    socket.emit("roomCreated", { roomId, seed, you: player, players: [...room.players.values()] });
    socket.to(roomId).emit("playerJoined", player);
  });

  socket.on("joinRoom", ({ roomId, name, colors }) => {
    if (!rooms.has(roomId)) {
      socket.emit("errorMsg", "Sala não encontrada.");
      return;
    }
    const room = rooms.get(roomId);

    const spawn = { x: (Math.random()*2000-1000)|0, y: (Math.random()*2000-1000)|0 };
    const player = {
      id: socket.id,
      name: (name || "Jogador").slice(0, 16),
      colors,
      x: spawn.x, y: spawn.y,
      lastSeen: Date.now()
    };
    room.players.set(socket.id, player);
    socket.join(roomId);
    socket.data.roomId = roomId;

    socket.emit("roomJoined", { roomId, seed: room.seed, you: player, players: [...room.players.values()] });
    socket.to(roomId).emit("playerJoined", player);
  });

  socket.on("move", ({ x, y }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;
    p.x = x;
    p.y = y;
    p.lastSeen = Date.now();
    socket.to(roomId).emit("playerMoved", { id: socket.id, x, y });
  });

  socket.on("chat", (msg) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;
    const safe = String(msg || "").substring(0, 200);
    io.to(roomId).emit("chat", { id: p.id, name: p.name, text: safe, ts: Date.now() });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.players.delete(socket.id);
    socket.to(roomId).emit("playerLeft", { id: socket.id });
    // Cleanup empty rooms
    if (room.players.size === 0) {
      rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
