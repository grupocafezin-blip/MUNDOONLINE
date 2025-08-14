
// Simple on-screen joystick
(function(){
  const stick = document.createElement('div');
  const knob = document.createElement('div');
  stick.id = 'stick'; knob.id = 'knob';
  Object.assign(stick.style, {
    position:'fixed', left:'12px', bottom:'12px', width:'120px', height:'120px',
    borderRadius:'999px', background:'rgba(0,0,0,.25)', border:'1px solid rgba(255,255,255,.08)',
    zIndex:20, touchAction:'none'
  });
  Object.assign(knob.style, {
    position:'absolute', left:'50%', top:'50%', width:'60px', height:'60px',
    marginLeft:'-30px', marginTop:'-30px',
    borderRadius:'999px', background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.2)'
  });
  stick.appendChild(knob);
  document.body.appendChild(stick);

  const state = { active:false, x:0, y:0, dx:0, dy:0, radius:50 };
  let rect;

  function setKnob(dx, dy){
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  stick.addEventListener('pointerdown', (e)=>{
    rect = stick.getBoundingClientRect();
    state.active = true;
    stick.setPointerCapture(e.pointerId);
  });
  stick.addEventListener('pointermove', (e)=>{
    if (!state.active) return;
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    const max = state.radius;
    const ndx = (len>max) ? dx/len*max : dx;
    const ndy = (len>max) ? dy/len*max : dy;
    setKnob(ndx, ndy);
    state.dx = ndx/max; state.dy = ndy/max;
    window.__lastMoveAngle = Math.atan2(state.dy, state.dx);
  });
  function reset(){
    state.active = false; setKnob(0,0); state.dx=0; state.dy=0;
  }
  stick.addEventListener('pointerup', reset);
  stick.addEventListener('pointercancel', reset);
  window.__joystick = state;
  window.getJoystickSize = ()=> rect ? rect.width : 120;
  // hidden while on menu; client.js will toggle
  stick.style.display = 'none';
  window.__showStick = (show)=> { stick.style.display = show ? 'block' : 'none'; };
})();
