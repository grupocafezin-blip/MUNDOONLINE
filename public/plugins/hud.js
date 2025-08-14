
(function(){
  const hud = document.getElementById('hud') || document.body;
  const overlay = document.createElement('canvas');
  overlay.id = 'overlayCanvas';
  hud.appendChild(overlay);
  const coords = document.createElement('div');
  coords.id = 'coords';
  coords.textContent = 'x: 0  y: 0';
  hud.appendChild(coords);

  const btnToggle = document.createElement('button');
  btnToggle.id = 'btnToggleChat';
  btnToggle.innerHTML = '💬<span class="badge" id="chatBadge">0</span>';
  document.body.appendChild(btnToggle);

  const chat = document.getElementById('chat');
  const messages = document.getElementById('messages');
  let chatHidden = false, unread = 0;

  function placeToggle(){
    if (!chat) return;
    const r = chat.getBoundingClientRect();
    btnToggle.style.left = (r.left + r.width - 40) + 'px';
    btnToggle.style.top = (r.top - 10) + 'px';
  }
  window.addEventListener('resize', placeToggle);
  setTimeout(placeToggle, 100);

  btnToggle.addEventListener('click', ()=>{
    if (!chat) return;
    chatHidden = !chatHidden;
    chat.style.display = chatHidden ? 'none' : '';
    if (!chatHidden){
      unread = 0; const b = document.getElementById('chatBadge'); if (b) b.style.display='none';
    } else {
      placeToggle();
    }
  });

  if (messages){
    const obs = new MutationObserver(()=>{
      if (chatHidden){
        unread++;
        const badge = document.getElementById('chatBadge');
        if (badge){ badge.textContent = String(unread); badge.style.display='inline-block'; }
      }
    });
    obs.observe(messages, { childList:true });
  }

  function resizeOverlay(){
    const main = document.getElementById('canvas');
    if (!main) return;
    overlay.width = main.width; overlay.height = main.height;
    overlay.style.width = main.style.width; overlay.style.height = main.style.height;
  }
  window.addEventListener('resize', resizeOverlay);
  setTimeout(resizeOverlay, 100);
  window.__overlayCtx = overlay.getContext('2d');

  window.__plugins.add({
    update(dt){
      if (window.me){
        window.Game.ensurePlayer(window.me);
        coords.textContent = `x: ${Math.round(me.x)}  y: ${Math.round(me.y)}`;
      }
    },
    draw(ctx){
      const o = window.__overlayCtx;
      if (o) o.clearRect(0,0,overlay.width, overlay.height);
    }
  });
})();
