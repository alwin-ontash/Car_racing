/**
 * utils.js
 * Shared math helpers and collision utilities.
 * No dependencies — safe to load first.
 */

// ── Angle helpers ──────────────────────────────────────────────

/**
 * Clamp angle to [-PI, PI].
 * Prevents unbounded rotation accumulation.
 */
function normalizeAngle(a) {
  while (a >  Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Shortest signed difference between two angles.
 * Result is in [-PI, PI].
 */
function angleDiff(a, b) {
  return normalizeAngle(a - b);
}

// ── Numeric helpers ────────────────────────────────────────────

/** Linear interpolation between a and b by t ∈ [0,1]. */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Clamp value v to [min, max]. */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Euclidean distance between two points. */
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distance squared (cheaper — avoids sqrt when comparing). */
function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
}

// ── Collision helpers ──────────────────────────────────────────

/**
 * Axis-Aligned Bounding Box overlap test.
 * Each rect: { x, y, width, height } where x,y is the top-left corner.
 */
function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.width  &&
    a.x + a.width  > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Get the four corner points of a rotated rectangle.
 * cx, cy  — center of the rectangle
 * w, h    — width and height
 * angle   — rotation in radians
 * Returns an array of { x, y } points.
 */
function getRotatedCorners(cx, cy, w, h, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hw = w / 2, hh = h / 2;

  // Local corners before rotation
  const corners = [
    { x: -hw, y: -hh },
    { x:  hw, y: -hh },
    { x:  hw, y:  hh },
    { x: -hw, y:  hh },
  ];

  return corners.map(({ x, y }) => ({
    x: cx + x * cos - y * sin,
    y: cy + x * sin + y * cos,
  }));
}

/**
 * Separating Axis Theorem (SAT) overlap test for two convex polygons.
 * Each polygon is an array of { x, y } vertices in order.
 * Returns true if they overlap, false if separated.
 */
function satOverlap(polyA, polyB) {
  const polys = [polyA, polyB];

  for (const poly of polys) {
    const len = poly.length;
    for (let i = 0; i < len; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % len];

      // Edge normal (perpendicular axis to test)
      const nx = -(b.y - a.y);
      const ny =   b.x - a.x;

      // Project all vertices of both polygons onto this axis
      let minA = Infinity, maxA = -Infinity;
      let minB = Infinity, maxB = -Infinity;

      for (const v of polyA) {
        const p = v.x * nx + v.y * ny;
        if (p < minA) minA = p;
        if (p > maxA) maxA = p;
      }
      for (const v of polyB) {
        const p = v.x * nx + v.y * ny;
        if (p < minB) minB = p;
        if (p > maxB) maxB = p;
      }

      // Separating axis found — no overlap
      if (maxA < minB || maxB < minA) return false;
    }
  }

  return true; // No separating axis found — shapes overlap
}

/**
 * Test whether a point is inside a convex polygon (winding-number approach).
 * poly — array of { x, y }
 */
function pointInPolygon(px, py, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ── Vector helpers ─────────────────────────────────────────────

/** Dot product of two 2D vectors {x, y}. */
function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

/** 2D vector length. */
function vecLen(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Normalize a 2D vector to unit length (safe — returns zero vec if length is 0). */
function vecNorm(v) {
  const len = vecLen(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}
