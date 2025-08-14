
(() => {
  // plugin hub (light shim, real hub loaded later)
  window.__plugins = window.__plugins || { updaters:[], drawers:[], add(o){ if(o.update) this.updaters.push(o.update); if(o.draw) this.drawers.push(o.draw); } };
  window.Game = window.Game || {}; // facade set by plugin_hub

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const ui = document.getElementById("ui");
  const nameInput = document.getElementById("name");
  const cHead = document.getElementById("cHead");
  const cShirt = document.getElementById("cShirt");
  const cPants = document.getElementById("cPants");
  const roomIdInput = document.getElementById("roomId");
  const btnCreate = document.getElementById("btnCreate");
  const btnJoin = document.getElementById("btnJoin");
  const chatBox = document.getElementById("chat");
  const chatHead = document.getElementById("chatHead");
  const messages = document.getElementById("messages");
  const msgInput = document.getElementById("msg");
  const sendBtn = document.getElementById("send");
  const roomLabel = document.getElementById("roomLabel");

  const socket = io();
  window.socket = socket; // expose for plugins (vendors/weapons)
  let me = null;
  let others = new Map();
  let worldSeed = 0;
  let roomId = null;

  function startGame(info){
    roomId = info.roomId;
    worldSeed = info.seed;
    roomLabel.textContent = "Sala: " + roomId;
    ui.style.display = "none";
    if (window.__showStick) window.__showStick(true);
    window.me = me;
    resize();
    requestAnimationFrame(loop);
  }

  function sendChat(){
    const t = msgInput.value.trim();
    if (!t) return;
    socket.emit("chat", t);
    msgInput.value = "";
  }

  sendBtn.addEventListener('click', sendChat);
  msgInput.addEventListener('keydown', (e)=> { if (e.key === 'Enter') sendChat(); });

  socket.on("chat", (m)=>{
    const div = document.createElement('div');
    div.textContent = m.text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on("roomInfo", startGame);
  socket.on("players", (arr)=>{
    others.clear();
    for (const p of arr){
      if (me && p.id === me.id) continue;
      others.set(p.id, p);
    }
  });

  socket.on("equip", ({ id, weapon })=>{
    const p = others.get(id);
    if (p) p.weapon = weapon;
  });

  btnCreate.addEventListener('click', ()=>{
    const name = nameInput.value || "player";
    me = {
      id: "local", name,
      colors: { head:cHead.value, shirt:cShirt.value, pants:cPants.value },
      x: 100, y: 100, speed: 120, dirX: 1, dirY: 0,
      inventory: { fruits: {}, page: 0, perPage: 8 },
      coins: 0, weapon: null
    };
    window.me = me;
    socket.emit("createRoom", { name, colors: me.colors });
  });
  btnJoin.addEventListener('click', ()=>{
    const name = nameInput.value || "player";
    const rid = (roomIdInput.value || "").toUpperCase();
    if (!rid) return alert("Informe o código da sala!");
    me = {
      id: "local", name,
      colors: { head:cHead.value, shirt:cShirt.value, pants:cPants.value },
      x: 100, y: 100, speed: 120, dirX: 1, dirY: 0,
      inventory: { fruits: {}, page: 0, perPage: 8 },
      coins: 0, weapon: null
    };
    window.me = me;
    socket.emit("joinRoom", { roomId: rid, name, colors: me.colors });
  });

  // world
  const rng = mulberry32(Date.now());
  const trees = [];
  function genTrees(){
    for (let i=0;i<200;i++){
      trees.push({ x: (rng()*4000-2000)|0, y: (rng()*4000-2000)|0 });
    }
  }
  genTrees();

  // loop
  let last = 0;
  function loop(ts){
    const dt = (ts-last)/1000 || 0; last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt){
    if (!me) return;
    // input
    let dx = 0, dy = 0;
    if (window.__joystick) { dx += window.__joystick.dx; dy += window.__joystick.dy; }
    const k = window.__keys || {};
    dx += (k['d']||k['arrowright']?1:0) - (k['a']||k['arrowleft']?1:0);
    dy += (k['s']||k['arrowdown']?1:0) - (k['w']||k['arrowup']?1:0);
    if (dx || dy){
      const len = Math.hypot(dx,dy); dx/=len; dy/=len;
      me.x += dx * me.speed * dt; me.y += dy * me.speed * dt;
      me.dirX = dx; me.dirY = dy;
      window.__lastMoveAngle = Math.atan2(dy, dx);
    }
    // sync
    socket.emit("move", { x: me.x, y: me.y, dirX: me.dirX, dirY: me.dirY });

    try{ if (window.Game && window.Game.useHookUpdate) window.Game.useHookUpdate(dt); }catch(e){}
  }

  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = "#0b0f12";
    ctx.fillRect(0,0,w,h);

    if (!me){ requestAnimationFrame(loop); return; }

    const camX = me.x - w/2;
    const camY = me.y - h/2;

    // grass
    for (let y= -64; y<h+64; y+=64){
      for (let x= -64; x<w+64; x+=64){
        ctx.fillStyle = "#0e3b17";
        ctx.fillRect(x, y, 64, 64);
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fillRect(x, y, 64, 1);
        ctx.fillRect(x, y, 1, 64);
      }
    }
    // trees
    ctx.fillStyle = "#18451d";
    for (const t of trees){
      const sx = (t.x - camX)|0, sy = (t.y - camY)|0;
      if (sx<-20||sy<-20||sx>w+20||sy>h+20) continue;
      ctx.fillRect(sx, sy, 16, 24);
    }

    // others
    for (const p of others.values()){
      drawDude(p, camX, camY);
    }
    // me
    drawDude(me, camX, camY);

    try{ if (window.Game && window.Game.useHookDraw) window.Game.useHookDraw(ctx); }catch(e){}
  }

  function drawDude(p, camX, camY){
    const sx = (p.x - camX)|0, sy = (p.y - camY)|0;
    ctx.save();
    // legs
    ctx.fillStyle = p.colors?.pants || "#64748b";
    ctx.fillRect(sx-10, sy-2, 20, 10);
    // torso
    ctx.fillStyle = p.colors?.shirt || "#3b82f6";
    ctx.fillRect(sx-10, sy-16, 20, 14);
    // head
    ctx.fillStyle = p.colors?.head || "#f1c27d";
    ctx.fillRect(sx-8, sy-24, 16, 8);
    ctx.restore();
  }

  // input keyboard
  window.__keys = {};
  window.addEventListener('keydown', (e)=>{ window.__keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e)=>{ window.__keys[e.key.toLowerCase()] = false; });

  // resize / DPR
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);
  resize();
})();

function mulberry32(a){ return function(){ var t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; } }
