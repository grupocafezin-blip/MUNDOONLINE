
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

  const vendors = []; let vendorsReady=false;

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
          if (f[name] > 0){ window.socket && window.socket.emit('sellFruit', { emoji: name, count: 1 }); setTimeout(renderVendor,100); }
        };
      },0);
    }
  }

  document.getElementById('buyBroom').addEventListener('click', ()=>{ if (!window.me) return; if (window.socket) window.socket.emit('buyWeapon', { weapon:'broom' }); setTimeout(renderVendor,100); });
  document.getElementById('buyGun').addEventListener('click', ()=>{ if (!window.me) return; if (window.socket) window.socket.emit('buyWeapon', { weapon:'gun' }); setTimeout(renderVendor,100); });

  // draw vendors and check proximity
  window.__plugins.add({
    update(dt){
      if (!window.me) return;

      if (!vendorsReady && window.me){
        vendorsReady = true;
        vendors._spawnAttempts = vendors._spawnAttempts||0;
        vendors._spawnAttempts++;
        vendorsReady = true;
        // spawn 5 vendors around player within 20..60 tiles
        const ts = (window.world && window.world.tileSize) || 24;
        const count = 5;
        function tileAt(tx, ty){ try{ return window.tileAt ? window.tileAt(tx,ty) : (window.__tileAtProxy && window.__tileAtProxy(tx,ty)); }catch(e){ return 'grass'; } }
        for (let i=0;i<count;i++){
          // spawn attempt

          let tries=0, v=null;
          while(tries++<50 && !v){
            const distT = 20 + Math.floor(Math.random()*40);
            const ang = Math.random()*Math.PI*2;
            const tx = Math.floor(me.x/ts + Math.cos(ang)*distT);
            const ty = Math.floor(me.y/ts + Math.sin(ang)*distT);
            const t = (window.tileAt ? window.tileAt(tx,ty) : null) || 'grass';
            if (t!=='house' && t!=='tree' && t!=='bush'){
              v = { x: tx*ts + ts/2, y: ty*ts + ts/2, tone: 0.8+Math.random()*0.6, _cool: 0, _tx:0, _ty:0 };
              vendors.push(v);
            }
          }
        }
        if (vendors.length === 0 && (vendors._spawnAttempts||0) < 6){
          // retry next frame
          vendorsReady = false;
        }
      }
      // simple random walk
      for (const v of vendors){
        v._cool -= dt;
        if (v._cool <= 0){
          v._cool = 1.5 + Math.random()*2.0;
          const ang = (Math.random()-0.5)*Math.PI*2;
          v._tx = Math.cos(ang)*20; v._ty = Math.sin(ang)*20;
        }
        v.x += v._tx*dt*10; v.y += v._ty*dt*10;
      }

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

      if (!vendorsReady && window.me){
        vendorsReady = true;
        vendors._spawnAttempts = vendors._spawnAttempts||0;
        vendors._spawnAttempts++;
        vendorsReady = true;
        // spawn 5 vendors around player within 20..60 tiles
        const ts = (window.world && window.world.tileSize) || 24;
        const count = 5;
        function tileAt(tx, ty){ try{ return window.tileAt ? window.tileAt(tx,ty) : (window.__tileAtProxy && window.__tileAtProxy(tx,ty)); }catch(e){ return 'grass'; } }
        for (let i=0;i<count;i++){
          // spawn attempt

          let tries=0, v=null;
          while(tries++<50 && !v){
            const distT = 20 + Math.floor(Math.random()*40);
            const ang = Math.random()*Math.PI*2;
            const tx = Math.floor(me.x/ts + Math.cos(ang)*distT);
            const ty = Math.floor(me.y/ts + Math.sin(ang)*distT);
            const t = (window.tileAt ? window.tileAt(tx,ty) : null) || 'grass';
            if (t!=='house' && t!=='tree' && t!=='bush'){
              v = { x: tx*ts + ts/2, y: ty*ts + ts/2, tone: 0.8+Math.random()*0.6, _cool: 0, _tx:0, _ty:0 };
              vendors.push(v);
            }
          }
        }
        if (vendors.length === 0 && (vendors._spawnAttempts||0) < 6){
          // retry next frame
          vendorsReady = false;
        }
      }
      // simple random walk
      for (const v of vendors){
        v._cool -= dt;
        if (v._cool <= 0){
          v._cool = 1.5 + Math.random()*2.0;
          const ang = (Math.random()-0.5)*Math.PI*2;
          v._tx = Math.cos(ang)*20; v._ty = Math.sin(ang)*20;
        }
        v.x += v._tx*dt*10; v.y += v._ty*dt*10;
      }

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
