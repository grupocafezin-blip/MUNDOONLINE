
class VirtualJoystick {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.width = container.clientWidth || 140;
    this.canvas.height = container.clientHeight || 140;
    this.ctx = this.canvas.getContext("2d");
    container.appendChild(this.canvas);
    this.center = { x: this.canvas.width/2, y: this.canvas.height/2 };
    this.radius = Math.min(this.center.x, this.center.y) - 6;
    this.pointerId = null;
    this.stick = { x: this.center.x, y: this.center.y };
    this.value = { x: 0, y: 0 };
    this.bind();
    this.draw();
    new ResizeObserver(() => {
      this.canvas.width = container.clientWidth || 140;
      this.canvas.height = container.clientHeight || 140;
      this.center = { x: this.canvas.width/2, y: this.canvas.height/2 };
      this.radius = Math.min(this.center.x, this.center.y) - 6;
      this.draw();
    }).observe(container);
  }
  bind() {
    this.canvas.addEventListener("pointerdown", (e)=>this.start(e));
    this.canvas.addEventListener("pointermove", (e)=>this.move(e));
    this.canvas.addEventListener("pointerup", (e)=>this.end(e));
    this.canvas.addEventListener("pointercancel", (e)=>this.end(e));
    this.canvas.style.touchAction = "none";
  }
  start(e){
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.updateStick(e);
  }
  move(e){
    if (e.pointerId !== this.pointerId) return;
    this.updateStick(e);
  }
  end(e){
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.stick = { x: this.center.x, y: this.center.y };
    this.value = { x: 0, y: 0 };
    this.draw();
  }
  updateStick(e){
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const dist = Math.hypot(dx, dy);
    const max = this.radius;
    if (dist > max){
      const k = max / (dist || 1);
      this.stick = { x: this.center.x + dx * k, y: this.center.y + dy * k };
    } else {
      this.stick = { x, y };
    }
    this.value = { x: (this.stick.x - this.center.x)/max, y: (this.stick.y - this.center.y)/max };
    this.draw();
  }
  draw(){
    const c = this.ctx, w=this.canvas.width, h=this.canvas.height;
    c.clearRect(0,0,w,h);
    // base
    c.globalAlpha = 0.25;
    c.beginPath();
    c.arc(this.center.x, this.center.y, this.radius, 0, Math.PI*2);
    c.fillStyle = "#ffffff";
    c.fill();
    // stick
    c.globalAlpha = 0.8;
    c.beginPath();
    c.arc(this.stick.x, this.stick.y, this.radius*0.35, 0, Math.PI*2);
    c.fillStyle = "#ffffff";
    c.fill();
    c.globalAlpha = 1;
  }
}
