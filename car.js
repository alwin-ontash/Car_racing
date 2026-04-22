/**
 * car.js - Player car for Highway Dash.
 * Moves automatically forward (-Y). Player steers left/right only.
 * Dependencies: utils.js, input.js
 */

class Car {
  constructor(x, y, color) {
    this.x      = x;
    this.y      = y;
    this.vx     = 0;
    this.speed  = 250;
    this.width  = 30;
    this.height = 52;
    this.color  = color || '#e94560';
    this._lean  = 0;
  }

  update(dt, fwdSpeed, track) {
    this.speed = fwdSpeed;
    var steerAccel = 520;
    if (Keys.left)  this.vx -= steerAccel * dt;
    if (Keys.right) this.vx += steerAccel * dt;
    this.vx *= Math.pow(0.008, dt);
    this.vx = clamp(this.vx, -320, 320);
    this.x += this.vx * dt;
    this.y -= this.speed * dt;
    var hw = this.width / 2;
    if (this.x < track.leftEdge + hw)  { this.x = track.leftEdge + hw;  if (this.vx < 0) this.vx = 0; }
    if (this.x > track.rightEdge - hw) { this.x = track.rightEdge - hw; if (this.vx > 0) this.vx = 0; }
    var targetLean = clamp(this.vx * 0.0018, -0.14, 0.14);
    this._lean = lerp(this._lean, targetLean, 12 * dt);
  }

  get speedKmh() { return Math.round(this.speed * 0.36); }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this._lean);
    var w = this.width, h = this.height;
    ctx.fillStyle = '#1a1a1a';
    [[-w/2-3,-h/4],[w/2+3,-h/4],[-w/2-3,h/4],[w/2+3,h/4]].forEach(function(p) {
      ctx.fillRect(p[0]-5, p[1]-7, 10, 14);
    });
    ctx.fillStyle = this.color;
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.fillStyle = 'rgba(160,220,255,0.68)';
    ctx.fillRect(-w/2+4, -h/2+6, w-8, h*0.26);
    ctx.fillStyle = 'rgba(130,195,240,0.42)';
    ctx.fillRect(-w/2+4, h/2-h*0.22, w-8, h*0.17);
    ctx.fillStyle = '#ffffaa';
    ctx.beginPath(); ctx.arc(-w/2+6, -h/2+3, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w/2-6, -h/2+3, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ff2200';
    ctx.beginPath(); ctx.arc(-w/2+6, h/2-3, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w/2-6, h/2-3, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}
