
(() => {
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
  const joyContainer = document.getElementById("joystick");

  let socket = null;
  let joystick = null;
  let roomId = "";
  let seed = 0;

  // World
  const world = {
    tiles: new Map(), // "x,y" -> tile type
    size: 100, // half-size in tiles for generation radius
    tileSize: 24
  };

  // Players
  let me = null; // {id, name, colors, x,y}
  const players = new Map(); // id -> player

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
  function tileAt(tx, ty){
    const key = tx+","+ty;
    if (world.tiles.has(key)) return world.tiles.get(key);
    // Generate on the fly
    const r = rng((tx*73856093) ^ (ty*19349663) ^ seed);
    const roll = r();
    let t = "grass";
    if (roll < 0.06) t = "tree";
    else if (roll < 0.09) t = "bush";
    else if (roll < 0.095) t = "house";
    world.tiles.set(key, t);
    return t;
  }

  // Rendering
  function draw() {
    ctx.fillStyle = "#2d3";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    if (!me) {
      requestAnimationFrame(draw);
      return;
    }
    const ts = world.tileSize;
    const halfW = canvas.width/2, halfH = canvas.height/2;
    const camX = me.x, camY = me.y;
    const startTx = Math.floor((camX - halfW)/ts)-2;
    const endTx   = Math.floor((camX + halfW)/ts)+2;
    const startTy = Math.floor((camY - halfH)/ts)-2;
    const endTy   = Math.floor((camY + halfH)/ts)+2;

    // Draw tiles
    for (let ty=startTy; ty<=endTy; ty++){
      for (let tx=startTx; tx<=endTx; tx++){
        const t = tileAt(tx, ty);
        const x = tx*ts - camX + halfW;
        const y = ty*ts - camY + halfH;

        // Base grass
        ctx.fillStyle = ["#3b8f2e", "#34842a", "#2f7a26"][Math.abs((tx+ty))%3];
        ctx.fillRect(x, y, ts, ts);

        if (t === "tree"){
          ctx.fillStyle = "#2c5";
          ctx.fillRect(x+6, y+2, ts-12, ts-8);
          ctx.fillStyle = "#742";
          ctx.fillRect(x+ts/2-2, y+ts-10, 4, 10);
        } else if (t === "bush"){
          ctx.fillStyle = "#1f5";
          ctx.fillRect(x+4, y+8, ts-8, ts-10);
        } else if (t === "house"){
          ctx.fillStyle = "#b55";
          ctx.fillRect(x+2, y+6, ts-4, ts-6);
          ctx.fillStyle = "#822";
          ctx.fillRect(x+8, y+ts-10, ts-16, 8);
          ctx.fillStyle = "#ddc";
          ctx.fillRect(x+6, y+10, 6, 6);
        }
      }
    }

    // Draw players
    for (const p of players.values()){
      const px = p.x - camX + halfW;
      const py = p.y - camY + halfH;
      drawDude(px, py, p);
      // names
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(px-36, py-24, 72, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.name, px, py-12);
    }

    requestAnimationFrame(draw);
  }

  function drawDude(px, py, p){
    // Simple rectangle dude split into 3 parts (head, shirt, pants)
    // size 16x28
    const w = 16, h = 28;
    const headH = 10, shirtH = 9, pantsH = 9;
    ctx.fillStyle = p.colors.head;
    ctx.fillRect(px-w/2, py-h/2, w, headH);
    ctx.fillStyle = p.colors.shirt;
    ctx.fillRect(px-w/2, py-h/2+headH, w, shirtH);
    ctx.fillStyle = p.colors.pants;
    ctx.fillRect(px-w/2, py-h/2+headH+shirtH, w, pantsH);
  }

  // Movement
  function update(dt){
    if (!me) return;
    let vx = 0, vy = 0;

    // keyboard
    if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
    if (keys.has("arrowright") || keys.has("d")) vx += 1;
    if (keys.has("arrowup") || keys.has("w")) vy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) vy += 1;

    // joystick
    if (joystick) {
      vx += joystick.value.x;
      vy += joystick.value.y;
    }

    const len = Math.hypot(vx, vy);
    if (len > 0){
      vx /= len; vy /= len;
      const speed = 120; // px/s
      me.x += vx * speed * dt;
      me.y += vy * speed * dt;
      // Send move throttled
      moveThrottle.tick(me.x, me.y);
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
      // blur when sending on mobile
      msgInput.blur();
    }
  });

  // Socket helpers
  function connect() {
    socket = io();

    socket.on("roomCreated", (data)=>{
      startGame(data);
    });
    socket.on("roomJoined", (data)=>{
      startGame(data);
    });
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
    socket.on("chat", (msg)=>{
      addMsg(msg);
    });
    socket.on("connect_error", (e)=> alert("Erro de conexão: " + e.message));
    socket.on("errorMsg", (m)=> alert(m));
  }

  function startGame(data){
    ({ roomId, seed } = data);
    me = data.you;
    players.clear();
    for (const p of data.players) players.set(p.id, p);
    players.set(me.id, me);
    ui.classList.add("hide");
    chatBox.classList.remove("hide");
    roomPill.textContent = `Sala: ${roomId}`;
    roomPill.classList.remove("hide");
    // joystick
    joystick = new VirtualJoystick(joyContainer);
  }

  // Buttons
  btnCreate.addEventListener("click", ()=>{
    if (!socket) connect();
    const payload = {
      name: nameInput.value.trim() || "Jogador",
      colors: { head: cHead.value, shirt: cShirt.value, pants: cPants.value }
    };
    socket.emit("createRoom", payload);
  });
  btnJoin.addEventListener("click", ()=>{
    const id = roomIdInput.value.trim().toUpperCase();
    if (!id) {
      alert("Digite o ID da sala para entrar.");
      return;
    }
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
