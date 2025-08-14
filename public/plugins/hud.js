
// v3.5 HUD (coords, overlay canvas, chat toggle)
(function(){
  const hud = document.getElementById('hud');
  const overlay = document.createElement('canvas');
  overlay.id = 'overlayCanvas';
  hud.appendChild(overlay);
  const coords = document.createElement('div');
  coords.id = 'coords';
  coords.textContent = 'x: 0, y: 0';
  hud.appendChild(coords);

  // Toggle chat button
  const btnToggle = document.createElement('button');
  btnToggle.id = 'btnToggleChat';
  btnToggle.innerHTML = '💬<span class="badge" id="chatBadge">0</span>';
  document.body.appendChild(btnToggle);
  const chat = document.getElementById('chat');
  let chatHidden = false, unread = 0;

  btnToggle.addEventListener('click', ()=>{
    chatHidden = !chatHidden;
    chat.style.display = chatHidden ? 'none' : '';
    if (!chatHidden){ unread = 0; document.getElementById('chatBadge').style.display='none'; }
  });

  // Whenever a new message is appended to #messages, if chatHidden show badge
  const messages = document.getElementById('messages');
  const obs = new MutationObserver(()=> {
    if (chatHidden){
      unread++;
      const badge = document.getElementById('chatBadge');
      badge.textContent = String(unread);
      badge.style.display = 'inline-block';
      // Simple toast
      if (!document.getElementById('chatToast')){
        const t = document.createElement('div');
        t.id='chatToast'; t.style.position='absolute'; t.style.right='8px'; t.style.top='8px';
        t.style.background='rgba(0,0,0,.6)'; t.style.border='1px solid rgba(255,255,255,.1)';
        t.style.color='#eaeaea'; t.style.padding='8px 10px'; t.style.borderRadius='8px';
        t.style.zIndex='40'; t.textContent='Nova mensagem no chat!';
        document.body.appendChild(t);
        setTimeout(()=> t.remove(), 3000);
      }
    }
  });
  obs.observe(messages, { childList:true });

  // Resizing overlay to follow main canvas
  function resize(){
    const main = document.getElementById('canvas');
    overlay.width = main.width; overlay.height = main.height;
    overlay.style.width = main.style.width; overlay.style.height = main.style.height;
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 50);

  window.__overlayCtx = overlay.getContext('2d');

  // hooks
  window.__plugins.add({
    update(dt){
      if (window.me){
        window.Game.ensurePlayer(window.me);
        coords.textContent = `x: ${Math.round(me.x)}  y: ${Math.round(me.y)}`;
      }
    },
    draw(ctx){
      const o = window.__overlayCtx;
      if (!o) return;
      o.clearRect(0,0,overlay.width, overlay.height);
      // projectiles are drawn by weapons plugin
    }
  });
})();
