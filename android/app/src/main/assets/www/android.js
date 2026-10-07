// Android shell for the Lyvra webOS bundle (app.js).
// app.js is the unchanged TV build: a fixed 1920x1080 stage driven by remote keys
// and Magic Remote pointer clicks. This file adapts it to a phone:
//   - scales the stage to fit the screen (letterboxed, landscape)
//   - turns vertical swipes into wheel steps and horizontal swipes into arrow keys
//   - maps the Android back gesture to the webOS Back key (461)
//   - stands in for window.webOS so "Exit" closes the app
//   - keeps the screen awake while a video is playing
(function () {
  'use strict';
  var W = 1920, H = 1080;
  var bridge = window.LyvraAndroid || null;

  window.webOS = window.webOS || {};
  window.webOS.platformBack = function () { if (bridge) bridge.exit(); else window.close(); };

  var css = document.createElement('style');
  css.textContent =
    'html,body{width:100%!important;height:100%!important;margin:0;overflow:hidden;background:#0B0D17;' +
    'touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}' +
    '#root{position:absolute!important;left:0;top:0;transform-origin:0 0}' +
    'input,textarea{-webkit-user-select:text;user-select:text}';
  document.head.appendChild(css);

  var scale = 1, lastW = 0, lastH = 0;
  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    // The soft keyboard shrinks the window: keep the stage still while typing.
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && w === lastW && h < lastH) return;
    lastW = w; lastH = h;
    scale = Math.min(w / W, h / H);
    var root = document.getElementById('root');
    if (root) root.style.transform = 'translate(' + (w - W * scale) / 2 + 'px,' + (h - H * scale) / 2 + 'px) scale(' + scale + ')';
  }
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', fit);

  // Same synthetic key event app.js builds for itself (it reads keyCode/which).
  function key(code, target) {
    ['keydown', 'keyup'].forEach(function (type) {
      var e = document.createEvent('Event');
      e.initEvent(type, true, true);
      Object.defineProperty(e, 'keyCode', { get: function () { return code; } });
      Object.defineProperty(e, 'which', { get: function () { return code; } });
      (target || window).dispatchEvent(e);
    });
  }
  window.__lyvraBack = function () { key(461, document.activeElement || document.body); };

  // ---- touch: app.js scrolls lists one row per wheel tick, ignoring ticks < 120 ms apart ----
  var STEP_Y = 100, STEP_X = 140, TICK = 130;
  var queue = [], timer = 0, t0 = null;
  function pump() {
    var job = queue.shift();
    if (!job) { timer = 0; return; }
    job();
    timer = setTimeout(pump, TICK);
  }
  function push(job) { queue.push(job); if (!timer) pump(); }
  function wheel(target, dir) {
    push(function () {
      target.dispatchEvent(new WheelEvent('wheel', { deltaY: dir * 100, deltaMode: 0, bubbles: true, cancelable: true }));
    });
  }

  window.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { t0 = null; return; }
    queue.length = 0;
    var t = e.touches[0];
    t0 = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, axis: null, time: Date.now(), py: t.clientY, pt: Date.now(), v: 0,
           target: document.elementFromPoint(t.clientX, t.clientY) || document.body };
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (!t0 || e.touches.length !== 1) return;
    var t = e.touches[0], now = Date.now();
    if (!t0.axis) {
      var dx = t.clientX - t0.x, dy = t.clientY - t0.y;
      if (Math.abs(dy) > 16 && Math.abs(dy) >= Math.abs(dx)) t0.axis = 'y';
      else if (Math.abs(dx) > 24 && Math.abs(dx) > 1.5 * Math.abs(dy)) t0.axis = 'x';
      else return;
    }
    if (t0.axis === 'y') {
      if (now > t0.pt) { t0.v = (t.clientY - t0.py) / (now - t0.pt); t0.py = t.clientY; t0.pt = now; }
      var sy = STEP_Y * scale;
      while (Math.abs(t.clientY - t0.ly) >= sy) {
        var up = t.clientY < t0.ly; // finger moves up -> content moves down
        wheel(t0.target, up ? 1 : -1);
        t0.ly += up ? -sy : sy;
      }
    } else {
      var sx = STEP_X * scale;
      while (Math.abs(t.clientX - t0.lx) >= sx) {
        var right = t.clientX > t0.lx;
        push(key.bind(null, right ? 39 : 37, null));
        t0.lx += right ? sx : -sx;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', function () {
    if (t0 && t0.axis === 'y' && Date.now() - t0.pt < 80 && Math.abs(t0.v) > 0.6) {
      var extra = Math.min(12, Math.round(Math.abs(t0.v) * 5));
      for (var i = 0; i < extra; i++) wheel(t0.target, t0.v < 0 ? 1 : -1);
    }
    t0 = null;
  }, { passive: true });

  // ---- remote colour buttons: tap the on-screen hint, or long-press an item for Favorite (red) ----
  var COLORS = { red: 403, green: 404, yellow: 405, blue: 406 };
  css.textContent += '.hint{cursor:pointer;border-radius:12px;padding:4px 12px;background:rgba(255,255,255,.06)}';
  window.addEventListener('click', function (e) {
    var hint = e.target && e.target.closest && e.target.closest('.hint');
    var dot = hint && hint.querySelector('.dot');
    if (!dot) return;
    for (var c in COLORS) if (dot.classList.contains(c)) {
      e.preventDefault(); e.stopPropagation();
      key(COLORS[c], null);
      return;
    }
  }, true);

  var press = 0, pressed = false;
  window.addEventListener('touchstart', function (e) {
    clearTimeout(press); pressed = false;
    if (e.touches.length !== 1) return;
    var t = e.target;
    if (t && t.closest && t.closest('input,textarea,.hint')) return;
    var x = e.touches[0].clientX, y = e.touches[0].clientY;
    press = setTimeout(function () {
      if (t0 && t0.axis) return; // turned into a swipe
      pressed = true;
      if (navigator.vibrate) navigator.vibrate(20);
      // Hovering focuses an item (Magic Remote behaviour); red then acts on it.
      t.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
      t.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
      setTimeout(function () { key(COLORS.red, null); }, 50);
    }, 550);
  }, { passive: true });
  window.addEventListener('touchmove', function () { if (t0 && t0.axis) clearTimeout(press); }, { passive: true });
  window.addEventListener('touchend', function () { clearTimeout(press); }, { passive: true });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); }, true);
  // The tap that ends a long-press must not also open the item.
  window.addEventListener('click', function (e) {
    if (pressed) { pressed = false; e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ---- keep the screen on during playback ----
  if (bridge) {
    var awake = function (on) { return function (e) { if (e.target && e.target.tagName === 'VIDEO') bridge.keepAwake(on); }; };
    document.addEventListener('playing', awake(true), true);
    ['pause', 'ended', 'emptied', 'error'].forEach(function (t) { document.addEventListener(t, awake(false), true); });
  }
})();
