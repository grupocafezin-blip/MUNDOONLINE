
window.__plugins = window.__plugins || { updaters: [], drawers: [], add(obj){ if(obj.update) this.updaters.push(obj.update); if(obj.draw) this.drawers.push(obj.draw); } };
window.Game = window.Game || {};
(function(){
  const g = window.Game;
  g.state = g.state || { lastMoveAngle: 0, projectiles: [], npcs: [] };
  g.ensurePlayer = function(me){
    if (!me) return;
    if (!me.inventory) me.inventory = { fruits: {}, page: 0, perPage: 8 };
    if (typeof me.coins !== 'number') me.coins = 0;
    if (!('weapon' in me)) me.weapon = null;
  };
  g.useHookUpdate = function(dt){ for(const fn of window.__plugins.updaters){ try{ fn(dt); }catch(e){} } };
  g.useHookDraw = function(ctx){ for(const fn of window.__plugins.drawers){ try{ fn(ctx); }catch(e){} } };
})();
