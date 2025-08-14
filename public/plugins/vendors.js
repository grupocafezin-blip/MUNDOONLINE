
// v3.5 Vendors and trading (NPCs)
(function(){
  const hud = document.getElementById('hud');
  const vendorPanel = document.createElement('div');
  vendorPanel.id = 'vendorPanel';
  vendorPanel.innerHTML = `
    <div class="modal">
      <h3>Vendedor</h3>
      <div class="row"><div>Troque frutas por moedas (1 fruta = 1 moeda)</div><div><strong>Moedas:</strong> <span id="vCoins">0</span></div></div>
      <div class="grid" id="vGrid"></div>
      <div class="row">
        <button class="small" id="buyBroom">Comprar 🧹 (10)</button>
        <button class="small" id="buyGun">Comprar 🔫 (20)</button>
        <button class="small ghost" id="vClose">Fechar</button>
      </div>
    </div>`;
  hud.appendChild(vendorPanel);

  const vendors = [
    { x: 256, y: 256, tone: 0.8 },
    { x: 640, y: 480, tone: 1.0 },
    { x: 1024, y: 320, tone: 1.2 }
  ];

  function openVendor(){
    vendorPanel.style.display='flex';
    renderVendor();
  }
  function closeVendor(){ vendorPanel.style.display='none'; }
  vendorPanel.addEventListener('click', (e)=> { if (e.target===vendorPanel) closeVendor(); });
  vendorPanel.querySelector('#vClose').addEventListener('click', closeVendor);

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
    if ((me.coins||0) >= 10){ me.coins-=10; me.weapon='broom'; renderVendor(); }
  });
  document.getElementById('buyGun').addEventListener('click', ()=>{
    if (!window.me) return;
    if ((me.coins||0) >= 20){ me.coins-=20; me.weapon='gun'; renderVendor(); }
  });

  // draw vendors and check proximity
  window.__plugins.add({
    update(dt){
      if (!window.me) return;
      for (const v of vendors){
        const dx = v.x - me.x, dy = v.y - me.y;
        v.dist = Math.hypot(dx, dy);
      }
      // auto-open vendor if very near
      const near = vendors.find(v => v.dist < 36);
      if (near && vendorPanel.style.display!=='flex'){
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
        // draw simple 3-part rectangle: head/torso/legs
        o.save();
        o.translate(sx, sy);
        const tone = Math.max(0.6, Math.min(1.4, v.tone||1));
        o.fillStyle = `rgba(${Math.floor(180*tone)}, ${Math.floor(160*tone)}, ${Math.floor(130*tone)}, 1)`;
        o.fillRect(-8, -24, 16, 8); // head
        o.fillStyle = '#3b82f6'; o.fillRect(-10, -16, 20, 14); // torso (same clothes)
        o.fillStyle = '#64748b'; o.fillRect(-10, -2, 20, 10); // legs
        o.restore();
      }
    }
  });
})();
