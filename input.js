/**
 * input.js
 * Tracks keyboard state for the player car.
 * Exposes a global `Keys` object read by car.js each frame.
 *
 * Supported controls:
 *   Arrow keys  OR  W A S D
 *   Space       — handbrake / drift
 */

const Keys = {
  up:    false,   // accelerate
  down:  false,   // brake / reverse
  left:  false,   // steer left
  right: false,   // steer right
  brake: false,   // handbrake (drift trigger)
};

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowUp':    case 'KeyW': Keys.up    = true; break;
    case 'ArrowDown':  case 'KeyS': Keys.down  = true; break;
    case 'ArrowLeft':  case 'KeyA': Keys.left  = true; break;
    case 'ArrowRight': case 'KeyD': Keys.right = true; break;
    case 'Space':                   Keys.brake = true; break;
  }
  // Prevent page scrolling with arrow keys / space during gameplay
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowUp':    case 'KeyW': Keys.up    = false; break;
    case 'ArrowDown':  case 'KeyS': Keys.down  = false; break;
    case 'ArrowLeft':  case 'KeyA': Keys.left  = false; break;
    case 'ArrowRight': case 'KeyD': Keys.right = false; break;
    case 'Space':                   Keys.brake = false; break;
  }
});
