
(function(){
  const fireBtn = document.createElement('button');
  fireBtn.id = 'btnFire'; fireBtn.textContent = 'FIRE';
  document.body.appendChild(fireBtn);
  let firing = false;
  function showFire(show){ fireBtn.style.display = show ? 'block' : 'none'; }
  fireBtn.addEventListener('pointerdown', ()=>{ firing = true; });
  fireBtn.addEventListener('pointerup', ()=>{ firing = false; });
  fireBtn.addEventListener('pointercancel', ()=>{ firing = false; });

  window.__plugins.add({
    update(dt){
      if (!window.me){ showFire(false); return; }
      window.Game.ensurePlayer(window.me);
      showFire(!!me.weapon);
      if (typeof window.__lastMoveAngle === 'number') window.Game.state.lastMoveAngle = window.__lastMoveAngle;

      if (me.weapon === 'gun' && firing){
        const now = performance.now();
        if (!window.__lastShot) window.__lastShot = 0;
        if (now - window.__lastShot > 200){
          window.__lastShot = now;
          const ang = window.Game.state.lastMoveAngle||0, spd = 320;
          window.Game.state.projectiles.push({ x: me.x, y: me.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 1.4 });
        }
      }
      if (me.weapon === 'broom' && firing){
        const now = performance.now();
        if (!window.__lastSwing) window.__lastSwing = 0;
        if (now - window.__lastSwing > 400){
          window.__lastSwing = now;
          const ang = window.Game.state.lastMoveAngle||0;
          window.Game.state.projectiles.push({ x: me.x + Math.cos(ang)*18, y: me.y + Math.sin(ang)*18, vx:0, vy:0, life:0.15, melee:true });
        }
      }
      const arr = window.Game.state.projectiles;
      for (let i=arr.length-1; i>=0; i--){
        const p = arr[i];
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.life <= 0) arr.splice(i,1);
      }
    },
    draw(ctx){
      if (!window.me || !window.__overlayCtx) return;
      const o = window.__overlayCtx;
      const camX = me.x - o.canvas.width/2;
      const camY = me.y - o.canvas.height/2;
      if (me.weapon){
        const ang = window.Game.state.lastMoveAngle||0;
        const sx = Math.floor(me.x - camX), sy = Math.floor(me.y - camY);
        o.save(); o.translate(sx, sy); o.rotate(ang);
        o.beginPath(); o.arc(0, 0, 26, -Math.PI/2, Math.PI/2);
        o.strokeStyle = 'rgba(255,255,255,.6)'; o.lineWidth = 2; o.stroke();
        o.font = '20px monospace'; o.textAlign='left'; o.textBaseline='middle';
        o.fillText(me.weapon==='gun'?'🔫':'🧹', 10, 0); o.restore();
      }
      for (const p of window.Game.state.projectiles){
        const sx = Math.floor(p.x - camX), sy = Math.floor(p.y - camY);
        o.beginPath();
        if (p.melee){ o.arc(sx, sy, 14, 0, Math.PI*2); } else { o.rect(sx-2, sy-2, 4, 4); }
        o.fillStyle = p.melee ? 'rgba(255,200,120,.8)' : 'rgba(180,220,255,.9)'; o.fill();
      }
    }
  });

  window.addEventListener('keydown', (e)=>{
    const k = e.key.toLowerCase();
    const dx = (k==='arrowright'||k==='d') - (k==='arrowleft'||k==='a');
    const dy = (k==='arrowdown'||k==='s') - (k==='arrowup'||k==='w');
    if (dx||dy) window.__lastMoveAngle = Math.atan2(dy, dx);
  }, {passive:true});
})();
