
(() => {
  // v3.5 hook shims
  window.__plugins = window.__plugins || { updaters:[], drawers:[], add:(o)=>{ if(o.update)window.__plugins.updaters.push(o.update); if(o.draw)window.__plugins.drawers.push(o.draw);} };

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
  const messages = document.getElementById("messages");
  const msgInput = document.getElementById("msgInput");
  const roomPill = document.getElementById("roomPill");
  const scorePill = document.getElementById("scorePill");
  const joyContainer = document.getElementById("joystick");

  let socket = null;
  let joystick = null;
  let roomId = "";
  let seed = 0;
  let config = { treeDensity: 0.10, objectScale: 1.4 };

  // World
  const world = {
    tiles: new Map(), // "x,y" -> tile type
    tileSize: 24
  };

  // Players
  let me = null;
  const players = new Map();

  // Items (spawnam em pontos específicos como cruzamentos/plazas)
  const items = new Map(); // id -> {id,x,y,type,taken}

  // Resize
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  // Controls
  const keys = new Set();
  window.addEventListener("keydown", (e)=>{
    if (e.key === "Enter" && !chatBox.classList.contains("hide")) {
      msgInput.focus();
    }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)) keys.add(e.key.toLowerCase());
  });
  window.addEventListener("keyup", (e)=>{
    keys.delete(e.key.toLowerCase());
  });

  // Seeded RNG (xorshift32)
  function rng(seed){
    let s = seed | 0 || 1;
    return function() {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    }
  }

  // Village-like generation:
  // - Estradas em grade centradas (a cada 10 tiles ~ 240px)
  // - Casas maiores perto das estradas
  // - Árvores em "bosques" fora das estradas/casas
  // - Praças nos cruzamentos (itens aparecem mais lá)
  function tileAt(tx, ty){
    const key = tx+","+ty;
    if (world.tiles.has(key)) return world.tiles.get(key);

    const ts = world.tileSize;
    const px = tx*ts, py = ty*ts;
    const R = rng((tx*73856093) ^ (ty*19349663) ^ seed);

    // Estradas a cada 10 tiles (largura 2 tiles)
    const roadPeriod = 10;
    const onVRoad = Math.abs(tx % roadPeriod) <= 1;
    const onHRoad = Math.abs(ty % roadPeriod) <= 1;
    if (onVRoad || onHRoad){
      // praça nos cruzamentos exatos
      if (Math.abs(tx % roadPeriod) === 0 && Math.abs(ty % roadPeriod) === 0){
        world.tiles.set(key, "plaza");
        return "plaza";
      }
      world.tiles.set(key, "road");
      return "road";
    }

    // Casas perto da estrada, com probabilidade
    let t = "grass";
    const nearRoad = (Math.abs(tx % roadPeriod) <= 2) || (Math.abs(ty % roadPeriod) <= 2);
    if (nearRoad && R() < 0.08) {
      t = "house";
    } else {
      // Árvores/bosques controlados por densidade
      const treeChance = config.treeDensity; // 0.02..0.25
      if (R() < treeChance) t = "tree";
      else if (R() < 0.06) t = "bush";
    }
    world.tiles.set(key, t);
    return t;
  }

  // Rendering helpers
  function draw(){
    // Fundo (grama) + leve ciclo dia/noite
    const t = (Date.now()/1000) % 60; // 60s loop
    const sky = Math.floor(40 + 20 * Math.sin(t/60 * Math.PI*2));
    ctx.fillStyle = `rgb(${sky}, ${sky+20}, ${sky})`;
    ctx.fillRect(0,0,canvas.width, canvas.height);

    if (!me){ requestAnimationFrame(draw); return; }

    const ts = world.tileSize;
    const halfW = canvas.width/2, halfH = canvas.height/2;
    const camX = me.x, camY = me.y;
    const startTx = Math.floor((camX - halfW)/ts)-3;
    const endTx   = Math.floor((camX + halfW)/ts)+3;
    const startTy = Math.floor((camY - halfH)/ts)-3;
    const endTy   = Math.floor((camY + halfH)/ts)+3;

    // Tiles
    for (let ty=startTy; ty<=endTy; ty++){
      for (let tx=startTx; tx<=endTx; tx++){
        const t = tileAt(tx, ty);
        const x = tx*ts - camX + halfW;
        const y = ty*ts - camY + halfH;

        // Base grass
        ctx.fillStyle = ["#3b8f2e", "#34842a", "#2f7a26"][Math.abs((tx+ty))%3];
        ctx.fillRect(x, y, ts, ts);

        if (t === "road"){
          ctx.fillStyle = "#6d6d6d";
          ctx.fillRect(x, y, ts, ts);
          ctx.fillStyle = "#8a8a8a";
          ctx.fillRect(x+1, y+1, ts-2, ts-2);
        } else if (t === "plaza"){
          ctx.fillStyle = "#a28d6a";
          ctx.fillRect(x, y, ts, ts);
          ctx.fillStyle = "#b79c78";
          ctx.fillRect(x+1, y+1, ts-2, ts-2);
        } else if (t === "tree"){
          drawTree(x, y, ts);
        } else if (t === "bush"){
          drawBush(x, y, ts);
        } else if (t === "house"){
          drawHouse(x, y, ts);
        }
      }
    }

    // Items
    for (const it of items.values()){
      if (it.taken) continue;
      const ix = it.x - camX + halfW;
      const iy = it.y - camY + halfH;
      if (ix < -40 || iy < -40 || ix > canvas.width+40 || iy > canvas.height+40) continue;
      drawItem(ix, iy, it.type);
    }

    // Players
    for (const p of players.values()){
      const px = p.x - camX + halfW;
      const py = p.y - camY + halfH;
      drawDude(px, py, p);
      // nameplate
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(px-40, py-26, 80, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${p.name} (${p.score|0})`, px, py-14);
    }
    try{ if (window.Game) window.Game.useHookDraw(ctx); }catch(e){}
    requestAnimationFrame(draw);
  }

  function drawTree(x, y, ts){
    const scale = config.objectScale; // 1..2
    const w = ts*scale, h = ts*scale*1.2;
    // copa
    ctx.fillStyle = "#2c5";
    ctx.fillRect(x + ts/2 - w/2 + 4, y + ts - h + 2, w - 8, h - 12);
    // tronco
    ctx.fillStyle = "#742";
    ctx.fillRect(x + ts/2 - 4, y + ts - 12, 8, 12);
  }

  function drawBush(x, y, ts){
    const scale = config.objectScale * 0.9;
    const w = ts*scale, h = ts*scale*0.6;
    ctx.fillStyle = "#1f5";
    ctx.fillRect(x + ts/2 - w/2 + 4, y + ts - h, w - 8, h - 4);
  }

  function drawHouse(x, y, ts){
    const scale = config.objectScale * 1.4;
    const w = ts*scale, h = ts*scale;
    ctx.fillStyle = "#b55";
    ctx.fillRect(x + ts/2 - w/2, y + ts - h + 6, w, h - 6);
    ctx.fillStyle = "#822";
    ctx.fillRect(x + ts/2 - (w*0.15), y + ts - 14, w*0.3, 14);
    ctx.fillStyle = "#ddc";
    ctx.fillRect(x + ts/2 - (w*0.25), y + ts - h + 12, 12, 10);
  }

  function drawItem(x, y, type){
    if (type === "coin"){
      ctx.fillStyle = "#d4af37";
      ctx.beginPath(); ctx.arc(x, y-10, 6, 0, Math.PI*2); ctx.fill();
    } else {
      // fruit simples: maçã
      ctx.fillStyle = "#e63946";
      ctx.beginPath(); ctx.arc(x, y-10, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#2a9d8f";
      ctx.fillRect(x-1, y-19, 2, 4);
    }
  }

  function drawDude(px, py, p){
    const w = 16, h = 28;
    const headH = 10, shirtH = 9, pantsH = 9;
    ctx.fillStyle = p.colors.head;
    ctx.fillRect(px-w/2, py-h/2, w, headH);
    ctx.fillStyle = p.colors.shirt;
    ctx.fillRect(px-w/2, py-h/2+headH, w, shirtH);
    ctx.fillStyle = p.colors.pants;
    ctx.fillRect(px-w/2, py-h/2+headH+shirtH, w, pantsH);
  }

  // Collision helpers
  function isSolidTile(t){
    return t === "tree" || t === "house";
  }
  function collide(nx, ny){
    // Player bbox (12x18) pés no centro
    const halfW = 6, halfH = 9;
    const ts = world.tileSize;
    // checa tiles ao redor
    const minTx = Math.floor((nx - halfW)/ts);
    const maxTx = Math.floor((nx + halfW)/ts);
    const minTy = Math.floor((ny - halfH)/ts);
    const maxTy = Math.floor((ny + halfH)/ts);
    for (let ty=minTy; ty<=maxTy; ty++){
      for (let tx=minTx; tx<=maxTx; tx++){
        const tt = tileAt(tx, ty);
        if (isSolidTile(tt)){
          // caixa sólida do objeto ocupa quase todo tile (com margem)
          const x0 = tx*ts + 2, y0 = ty*ts + 2;
          const x1 = x0 + ts - 4, y1 = y0 + ts - 4;
          if (nx + halfW > x0 && nx - halfW < x1 && ny + halfH > y0 && ny - halfH < y1){
            return true;
          }
        }
      }
    }
    return false;
  }

  // Movement
  function update(dt){
    try{ window.Game && window.Game.ensurePlayer && window.Game.ensurePlayer(window.me); }catch(e){}

    if (!me) return;
    let vx = 0, vy = 0;
    if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
    if (keys.has("arrowright") || keys.has("d")) vx += 1;
    if (keys.has("arrowup") || keys.has("w")) vy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) vy += 1;
    if (joystick) {
      vx += joystick.value.x;
      vy += joystick.value.y;
    try{ if (window.Game) window.Game.useHookUpdate(dt); }catch(e){}
  }
    let len = Math.hypot(vx, vy);
    if (len > 0){
      vx /= len; vy /= len; window.__lastMoveAngle = Math.atan2(vy, vx);
      const speed = 120;
      // tentativa eixo-a-eixo pra deslizar nas paredes
      let nx = me.x + vx * speed * dt;
      if (!collide(nx, me.y)) me.x = nx;
      nx = me.y + vy * speed * dt;
      if (!collide(me.x, nx)) me.y = nx;
      moveThrottle.tick(me.x, me.y);
      checkPickup();
    }
  }

  function checkPickup(){
    for (const it of items.values()){
      if (it.taken) continue;
      const dx = me.x - it.x, dy = me.y - it.y;
      if ((dx*dx + dy*dy) <= (22*22)){
        socket.emit("collectItem", { itemId: it.id });
      }
    }
  }

  const moveThrottle = (()=>{
    let lastSent = 0;
    return {
      tick(x,y){
        const now = performance.now();
        if (!socket) return;
        if (now - lastSent > 50){
          socket.emit("move", { x, y });
          lastSent = now;
        }
      }
    }
  })();

  // Chat
  function addMsg({name, text}){
    const div = document.createElement("div");
    div.textContent = `${name}: ${text}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
  msgInput.addEventListener("keydown", (e)=>{
    if (e.key === "Enter"){
      const txt = msgInput.value.trim();
      if (txt && socket){
        socket.emit("chat", txt);
      }
      msgInput.value = "";
      msgInput.blur();
    }
  });

  // Socket
  function connect() {
    socket = io();

    socket.on("roomCreated", (data)=> startGame(data));
    socket.on("roomJoined", (data)=> startGame(data));

    socket.on("playerJoined", (p)=>{
      players.set(p.id, p);
      addMsg({ name: "Sistema", text: `${p.name} entrou.` });
    });
    socket.on("playerLeft", ({id})=>{
      const p = players.get(id);
      if (p) addMsg({ name: "Sistema", text: `${p.name} saiu.` });
      players.delete(id);
    });
    socket.on("playerMoved", ({id, x, y})=>{
      const p = players.get(id);
      if (p) { p.x = x; p.y = y; }
    });
    socket.on("itemTaken", ({ itemId, by, score })=>{
      const it = items.get(itemId);
      if (it) it.taken = true;
      const p = players.get(by);
      if (p){ p.score = score|0; }
      if (by === me.id){
        scorePill.textContent = `Itens: ${players.get(me.id).score|0}`;
      }
    });
    socket.on("chat", (msg)=> addMsg(msg));
    socket.on("connect_error", (e)=> alert("Erro de conexão: " + e.message));
    socket.on("errorMsg", (m)=> alert(m));
  }

  function startGame(data){
    ({ roomId, seed } = data);
    me = data.you;
    config = data.config || config;
    players.clear();
    for (const p of data.players) players.set(p.id, p);
    players.set(me.id, me);
    items.clear();
    for (const it of data.items) items.set(it.id, it);

    ui.classList.add("hide");
    chatBox.classList.remove("hide");
    roomPill.textContent = `Sala: ${roomId}`;
    roomPill.classList.remove("hide");
    scorePill.textContent = `Itens: ${players.get(me.id).score|0}`;
    scorePill.classList.remove("hide");
    joystick = new VirtualJoystick(joyContainer);
  }

  // Buttons
  btnCreate.addEventListener("click", ()=>{
    if (!socket) connect();
    const payload = {
      name: nameInput.value.trim() || "Jogador",
      colors: { head: cHead.value, shirt: cShirt.value, pants: cPants.value },
      config: {
        treeDensity: (parseInt(document.getElementById("treeDensity").value,10) / 100),
        objectScale: (parseInt(document.getElementById("objectScale").value,10) / 10),
      }
    };
    socket.emit("createRoom", payload);
  });
  btnJoin.addEventListener("click", ()=>{
    const id = roomIdInput.value.trim().toUpperCase();
    if (!id) { alert("Digite o ID da sala para entrar."); return; }
    if (!socket) connect();
    const payload = {
      roomId: id,
      name: nameInput.value.trim() || "Jogador",
      colors: { head: cHead.value, shirt: cShirt.value, pants: cPants.value }
    };
    socket.emit("joinRoom", payload);
  });

  // Main loop
  let last = performance.now();
  function loop(){
    const now = performance.now();
    const dt = Math.min(0.05, (now-last)/1000);
    last = now;
    update(dt);
    requestAnimationFrame(loop);
  }
  draw();
  loop();
})();
