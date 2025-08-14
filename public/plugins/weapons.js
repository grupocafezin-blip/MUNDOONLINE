
// v3.5 Weapons (broom melee, gun with aiming arc + fire button)
(function(){
  // Fire button
  const fireBtn = document.createElement('button');
  fireBtn.id = 'btnFire'; fireBtn.textContent = '⚔️';
  document.body.appendChild(fireBtn);

  let firing = false;
  fireBtn.addEventListener('pointerdown', ()=> { firing = true; });
  fireBtn.addEventListener('pointerup', ()=> { firing = false; });
  fireBtn.addEventListener('pointercancel', ()=> { firing = false; });
  fireBtn.addEventListener('click', (e)=> e.preventDefault());

  function showFire(show){
    fireBtn.style.display = show ? 'block' : 'none';
  }

  window.__plugins.add({
    update(dt){
      if (!window.me) { showFire(false); return; }
      window.Game.ensurePlayer(window.me);
      showFire(!!me.weapon);
      if (window.Game.state.sweep){ window.Game.state.sweep.t -= dt; if (window.Game.state.sweep.t<=0) window.Game.state.sweep=null; }
      // determine facing from movement keys or joystick
      const a = window.__lastMoveAngle;
      if (typeof a === 'number') window.Game.state.lastMoveAngle = a;

      // shooting
      if (me.weapon === 'gun' && firing){
        // throttle fire rate
        const now = performance.now();
        if (!window.__lastShot) window.__lastShot = 0;
        if (now - window.__lastShot > 200){
          window.__lastShot = now; window.Game.state.aimDir = -(window.Game.state.aimDir||1);
          window.Game.state.aimPhase = (window.Game.state.aimPhase||0) + dt*1.5*(window.Game.state.aimDir||1);
          // clamp between -90..+90
          if (window.Game.state.aimPhase > Math.PI/2) window.Game.state.aimPhase = Math.PI/2;
          if (window.Game.state.aimPhase < -Math.PI/2) window.Game.state.aimPhase = -Math.PI/2;
          const base = window.Game.state.lastMoveAngle || 0;
          const ang = base + window.Game.state.aimPhase;
          const spd = 320;
          window.Game.state.projectiles.push({
            x: me.x, y: me.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 1.5
          });
        }
      }
      if (me.weapon === 'broom' && firing){
        // melee swing could be represented as short-lived arc
        const now = performance.now();
        if (!window.__lastSwing) window.__lastSwing = 0;
        if (now - window.__lastSwing > 400){
          window.__lastSwing = now;
          // create a short effect projectile with very small life
          window.Game.state.aimPhase = (window.Game.state.aimPhase||0) + dt*1.5*(window.Game.state.aimDir||1);
          // clamp between -90..+90
          if (window.Game.state.aimPhase > Math.PI/2) window.Game.state.aimPhase = Math.PI/2;
          if (window.Game.state.aimPhase < -Math.PI/2) window.Game.state.aimPhase = -Math.PI/2;
          const base = window.Game.state.lastMoveAngle || 0;
          const ang = base + window.Game.state.aimPhase;
          window.Game.state.projectiles.push({
            x: me.x + Math.cos(ang)*18, y: me.y + Math.sin(ang)*18,
            vx: 0, vy: 0, life: 0.15, melee:true
          });
        }
      }
      // update projectiles
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

      // draw rotating weapon 180° in front of facing
      if (me.weapon){
        window.Game.state.aimPhase = (window.Game.state.aimPhase||0) + dt*1.5*(window.Game.state.aimDir||1);
          // clamp between -90..+90
          if (window.Game.state.aimPhase > Math.PI/2) window.Game.state.aimPhase = Math.PI/2;
          if (window.Game.state.aimPhase < -Math.PI/2) window.Game.state.aimPhase = -Math.PI/2;
          const base = window.Game.state.lastMoveAngle || 0;
          const ang = base + window.Game.state.aimPhase;
        const sx = Math.floor(me.x - camX), sy = Math.floor(me.y - camY);
        o.save();
        o.translate(sx, sy);
        o.rotate(ang);
        // draw half-arc "reticle"
        o.beginPath();
        o.arc(0, 0, 26, -Math.PI/2, Math.PI/2);
        o.strokeStyle = 'rgba(255,255,255,.6)';
        o.lineWidth = 2;
        o.stroke();

        // draw weapon icon
        o.font = '20px monospace';
        o.textAlign = 'left'; o.textBaseline='middle';
        const icon = me.weapon === 'gun' ? '🔫' : '🧹';
        o.fillText(icon, 10, 0);
                // draw broom sweep if active
        if (window.Game.state.sweep){
          o.beginPath(); o.arc(0,0,28, -Math.PI/2, Math.PI/2); o.strokeStyle='rgba(255,255,255,.4)'; o.stroke();
        }
        o.restore();
      }

      // draw projectiles
      for (const p of window.Game.state.projectiles){
        const sx = Math.floor(p.x - camX), sy = Math.floor(p.y - camY);
        o.beginPath();
        if (p.melee){
          o.arc(sx, sy, 14, 0, Math.PI*2);
        } else {
          o.rect(sx-2, sy-2, 4, 4);
        }
        o.fillStyle = p.melee ? 'rgba(255,200,120,.8)' : 'rgba(180,220,255,.9)';
        o.fill();
      }
    }
  });

  // Track last movement angle from keyboard/joystick by observing me velocity approximations
  // We monkey-patch keys set if available via window.keys in client.js
  window.addEventListener('keydown', (e)=>{
    const k = e.key.toLowerCase();
    const dx = (k==='arrowright'||k==='d') - (k==='arrowleft'||k==='a');
    const dy = (k==='arrowdown'||k==='s') - (k==='arrowup'||k==='w');
    if (dx||dy) window.__lastMoveAngle = Math.atan2(dy, dx);
  }, {passive:true});
})();
