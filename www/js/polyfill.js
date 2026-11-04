/* HEXIS PAD — μικρά polyfills για παλιές WebView (Android 8/9, Chrome 61+) */
(function () {
  if (!Object.fromEntries) Object.fromEntries = function (it) { var o = {}; Array.prototype.forEach.call(Array.from(it), function (e) { o[e[0]] = e[1]; }); return o; };
  if (!Array.prototype.flat) Array.prototype.flat = function (d) { d = d === undefined ? 1 : d; var out = []; (function f(a, k) { a.forEach(function (x) { if (Array.isArray(x) && k > 0) f(x, k - 1); else out.push(x); }); })(this, d); return out; };
  if (!Array.prototype.flatMap) Array.prototype.flatMap = function (fn, t) { return this.map(fn, t).flat(1); };
  if (!Array.prototype.at) Array.prototype.at = function (i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return this[i]; };
  if (!String.prototype.at) String.prototype.at = function (i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return this[i]; };
  if (!String.prototype.replaceAll) String.prototype.replaceAll = function (a, b) { if (a instanceof RegExp) return this.replace(a, b); return this.split(String(a)).join(typeof b === 'function' ? b(a) : b); };
  if (!String.prototype.trimStart) String.prototype.trimStart = String.prototype.trimLeft;
  if (!String.prototype.trimEnd) String.prototype.trimEnd = String.prototype.trimRight;
  if (!Promise.allSettled) Promise.allSettled = function (ps) { return Promise.all(Array.from(ps).map(function (p) { return Promise.resolve(p).then(function (v) { return { status: 'fulfilled', value: v }; }, function (r) { return { status: 'rejected', reason: r }; }); })); };
  if (typeof globalThis === 'undefined') { try { window.globalThis = window; } catch (e) { } }
  if (!window.queueMicrotask) window.queueMicrotask = function (f) { Promise.resolve().then(f); };
})();
