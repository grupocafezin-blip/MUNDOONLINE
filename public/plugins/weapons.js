
// Weapons: fire button, aim arc (rotates, flips after shot), projectiles/melee
(function(){
  const fireBtn = document.createElement('button');
  fireBtn.id = 'btnFire';
  fireBtn.textContent = 'ATACAR';
  document.body.appendChild(fireBtn);

  let firing = false;
  fireBtn.addEventListener('pointerdown', ()=> { firing = true; });
  fireBtn.addEventListener('pointerup', ()=> { firing = false; });
  fireBtn.addEventListener('pointercancel', ()=> { firing = false; });
  fireBtn.addEventListener('click', (e)=> e.preventDefault());

  function showFire(show){
    fireBtn.style.display = show ? 'block' : 'none';
    // match joystick size
    const js = window.getJoystickSize ? window.getJoystickSize() : 120;
    fireBtn.style.width = js+'px';
    fireBtn.style.height = js+'px';
  }

  // aim state
  const aim = window.Game.state.aim;
  aim.angle = 0; aim.dir = 1;

  window.__plugins.add({
    update(dt){
      if (!window.me){ showFire(false); return; }
      window.Game.ensurePlayer(window.me);
      showFire(!!me.weapon);

      // rotate aim 180° in front of facing
      const base = window.__lastMoveAngle ?? 0;
      aim.angle += aim.dir * dt * Math.PI * 0.7; // speed
      // clamp to half-arc
      const half = Math.PI/2;
      if (aim.angle > half) { aim.angle = half; aim.dir *= -1; }
      if (aim.angle < -half){ aim.angle = -half; aim.dir *= -1; }

      // shooting
      if (firing && me.weapon === 'gun'){
        const now = performance.now();
        if (!window.__lastShot) window.__lastShot = 0;
        if (now - window.__lastShot > 220){
          window.__lastShot = now;
          const ang = base + aim.angle;
          const spd = 360, dmg = 6;
          window.Game.state.projectiles.push({
            x: me.x, y: me.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 1.2, dmg
          });
          aim.dir *= -1; // flip direction after shot
        }
      } else if (firing && me.weapon === 'broom'){
        const now = performance.now();
        if (!window.__lastSwing) window.__lastSwing = 0;
        if (now - window.__lastSwing > 380){
          window.__lastSwing = now;
          const ang = base + aim.angle;
          window.Game.state.projectiles.push({
            x: me.x + Math.cos(ang)*18, y: me.y + Math.sin(ang)*18,
            vx: 0, vy: 0, life: 0.12, melee:true, dmg: 20
          });
          aim.dir *= -1;
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

      // draw aim arc and weapon icon
      if (me.weapon){
        const base = window.__lastMoveAngle ?? 0;
        const ang = base + aim.angle;
        const sx = Math.floor(me.x - camX), sy = Math.floor(me.y - camY);
        o.save();
        o.translate(sx, sy);
        o.rotate(base);
        o.beginPath();
        o.arc(0, 0, 28, -Math.PI/2, Math.PI/2);
        o.strokeStyle = 'rgba(255,255,255,.6)';
        o.lineWidth = 2;
        o.stroke();
        o.restore();

        o.save();
        o.translate(sx, sy);
        o.rotate(ang);
        o.font = '20px monospace';
        o.textAlign = 'left'; o.textBaseline='middle';
        o.fillText(me.weapon === 'gun' ? '🔫' : '🧹', 12, 0);
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
        o.fillStyle = p.melee ? 'rgba(255,200,120,.85)' : 'rgba(180,220,255,.9)';
        o.fill();
      }
    }
  });

  // desktop fallback: arrow keys set lastMoveAngle
  window.addEventListener('keydown', (e)=>{
    const k = e.key.toLowerCase();
    const dx = (k==='arrowright'||k==='d') - (k==='arrowleft'||k==='a');
    const dy = (k==='arrowdown'||k==='s') - (k==='arrowup'||k==='w');
    if (dx||dy) window.__lastMoveAngle = Math.atan2(dy, dx);
  }, {passive:true});
})();
