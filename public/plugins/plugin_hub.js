
// v3.5 plugin hub
window.__plugins = {
  updaters: [],
  drawers: []
};
window.__plugins.add = (obj)=> {
  if (obj.update) window.__plugins.updaters.push(obj.update);
  if (obj.draw) window.__plugins.drawers.push(obj.draw);
};

// expose a light Game facade
window.Game = window.Game || {};
(function(){
  const g = window.Game;
  g.state = { lastMoveAngle: 0, projectiles: [] };
  g.ensurePlayer = function(me){
    if (!me) return;
    if (me.__v35) return;
    me.__v35 = true;
    me.inventory = me.inventory || { fruits: {}, page: 0, perPage: 8 };
    me.coins = me.coins || 0;
    me.weapon = me.weapon || null; // 'broom' or 'gun'
  };
  g.addCoins = function(n){ if (window.me){ window.me.coins = (window.me.coins||0) + n; } };
  g.addFruit = function(name, n){
    if (!window.me) return;
    const f = window.me.inventory.fruits;
    f[name] = (f[name]||0) + n;
  }
  g.useHookUpdate = function(dt){
    for (const fn of window.__plugins.updaters){ try{ fn(dt); }catch(e){ /*noop*/ } }
  }
  g.useHookDraw = function(ctx){
    for (const fn of window.__plugins.drawers){ try{ fn(ctx); }catch(e){ /*noop*/ } }
  }
})();
