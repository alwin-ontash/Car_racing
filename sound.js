/**
 * sound.js - Sound manager for Highway Dash.
 *
 * Uses REAL audio files from the sounds/ folder when available,
 * falls back to Web Audio API synthesis if files are missing.
 *
 * ─── HOW TO ADD REAL SOUNDS ────────────────────────────────────
 * Place these files in the sounds/ folder next to index.html:
 *
 *   sounds/engine.mp3   — looping F1 engine sound (any length, loops)
 *   sounds/crash.mp3    — crash / impact sound (1-3 seconds)
 *   sounds/bgm.mp3      — game-over music (loops)
 *
 * Free sources:
 *   https://freesound.org  (search "F1 engine", "car crash", "game over")
 *   https://pixabay.com/sound-effects/
 *
 * Once the files are in place, refresh the browser — they load automatically.
 * ───────────────────────────────────────────────────────────────
 *
 * Public API:
 *   SoundManager.startEngine()       — start engine loop
 *   SoundManager.updateEngine(kmh)   — pitch engine to speed
 *   SoundManager.stopEngine()        — stop engine
 *   SoundManager.playCrash()         — play crash sound
 *   SoundManager.startBGM()          — start game-over BGM
 *   SoundManager.stopBGM()           — stop BGM
 */

const SoundManager = (function () {

  // ── Real audio elements ───────────────────────────────────────

  let _engineAudio   = null;
  let _crashAudio    = null;
  let _bgmAudio      = null;
  let _useRealEngine = false;
  let _useRealCrash  = false;
  let _useRealBGM    = false;

  // ── Fallback (Web Audio API) state ────────────────────────────

  let _ac          = null;
  let _engineGain  = null;
  let _engineOsc   = null;
  let _engineOsc2  = null;
  let _engineOsc3  = null;
  let _engineOsc4  = null;
  let _vibratoOsc  = null;
  let _engineRunning = false;

  let _bgmPlaying  = false;
  let _bgmTimer    = null;

  // ── Load real audio files if present ─────────────────────────

  (function _loadFiles() {
    function tryLoad(src, onOk) {
      var a = new Audio();
      a.addEventListener('canplaythrough', function () { onOk(a); }, { once: true });
      a.src = src;
      a.load();
    }

    tryLoad('sounds/engine.mp3', function (a) {
      a.loop   = true;
      a.volume = 0.75;
      _engineAudio   = a;
      _useRealEngine = true;
    });

    tryLoad('sounds/crash.mp3', function (a) {
      a.volume      = 0.9;
      _crashAudio   = a;
      _useRealCrash = true;
    });

    tryLoad('sounds/bgm.mp3', function (a) {
      a.loop    = true;
      a.volume  = 0.5;
      _bgmAudio = a;
      _useRealBGM = true;
    });
  }());

  // ── Fallback AudioContext helper ──────────────────────────────

  function _getCtx() {
    if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume();
    return _ac;
  }

  // ── ENGINE ────────────────────────────────────────────────────

  function startEngine() {
    if (_engineRunning) return;
    _engineRunning = true;

    if (_useRealEngine && _engineAudio) {
      _engineAudio.currentTime  = 0;
      _engineAudio.playbackRate = 0.6;   // idle pitch
      _engineAudio.play().catch(function () {});
      return;
    }

    // Fallback: synthesized F1-style engine (4 harmonics + vibrato LFO)
    var ac  = _getCtx();
    var now = ac.currentTime;

    _engineGain = ac.createGain();
    _engineGain.gain.setValueAtTime(0, now);
    _engineGain.gain.linearRampToValueAtTime(0.22, now + 0.6);
    _engineGain.connect(ac.destination);

    // Vibrato LFO — RPM flutter
    _vibratoOsc = ac.createOscillator();
    _vibratoOsc.type = 'sine';
    _vibratoOsc.frequency.setValueAtTime(8, now);
    var vibratoDepth = ac.createGain();
    vibratoDepth.gain.setValueAtTime(6, now);
    _vibratoOsc.connect(vibratoDepth);
    _vibratoOsc.start(now);

    // Osc 1 — fundamental sawtooth
    _engineOsc = ac.createOscillator();
    _engineOsc.type = 'sawtooth';
    _engineOsc.frequency.setValueAtTime(180, now);
    vibratoDepth.connect(_engineOsc.frequency);
    var g1 = ac.createGain(); g1.gain.setValueAtTime(0.55, now);
    _engineOsc.connect(g1); g1.connect(_engineGain); _engineOsc.start(now);

    // Osc 2 — 2nd harmonic sawtooth
    _engineOsc2 = ac.createOscillator();
    _engineOsc2.type = 'sawtooth';
    _engineOsc2.frequency.setValueAtTime(360, now);
    vibratoDepth.connect(_engineOsc2.frequency);
    var g2 = ac.createGain(); g2.gain.setValueAtTime(0.22, now);
    _engineOsc2.connect(g2); g2.connect(_engineGain); _engineOsc2.start(now);

    // Osc 3 — 3rd harmonic square through bandpass (whine)
    _engineOsc3 = ac.createOscillator();
    _engineOsc3.type = 'square';
    _engineOsc3.frequency.setValueAtTime(540, now);
    vibratoDepth.connect(_engineOsc3.frequency);
    var bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, now); bp.Q.setValueAtTime(2.5, now);
    var g3 = ac.createGain(); g3.gain.setValueAtTime(0.18, now);
    _engineOsc3.connect(bp); bp.connect(g3); g3.connect(_engineGain); _engineOsc3.start(now);

    // Osc 4 — 4th harmonic sine (high screech)
    _engineOsc4 = ac.createOscillator();
    _engineOsc4.type = 'sine';
    _engineOsc4.frequency.setValueAtTime(720, now);
    vibratoDepth.connect(_engineOsc4.frequency);
    var g4 = ac.createGain(); g4.gain.setValueAtTime(0.12, now);
    _engineOsc4.connect(g4); g4.connect(_engineGain); _engineOsc4.start(now);
  }

  function updateEngine(speedKmh) {
    if (!_engineRunning) return;
    var ratio = Math.min(speedKmh / 225, 1);

    if (_useRealEngine && _engineAudio) {
      // playbackRate 0.6 (idle) → 1.6 (full F1 scream)
      _engineAudio.playbackRate = 0.6 + ratio * 1.0;
      return;
    }

    if (!_engineOsc) return;
    var ac = _getCtx();
    var t  = ac.currentTime;
    var f1 = 180 + ratio * 240;
    var tc = 0.06 + (1 - ratio) * 0.08;
    _engineOsc.frequency.setTargetAtTime(f1,       t, tc);
    _engineOsc2.frequency.setTargetAtTime(f1 * 2,  t, tc);
    _engineOsc3.frequency.setTargetAtTime(f1 * 3,  t, tc);
    _engineOsc4.frequency.setTargetAtTime(f1 * 4,  t, tc);
    if (_vibratoOsc) _vibratoOsc.frequency.setTargetAtTime(8 - ratio * 5, t, 0.2);
  }

  function stopEngine() {
    if (!_engineRunning) return;
    _engineRunning = false;

    if (_useRealEngine && _engineAudio) {
      _engineAudio.pause();
      return;
    }

    var ac  = _getCtx();
    var now = ac.currentTime;
    if (_engineGain) _engineGain.gain.setTargetAtTime(0, now, 0.08);
    var o1=_engineOsc, o2=_engineOsc2, o3=_engineOsc3, o4=_engineOsc4, v=_vibratoOsc;
    setTimeout(function () {
      try { if (o1) o1.stop(); } catch (e) {}
      try { if (o2) o2.stop(); } catch (e) {}
      try { if (o3) o3.stop(); } catch (e) {}
      try { if (o4) o4.stop(); } catch (e) {}
      try { if (v)  v.stop();  } catch (e) {}
    }, 400);
    _engineOsc = _engineOsc2 = _engineOsc3 = _engineOsc4 = _vibratoOsc = _engineGain = null;
  }

  // ── CRASH ─────────────────────────────────────────────────────

  function playCrash() {
    if (_useRealCrash && _crashAudio) {
      _crashAudio.currentTime = 0;
      _crashAudio.play().catch(function () {});
      return;
    }

    // Fallback: synthesized crash (noise + clang + thud)
    var ac  = _getCtx();
    var now = ac.currentTime;

    // White-noise burst
    var sr     = ac.sampleRate;
    var buf    = ac.createBuffer(1, Math.floor(sr * 1.0), sr);
    var data   = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
    }
    var noise = ac.createBufferSource(); noise.buffer = buf;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, now);
    lp.frequency.exponentialRampToValueAtTime(80, now + 0.6);
    var ng = ac.createGain();
    ng.gain.setValueAtTime(1.0, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    noise.connect(lp); lp.connect(ng); ng.connect(ac.destination); noise.start(now);

    // Metal clang
    var clang = ac.createOscillator(); clang.type = 'sawtooth';
    clang.frequency.setValueAtTime(300, now);
    clang.frequency.exponentialRampToValueAtTime(25, now + 0.5);
    var cg = ac.createGain();
    cg.gain.setValueAtTime(0.7, now); cg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    clang.connect(cg); cg.connect(ac.destination); clang.start(now); clang.stop(now + 0.5);

    // Bass thud
    var thud = ac.createOscillator(); thud.type = 'sine';
    thud.frequency.setValueAtTime(80, now);
    thud.frequency.exponentialRampToValueAtTime(30, now + 0.25);
    var tg = ac.createGain();
    tg.gain.setValueAtTime(0.9, now); tg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    thud.connect(tg); tg.connect(ac.destination); thud.start(now); thud.stop(now + 0.3);
  }

  // ── BGM ───────────────────────────────────────────────────────

  function startBGM() {
    if (_bgmPlaying) return;
    _bgmPlaying = true;

    if (_useRealBGM && _bgmAudio) {
      _bgmAudio.currentTime = 0;
      _bgmAudio.play().catch(function () {});
      return;
    }

    // Fallback: synthesized pentatonic minor melody
    var ac         = _getCtx();
    var BGM_NOTES  = [220, 261, 294, 349, 392, 349, 294, 261, 220, 196, 220];
    var BGM_BEAT   = 0.45;
    var BGM_VOL    = 0.14;
    var LOOP_MS    = BGM_NOTES.length * BGM_BEAT * 1000;

    function scheduleBlock(startTime) {
      if (!_bgmPlaying) return;
      BGM_NOTES.forEach(function (freq, i) {
        var t  = startTime + i * BGM_BEAT;
        var on = BGM_BEAT * 0.85;

        var lead = ac.createOscillator(); lead.type = 'sine';
        lead.frequency.setValueAtTime(freq, t);
        var lg = ac.createGain();
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(BGM_VOL, t + 0.04);
        lg.gain.setValueAtTime(BGM_VOL, t + on - 0.04);
        lg.gain.linearRampToValueAtTime(0, t + on);
        lead.connect(lg); lg.connect(ac.destination); lead.start(t); lead.stop(t + on);

        var bass = ac.createOscillator(); bass.type = 'triangle';
        bass.frequency.setValueAtTime(freq / 2, t);
        var bg = ac.createGain();
        bg.gain.setValueAtTime(0, t);
        bg.gain.linearRampToValueAtTime(BGM_VOL * 0.5, t + 0.06);
        bg.gain.setValueAtTime(BGM_VOL * 0.5, t + on - 0.06);
        bg.gain.linearRampToValueAtTime(0, t + on);
        bass.connect(bg); bg.connect(ac.destination); bass.start(t); bass.stop(t + on);
      });
      _bgmTimer = setTimeout(function () { scheduleBlock(ac.currentTime + 0.05); }, LOOP_MS);
    }

    scheduleBlock(ac.currentTime + 0.05);
  }

  function stopBGM() {
    _bgmPlaying = false;
    if (_bgmTimer !== null) { clearTimeout(_bgmTimer); _bgmTimer = null; }
    if (_useRealBGM && _bgmAudio) { _bgmAudio.pause(); _bgmAudio.currentTime = 0; }
  }

  // ── Public API ────────────────────────────────────────────────

  return { startEngine, updateEngine, stopEngine, playCrash, startBGM, stopBGM };

}());
