
(function(){
  const btn = document.createElement('button');
  btn.id = 'btnInventory'; btn.textContent = '🎒';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'inventoryPanel';
  panel.innerHTML = `
    <div class="modal">
      <h3>Inventário <button class="close" id="invCloseTop">✕</button></h3>
      <div id="invCoins" class="row"><strong>Moedas:</strong> <span id="coinsVal">0</span></div>
      <div class="grid" id="invGrid"></div>
      <div class="row">
        <button class="small ghost" id="invPrev">◀</button>
        <div style="flex:1;text-align:center" id="invPage">1</div>
        <button class="small ghost" id="invNext">▶</button>
        <button class="small" id="invClose">Fechar</button>
      </div>
    </div>`;
  (document.getElementById('hud') || document.body).appendChild(panel);

  function openInv(){ panel.style.display='flex'; render(); }
  function closeInv(){ panel.style.display='none'; }

  btn.addEventListener('click', openInv);
  panel.addEventListener('click', (e)=>{ if (e.target === panel) closeInv(); });
  panel.querySelector('#invClose').addEventListener('click', closeInv);
  panel.querySelector('#invCloseTop').addEventListener('click', closeInv);

  function render(){
    if (!window.me) return;
    const g = document.getElementById('invGrid'); g.innerHTML = '';
    document.getElementById('coinsVal').textContent = String(me.coins||0);
    const fruits = Object.entries(me.inventory?.fruits||{});
    const per = me.inventory?.perPage||8;
    const start = (me.inventory?.page||0)*per;
    const pageItems = fruits.slice(start, start+per);
    for (const [name, qty] of pageItems){
      const slot = document.createElement('div');
      slot.className = 'item';
      slot.innerHTML = `<div style="font-size:24px">${name}</div><div>x${qty}</div>`;
      g.appendChild(slot);
    }
    const totalPages = Math.max(1, Math.ceil(fruits.length/per)||1);
    document.getElementById('invPage').textContent = `${(me.inventory.page||0)+1}/${totalPages}`;
  }

  document.getElementById('invPrev').addEventListener('click', ()=>{
    if (!me) return;
    me.inventory.page = Math.max(0, (me.inventory.page||0)-1);
    render();
  });
  document.getElementById('invNext').addEventListener('click', ()=>{
    if (!me) return;
    const fruits = Object.keys(me.inventory?.fruits||{}).length;
    const maxPage = Math.max(0, Math.ceil(fruits/(me.inventory?.perPage||8))-1);
    me.inventory.page = Math.min(maxPage, (me.inventory.page||0)+1);
    render();
  });

  function inGame(){
    const ui = document.getElementById('ui');
    if (!ui) return !!window.me;
    const styles = window.getComputedStyle(ui);
    const visible = styles.display !== 'none' && styles.visibility !== 'hidden' && ui.offsetParent !== null;
    return !visible && !!window.me;
  }

  function tick(){
    btn.style.display = inGame() ? 'block' : 'none';
    requestAnimationFrame(tick);
  }
  tick();

  window.__plugins.add({ update(){} });
})();
