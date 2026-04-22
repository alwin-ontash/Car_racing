/**
 * aiCar.js - Traffic car for Highway Dash.
 * Moves in same direction as player (-Y) but slower.
 * Player must steer around them.
 * Dependencies: utils.js
 */

class AICar {
  constructor(x, y, speed, color) {
    this.x      = x;
    this.y      = y;
    this.speed  = speed;
    this.width  = 30;
    this.height = 52;
    this.color  = color || '#4fc3f7';
  }

  update(dt) {
    this.y -= this.speed * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    var w = this.width, h = this.height;
    ctx.fillStyle = '#1a1a1a';
    [[-w/2-3,-h/4],[w/2+3,-h/4],[-w/2-3,h/4],[w/2+3,h/4]].forEach(function(p) {
      ctx.fillRect(p[0]-5, p[1]-7, 10, 14);
    });
    ctx.fillStyle = this.color;
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.fillStyle = 'rgba(140,210,250,0.55)';
    ctx.fillRect(-w/2+4, -h/2+6, w-8, h*0.26);
    ctx.fillStyle = 'rgba(120,190,230,0.38)';
    ctx.fillRect(-w/2+4, h/2-h*0.22, w-8, h*0.17);
    ctx.fillStyle = '#ff2200';
    ctx.beginPath(); ctx.arc(-w/2+6, h/2-3, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w/2-6, h/2-3, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}
