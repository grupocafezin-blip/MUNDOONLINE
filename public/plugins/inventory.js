
// v3.5 Inventory with pagination
(function(){
  const hud = document.getElementById('hud');

  const btn = document.createElement('button');
  btn.id = 'btnInventory';
  btn.textContent = '🎒';
  document.body.appendChild(btn);
  btn.style.display='none';
  const ui = document.getElementById('ui');
  const showCheck = ()=> { btn.style.display = (ui && ui.classList.contains('hide')) ? 'block' : 'none'; };
  const uiObs = new MutationObserver(showCheck); if (ui) uiObs.observe(ui, { attributes:true, attributeFilter:['class'] });
  setInterval(showCheck, 500);

  const panel = document.createElement('div');
  panel.id = 'inventoryPanel';
  panel.innerHTML = `
    <div class="modal">
      <h3 style='display:flex;justify-content:space-between;align-items:center'>Inventário <button class="small ghost" id="invCloseX">✕</button></h3>
      <div id="invCoins" class="row"><strong>Moedas:</strong> <span id="coinsVal">0</span></div>
      <div class="grid" id="invGrid"></div>
      <div class="row">
        <button class="small ghost" id="invPrev">◀</button>
        <div style="flex:1;text-align:center" id="invPage">1</div>
        <button class="small ghost" id="invNext">▶</button>
        <button class="small" id="invClose">Fechar</button>
      </div>
    </div>`;
  hud.appendChild(panel);

  function openInv(){
    panel.style.display = 'flex';
    render();
  }
  function closeInv(){ panel.style.display='none'; }

  btn.addEventListener('click', openInv);
  panel.querySelector('#invClose').addEventListener('click', closeInv);
  panel.querySelector('#invCloseX').addEventListener('click', closeInv);
  panel.addEventListener('click', (e)=> { if (e.target === panel) closeInv(); });

  function render(){
    if (!window.me) return;
    const g = document.getElementById('invGrid');
    g.innerHTML = '';
    document.getElementById('coinsVal').textContent = String(me.coins||0);
    const fruits = Object.entries(me.inventory.fruits||{});
    const per = me.inventory.perPage||8;
    const start = (me.inventory.page||0)*per;
    const pageItems = fruits.slice(start, start+per);
    for (const [name, qty] of pageItems){
      const slot = document.createElement('div');
      slot.className = 'item';
      slot.innerHTML = `<div style="font-size:24px">${name}</div><div>x${qty}</div>`;
      g.appendChild(slot);
    }
    document.getElementById('invPage').textContent = `${(me.inventory.page||0)+1}/${Math.max(1, Math.ceil(fruits.length/per)||1)}`;
  }

  document.getElementById('invPrev').addEventListener('click', ()=> {
    if (!me) return;
    me.inventory.page = Math.max(0, (me.inventory.page||0)-1);
    render();
  });
  document.getElementById('invNext').addEventListener('click', ()=> {
    if (!me) return;
    const fruits = Object.keys(me.inventory.fruits||{}).length;
    const maxPage = Math.max(0, Math.ceil(fruits/(me.inventory.perPage||8))-1);
    me.inventory.page = Math.min(maxPage, (me.inventory.page||0)+1);
    render();
  });

  window.__plugins.add({
    update(){ /* no-op */ }
  });

  // Public helper to add fruit (e.g., '🍎', '🍌', etc.)
  window.Inventory = {
    addFruit: (emoji, n=1)=> { window.Game.addFruit(emoji, n); }
  };
})();
