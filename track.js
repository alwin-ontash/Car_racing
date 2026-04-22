/**
 * track.js
 * Straight infinite highway.
 *
 * Coordinate system: player moves in the -Y direction (forward = up the Y axis).
 * Obstacles and scenery are spawned ahead (more negative Y) and culled behind.
 *
 * Road layout (world space, fixed X):
 *   leftEdge  = 0
 *   rightEdge = 480
 *   3 lanes of 160 px each
 *   roadCenterX = 240
 *
 * Dependencies: utils.js
 */

class Track {
  constructor() {
    // ── Road geometry ─────────────────────────────────────────
    this.roadWidth   = 480;
    this.roadCenterX = 240;
    this.laneCount   = 3;
    this.laneWidth   = this.roadWidth / this.laneCount;   // 160
    this.leftEdge    = 0;
    this.rightEdge   = this.roadWidth;                    // 480

    // ── Obstacles ─────────────────────────────────────────────
    this.obstacles     = [];
    this._nextObsY     = -1000;   // first obstacle 1000 px ahead of start
    this._minGap       = 300;     // minimum distance between obstacles
    this._gapVariance  = 280;

    // ── Roadside scenery (trees / poles) ─────────────────────
    this.scenery       = [];
    this._nextSceneryY = -80;
    this._sceneryGap   = 160;
  }

  // ── Lane helpers ─────────────────────────────────────────────

  /** World X of the centre of lane index i (0 = left lane). */
  getLaneCenter(i) {
    return this.leftEdge + this.laneWidth * (i + 0.5);
  }

  // ── Per-frame update ─────────────────────────────────────────

  /**
   * @param {number} playerY  — current player world Y (negative, decreasing)
   * @param {number} score    — current score (distance in m) for difficulty scaling
   */
  update(playerY, score) {
    this._spawnObstacles(playerY, score);
    this._spawnScenery(playerY);

    // Cull everything that has fallen behind the player
    const cullY = playerY + 400;
    this.obstacles = this.obstacles.filter(o => o.y < cullY);
    this.scenery   = this.scenery.filter(s => s.y < cullY);
  }

  // ── Obstacle spawning ─────────────────────────────────────────

  _spawnObstacles(playerY, score) {
    // Keep a look-ahead window of 1400 px ahead of the player
    while (this._nextObsY > playerY - 1400) {
      this._placeObstacle(this._nextObsY, score);
      // Gap shrinks as difficulty increases (score is metres driven)
      const gap = Math.max(230, this._minGap + this._gapVariance - score * 0.012);
      this._nextObsY -= gap + Math.random() * 80;
    }
  }

  _placeObstacle(y, score) {
    const lane = Math.floor(Math.random() * this.laneCount);
    const cx   = this.getLaneCenter(lane);
    const r    = Math.random();

    if (r < 0.42) {
      // Traffic cone — small, centred in lane
      this.obstacles.push({ x: cx, y, type: 'cone', width: 28, height: 28 });
    } else if (r < 0.74) {
      // Jersey barrier — spans almost the full lane, must change lanes
      this.obstacles.push({ x: cx, y, type: 'barrier', width: 138, height: 22 });
    } else {
      // Oil slick — wide ellipse, large hazard zone
      this.obstacles.push({ x: cx, y, type: 'oil', width: 72, height: 44 });
    }
  }

  // ── Scenery spawning ──────────────────────────────────────────

  _spawnScenery(playerY) {
    while (this._nextSceneryY > playerY - 1400) {
      const jitter = Math.random() * 40 - 20;
      // Left-side tree
      this.scenery.push({
        x:    this.leftEdge  - 55 - Math.random() * 80,
        y:    this._nextSceneryY + jitter,
        side: 'left',
        size: 14 + Math.random() * 10,
      });
      // Right-side tree
      this.scenery.push({
        x:    this.rightEdge + 55 + Math.random() * 80,
        y:    this._nextSceneryY + jitter,
        side: 'right',
        size: 14 + Math.random() * 10,
      });
      this._nextSceneryY -= this._sceneryGap + Math.random() * 60;
    }
  }

  // ── Collision query ───────────────────────────────────────────

  /**
   * AABB test of player against all obstacles.
   * Hitboxes are shrunk by 25 % for fairness.
   * Returns the first obstacle hit, or null.
   */
  checkObstacleCollision(px, py, pw, ph) {
    const s  = 0.75;
    const pr = { x: px - (pw * s) / 2, y: py - (ph * s) / 2, width: pw * s, height: ph * s };

    for (const obs of this.obstacles) {
      const os = obs.type === 'oil' ? 0.80 : 0.75;   // oil slick slightly more forgiving
      const or_ = {
        x:      obs.x - (obs.width  * os) / 2,
        y:      obs.y - (obs.height * os) / 2,
        width:  obs.width  * os,
        height: obs.height * os,
      };
      if (aabbOverlap(pr, or_)) return obs;
    }
    return null;
  }

  // ── Rendering ─────────────────────────────────────────────────

  /**
   * Draw the track in world space.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} viewMinY  — world Y at top of visible screen
   * @param {number} viewMaxY  — world Y at bottom of visible screen
   */
  draw(ctx, viewMinY, viewMaxY) {
    const top = viewMinY - 250;
    const bot = viewMaxY + 250;
    const h   = bot - top;

    // ── Grass (left and right shoulders) ─────────────────────
    ctx.fillStyle = '#4a9a4a';
    ctx.fillRect(this.leftEdge  - 4000, top, 4000, h);
    ctx.fillRect(this.rightEdge,        top, 4000, h);

    // ── Road surface ─────────────────────────────────────────
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(this.leftEdge, top, this.roadWidth, h);

    // ── Road shoulders (narrow dirt strip at edges) ───────────
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(this.leftEdge,        top, 8, h);
    ctx.fillRect(this.rightEdge - 8,   top, 8, h);

    // ── Solid white edge lines ────────────────────────────────
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 4;
    ctx.beginPath(); ctx.moveTo(this.leftEdge  + 8, top); ctx.lineTo(this.leftEdge  + 8, bot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.rightEdge - 8, top); ctx.lineTo(this.rightEdge - 8, bot); ctx.stroke();

    // ── Dashed lane dividers (yellow) ────────────────────────
    ctx.strokeStyle = '#ffff66';
    ctx.lineWidth   = 2;
    ctx.setLineDash([80, 60]);
    for (let i = 1; i < this.laneCount; i++) {
      const lx = this.leftEdge + this.laneWidth * i;
      ctx.beginPath();
      ctx.moveTo(lx, top);
      ctx.lineTo(lx, bot);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Roadside scenery ─────────────────────────────────────
    for (const s of this.scenery) {
      if (s.y >= viewMinY - 80 && s.y <= viewMaxY + 80) {
        this._drawTree(ctx, s.x, s.y, s.size);
      }
    }

    // ── Obstacles ────────────────────────────────────────────
    for (const obs of this.obstacles) {
      if (obs.y >= viewMinY - 60 && obs.y <= viewMaxY + 60) {
        this._drawObstacle(ctx, obs);
      }
    }
  }

  _drawTree(ctx, x, y, size) {
    // Trunk
    ctx.fillStyle = '#7a5c3a';
    ctx.fillRect(x - 3, y, 6, size * 0.8);
    // Canopy
    ctx.fillStyle = '#2d6e2d';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(100,200,100,0.25)';
    ctx.beginPath();
    ctx.arc(x - size * 0.25, y - size * 0.25, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawObstacle(ctx, obs) {
    ctx.save();
    ctx.translate(obs.x, obs.y);

    switch (obs.type) {
      case 'cone':
        // Orange traffic cone with white reflective band
        ctx.fillStyle = '#ff5500';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(14, 14);
        ctx.lineTo(-14, 14);
        ctx.closePath();
        ctx.fill();
        // White band
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-9, -1, 18, 5);
        // Black base
        ctx.fillStyle = '#222';
        ctx.fillRect(-10, 11, 20, 5);
        break;

      case 'barrier':
        // Red/white jersey barrier
        ctx.fillStyle = '#cc1111';
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
        // White diagonal stripes
        ctx.fillStyle = '#ffffff';
        const sw = obs.width / 5;
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(-obs.width / 2 + i * sw * 1.55 + 3, -obs.height / 2, sw * 0.6, obs.height);
        }
        // Top edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, 4);
        break;

      case 'oil':
        // Dark oil slick with iridescent sheen
        ctx.fillStyle = 'rgba(10, 10, 30, 0.88)';
        ctx.beginPath();
        ctx.ellipse(0, 0, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(110, 50, 210, 0.35)';
        ctx.beginPath();
        ctx.ellipse(-6, -5, obs.width / 4, obs.height / 4, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(50, 190, 220, 0.25)';
        ctx.beginPath();
        ctx.ellipse(8, 4, obs.width / 5, obs.height / 5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}
