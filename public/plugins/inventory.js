
// Inventory UI
(function(){
  const hud = document.getElementById('hud');

  const btn = document.createElement('button');
  btn.id = 'btnInventory';
  btn.textContent = '🎒';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'inventoryPanel';
  panel.innerHTML = `
    <div class="modal">
      <header>
        <h3>Inventário</h3>
        <button id="invCloseX" class="small ghost">✕</button>
      </header>
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
    if (pageItems.length === 0){
      const slot = document.createElement('div');
      slot.className = 'item';
      slot.textContent = 'Nenhum item...';
      slot.style.opacity = '.6';
      slot.style.gridColumn = '1 / -1';
      g.appendChild(slot);
    } else {
      for (const [name, qty] of pageItems){
        const slot = document.createElement('div');
        slot.className = 'item';
        slot.innerHTML = `<div style="font-size:24px">${name}</div><div>x${qty}</div>`;
        g.appendChild(slot);
      }
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

  // only show inventory button after leaving the menu
  const ui = document.getElementById('ui');
  const obs = new MutationObserver(()=>{
    const isMenuHidden = ui.style.display === 'none' || ui.classList.contains('hide');
    btn.style.display = isMenuHidden ? 'block' : 'none';
  });
  obs.observe(ui, { attributes:true, attributeFilter:['style','class'] });

  window.__plugins.add({ update(){}, draw(){} });
})();
