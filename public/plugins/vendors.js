
// Vendors (NPCs) with random spawn and simple wander + shop UI
(function(){
  const hud = document.getElementById('hud');
  const panel = document.createElement('div');
  panel.id = 'vendorPanel';
  panel.innerHTML = `
    <div class="modal">
      <header>
        <h3>Vendedor</h3>
        <button id="vCloseX" class="small ghost">✕</button>
      </header>
      <div class="row"><div>Troque frutas por moedas (1 fruta = 1 moeda)</div><div><strong>Moedas:</strong> <span id="vCoins">0</span></div></div>
      <div class="grid" id="vGrid"></div>
      <div class="row">
        <button class="small" id="buyBroom">Comprar 🧹 (10)</button>
        <button class="small" id="buyGun">Comprar 🔫 (20)</button>
        <button class="small ghost" id="vClose">Fechar</button>
      </div>
    </div>`;
  hud.appendChild(panel);

  function openVendor(){
    panel.style.display='flex';
    renderVendor();
  }
  function closeVendor(){ panel.style.display='none'; }
  panel.addEventListener('click', (e)=> { if (e.target===panel) closeVendor(); });
  panel.querySelector('#vClose').addEventListener('click', closeVendor);
  panel.querySelector('#vCloseX').addEventListener('click', closeVendor);

  function renderVendor(){
    document.getElementById('vCoins').textContent = String(window.me?.coins||0);
    const g = document.getElementById('vGrid');
    g.innerHTML = '';
    const fruits = Object.entries(window.me?.inventory?.fruits||{});
    for (const [name, qty] of fruits){
      const el = document.createElement('div');
      el.className = 'item';
      const btnId = `sell_${name.codePointAt(0)}`;
      el.innerHTML = `<div style="font-size:24px">${name}</div>
                      <div>Quantidade: ${qty}</div>
                      <button class="small" id="${btnId}">Vender 1</button>`;
      g.appendChild(el);
      setTimeout(()=>{
        const b = document.getElementById(btnId);
        if (b) b.onclick = ()=> {
          const f = window.me.inventory.fruits;
          if (f[name] > 0){
            f[name] -= 1;
            window.Game.addCoins(1);
            renderVendor();
          }
        };
      },0);
    }
  }

  document.getElementById('buyBroom').addEventListener('click', ()=>{
    if (!window.me) return;
    if ((me.coins||0) >= 10){ me.coins-=10; me.weapon='broom'; renderVendor(); if (window.socket) window.socket.emit?.('equip','broom'); }
  });
  document.getElementById('buyGun').addEventListener('click', ()=>{
    if (!window.me) return;
    if ((me.coins||0) >= 20){ me.coins-=20; me.weapon='gun'; renderVendor(); if (window.socket) window.socket.emit?.('equip','gun'); }
  });

  // random vendors spawn around the player
  const vendors = [];
  function spawnVendors(){
    vendors.length = 0;
    if (!window.me) return;
    const n = 3;
    for (let i=0;i<n;i++){
      const dist = 300 + Math.random()*500;
      const ang = Math.random()*Math.PI*2;
      const x = me.x + Math.cos(ang)*dist;
      const y = me.y + Math.sin(ang)*dist;
      vendors.push({ x, y, tone: 0.8 + Math.random()*0.6, t:0, dir: Math.random()*Math.PI*2 });
    }
  }
  setInterval(()=> { if (window.me) spawnVendors(); }, 8000);

  window.__plugins.add({
    update(dt){
      if (!window.me) return;
      // wander
      for (const v of vendors){
        v.t += dt;
        if (v.t > 1.2){
          v.t = 0;
          v.dir += (Math.random()-0.5)*1.2;
        }
        v.x += Math.cos(v.dir) * 10 * dt;
        v.y += Math.sin(v.dir) * 10 * dt;
        // proximity
        const dx = v.x - me.x, dy = v.y - me.y;
        v.dist = Math.hypot(dx, dy);
      }
      const near = vendors.find(v => v.dist < 36);
      if (near && panel.style.display!=='flex'){
        openVendor();
      }
    },
    draw(ctx){
      const o = window.__overlayCtx;
      if (!o || !window.me) return;
      const camX = me.x - o.canvas.width/2;
      const camY = me.y - o.canvas.height/2;
      for (const v of vendors){
        const sx = Math.floor(v.x - camX), sy = Math.floor(v.y - camY);
        o.save();
        o.translate(sx, sy);
        const tone = Math.max(0.6, Math.min(1.4, v.tone||1));
        o.fillStyle = `rgba(${Math.floor(180*tone)}, ${Math.floor(160*tone)}, ${Math.floor(130*tone)}, 1)`;
        o.fillRect(-8, -24, 16, 8); // head
        o.fillStyle = '#3b82f6'; o.fillRect(-10, -16, 20, 14); // torso
        o.fillStyle = '#64748b'; o.fillRect(-10, -2, 20, 10); // legs
        o.restore();
      }
    }
  });
})();
