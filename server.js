
/* MUNDOONLINE v3.7 - servidor */
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

function shortId(){ return uuidv4().slice(0, 6).toUpperCase(); }

const rooms = new Map(); // roomId -> { seed, players: Map<socketId, player>, chat: [] }

io.on("connection", (socket)=>{
  let currentRoom = null;

  socket.on("createRoom", ({ name, colors })=>{
    const roomId = shortId();
    rooms.set(roomId, { seed: Math.floor(Math.random()*2_000_000_000), players: new Map(), chat: [] });
    joinRoom(roomId, name, colors);
  });

  socket.on("joinRoom", ({ roomId, name, colors })=>{
    if (!rooms.has(roomId)) rooms.set(roomId, { seed: Math.floor(Math.random()*2_000_000_000), players: new Map(), chat: [] });
    joinRoom(roomId, name, colors);
  });

  function joinRoom(roomId, name, colors){
    if (currentRoom) leaveRoom();
    currentRoom = roomId;
    socket.join(roomId);
    const p = {
      id: socket.id,
      name, colors,
      x: (Math.random()*400)|0, y: (Math.random()*300)|0,
      dirX: 1, dirY: 0,
      weapon: null,
    };
    rooms.get(roomId).players.set(socket.id, p);
    io.to(roomId).emit("players", Array.from(rooms.get(roomId).players.values()));
    socket.emit("roomInfo", { roomId, seed: rooms.get(roomId).seed });
  }

  socket.on("move", ({ x, y, dirX, dirY })=>{
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    const p = room.players.get(socket.id);
    if (!p) return;
    p.x = x; p.y = y; p.dirX = dirX; p.dirY = dirY;
  });

  socket.on("chat", (msg)=>{
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    const entry = { id: uuidv4().slice(0,8), t: Date.now(), from: socket.id, text: msg };
    room.chat.push(entry);
    io.to(currentRoom).emit("chat", entry);
  });

  socket.on("equip", (weapon)=>{
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    const p = room.players.get(socket.id);
    if (!p) return;
    p.weapon = weapon;
    io.to(currentRoom).emit("equip", { id: socket.id, weapon });
  });

  socket.on("disconnect", ()=> leaveRoom());

  function leaveRoom(){
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room){
      room.players.delete(socket.id);
      io.to(currentRoom).emit("players", Array.from(room.players.values()));
    }
    socket.leave(currentRoom);
    currentRoom = null;
  }

  // lightweight state ping
  setInterval(()=>{
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) socket.emit("players", Array.from(room.players.values()));
  }, 200);
});

server.listen(PORT, ()=> console.log("MUNDOONLINE v3.7 running on", PORT));
