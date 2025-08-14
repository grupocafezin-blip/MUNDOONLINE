
/* Retro RPG Online V2 - Servidor */
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

function makeSeed(){ return Math.floor(Math.random()*2_000_000_000); }

/** Salas na memória
 * roomId -> {
 *   seed: number,
 *   players: Map<socketId, player>,
 *   items: Map<itemId, {id,x,y,type,taken:boolean}>,
 *   config: { treeDensity, objectScale },
 * }
*/
const rooms = new Map();

/** RNG determinístico simples (xorshift32) */
function makeRng(seed){
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function genItems(seed, count, config){
  const rng = makeRng(seed ^ 0xC0FFEE);
  const items = new Map();
  // Gera em um raio de 5000 px, preferindo cruzamentos de "rua da vila"
  for (let i=0; i<count; i++){
    // Escolhe um cruzamento de grade de vila: múltiplos de 240px
    const gx = (Math.floor(rng()*41)-20) * 240; // -4800..4800
    const gy = (Math.floor(rng()*41)-20) * 240;
    // desloca um pouquinho
    const dx = Math.floor((rng()-0.5)*40);
    const dy = Math.floor((rng()-0.5)*40);
    const x = gx + dx;
    const y = gy + dy;
    const kind = (rng()<0.5) ? "fruit" : "coin";
    const id = uuidv4().slice(0,8);
    items.set(id, { id, x, y, type: kind, taken:false });
  }
  return items;
}

io.on("connection", (socket)=>{
  socket.on("createRoom", ({ name, colors, config }) => {
    const roomId = uuidv4().slice(0,6).toUpperCase();
    const seed = makeSeed();
    const normConfig = {
      treeDensity: Math.max(0.02, Math.min(0.25, (config?.treeDensity ?? 0.10))),
      objectScale: Math.max(1.0, Math.min(2.0, (config?.objectScale ?? 1.4)))
    };
    const room = {
      seed,
      players: new Map(),
      items: genItems(seed, 220, normConfig),
      config: normConfig,
    };
    rooms.set(roomId, room);

    const spawn = { x: (Math.random()*600-300)|0, y: (Math.random()*600-300)|0 };
    const player = {
      id: socket.id,
      name: (name || "Jogador").slice(0, 16),
      colors,
      x: spawn.x, y: spawn.y,
      score: 0
    };
    room.players.set(socket.id, player);
    socket.join(roomId);
    socket.data.roomId = roomId;

    socket.emit("roomCreated", {
      roomId, seed, you: player,
      players: [...room.players.values()],
      items: [...room.items.values()],
      config: room.config
    });
    socket.to(roomId).emit("playerJoined", player);
  });

  socket.on("joinRoom", ({ roomId, name, colors }) => {
    if (!rooms.has(roomId)){
      socket.emit("errorMsg", "Sala não encontrada.");
      return;
    }
    const room = rooms.get(roomId);
    const spawn = { x: (Math.random()*600-300)|0, y: (Math.random()*600-300)|0 };
    const player = {
      id: socket.id,
      name: (name || "Jogador").slice(0, 16),
      colors,
      x: spawn.x, y: spawn.y,
      score: 0
    };
    room.players.set(socket.id, player);
    socket.join(roomId);
    socket.data.roomId = roomId;

    socket.emit("roomJoined", {
      roomId, seed: room.seed, you: player,
      players: [...room.players.values()],
      items: [...room.items.values()],
      config: room.config
    });
    socket.to(roomId).emit("playerJoined", player);
  });

  socket.on("move", ({ x, y }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;
    p.x = x; p.y = y;
    socket.to(roomId).emit("playerMoved", { id: socket.id, x, y });
  });

  socket.on("collectItem", ({ itemId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;

    const it = room.items.get(itemId);
    if (!it || it.taken) return;
    // Valida proximidade simples (cliente já checa, mas servidor confirma)
    const dx = (p.x - it.x), dy = (p.y - it.y);
    if ((dx*dx + dy*dy) <= (28*28)){
      it.taken = true;
      p.score = (p.score|0) + 1;
      io.to(roomId).emit("itemTaken", { itemId, by: p.id, score: p.score });
      if (p.score % 10 === 0){
        io.to(roomId).emit("chat", { id: p.id, name: p.name, text: `pegou ${p.score} itens!`, ts: Date.now() });
      }
    }
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
    if (room.players.size === 0){
      rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => console.log("Servidor v2 na porta " + PORT));
