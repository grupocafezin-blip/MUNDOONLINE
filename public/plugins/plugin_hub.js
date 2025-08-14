
// v3.7 plugin hub
window.__plugins = window.__plugins || { updaters:[], drawers:[], add:(o)=>{ if(o.update) window.__plugins.updaters.push(o.update); if(o.draw) window.__plugins.drawers.push(o.draw); } };

window.Game = window.Game || {};
(function(){
  const g = window.Game;
  g.state = { lastMoveAngle: 0, projectiles: [], aim: { angle: 0, dir: 1 } };
  g.ensurePlayer = function(me){
    if (!me) return;
    if (me.__v37) return;
    me.__v37 = true;
    me.inventory = me.inventory || { fruits: {}, page: 0, perPage: 8 };
    me.coins = me.coins || 0;
    me.weapon = me.weapon || null;
  };
  g.addCoins = function(n){ if (window.me){ window.me.coins = (window.me.coins||0) + n; } };
  g.addFruit = function(name, n=1){
    if (!window.me) return;
    const f = window.me.inventory.fruits;
    f[name] = (f[name]||0) + n;
  };
  g.useHookUpdate = function(dt){ for (const fn of window.__plugins.updaters){ try{ fn(dt); }catch(e){} } };
  g.useHookDraw = function(ctx){ for (const fn of window.__plugins.drawers){ try{ fn(ctx); }catch(e){} } };
})();
