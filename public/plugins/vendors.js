
(function(){
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
  (document.getElementById('hud') || document.body).appendChild(vendorPanel);
  function openVendor(){ vendorPanel.style.display='flex'; renderVendor(); }
  function closeVendor(){ vendorPanel.style.display='none'; }
  vendorPanel.addEventListener('click', (e)=>{ if (e.target===vendorPanel) closeVendor(); });
  vendorPanel.querySelector('#vClose').addEventListener('click', closeVendor);
  document.getElementById('buyBroom').addEventListener('click', ()=>{ if (!window.me) return; if ((me.coins||0)>=10){ me.coins-=10; me.weapon='broom'; renderVendor(); } });
  document.getElementById('buyGun').addEventListener('click', ()=>{ if (!window.me) return; if ((me.coins||0)>=20){ me.coins-=20; me.weapon='gun'; renderVendor(); } });

  function renderVendor(){
    const coinsEl = document.getElementById('vCoins'); if (coinsEl) coinsEl.textContent = String(window.me?.coins||0);
    const g = document.getElementById('vGrid'); if (!g) return; g.innerHTML='';
    const fruits = Object.entries(window.me?.inventory?.fruits||{});
    for (const [name, qty] of fruits){
      const el = document.createElement('div');
      el.className = 'item';
      const btnId = `sell_${name.codePointAt(0)}`;
      el.innerHTML = `<div style="font-size:24px">${name}</div><div>Quantidade: ${qty}</div><button class="small" id="${btnId}">Vender 1</button>`;
      g.appendChild(el);
      setTimeout(()=>{
        const b = document.getElementById(btnId);
        if (b) b.onclick = ()=>{
          const f = window.me.inventory.fruits;
          if (f[name]>0){ f[name]-=1; window.me.coins=(window.me.coins||0)+1; renderVendor(); }
        };
      }, 0);
    }
  }

  function spawnVendorsIfNeeded(){
    const arr = window.Game.state.npcs;
    if (arr.length >= 4 || !window.me) return;
    const ts = window.world?.tileSize || 32;
    for (let i=0; i<4-arr.length; i++){
      let tries = 0, placed = false;
      while(tries++ < 200 && !placed){
        const radiusTiles = 20 + Math.floor(Math.random()*40);
        const angle = Math.random()*Math.PI*2;
        const x = Math.floor((me.x + Math.cos(angle)*radiusTiles*ts));
        const y = Math.floor((me.y + Math.sin(angle)*radiusTiles*ts));
        arr.push({ x, y, tone: 0.8 + Math.random()*0.6, vx:0, vy:0, t:0 });
        placed = true;
      }
    }
  }

  window.__plugins.add({
    update(dt){
      spawnVendorsIfNeeded();
      const arr = window.Game.state.npcs;
      for (const v of arr){
        v.t -= dt;
        if (v.t <= 0){
          v.t = 0.8 + Math.random()*1.2;
          const a = Math.random()*Math.PI*2;
          const s = 22;
          v.vx = Math.cos(a)*s;
          v.vy = Math.sin(a)*s;
        }
        v.x += v.vx*dt; v.y += v.vy*dt;
        if (window.me){
          const dx = v.x - me.x, dy = v.y - me.y;
          if (Math.hypot(dx,dy) < 36 && document.getElementById('vendorPanel').style.display!=='flex'){
            openVendor();
          }
        }
      }
    },
    draw(ctx){
      const o = window.__overlayCtx; if (!o || !window.me) return;
      const camX = me.x - o.canvas.width/2;
      const camY = me.y - o.canvas.height/2;
      for (const v of window.Game.state.npcs){
        const sx = Math.floor(v.x - camX), sy = Math.floor(v.y - camY);
        o.save();
        o.translate(sx, sy);
        const tone = Math.max(0.6, Math.min(1.4, v.tone||1));
        o.fillStyle = `rgba(${Math.floor(180*tone)}, ${Math.floor(160*tone)}, ${Math.floor(130*tone)}, 1)`;
        o.fillRect(-8, -24, 16, 8);
        o.fillStyle = '#3b82f6'; o.fillRect(-10, -16, 20, 14);
        o.fillStyle = '#64748b'; o.fillRect(-10, -2, 20, 10);
        o.restore();
      }
    }
  });
})();
