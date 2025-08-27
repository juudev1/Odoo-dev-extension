/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/injected/core/extension-core.js":
/*!*********************************************!*\
  !*** ./src/injected/core/extension-core.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _ExtensionCore;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
// src/injected/core/extension-core.js
var ExtensionCore = /*#__PURE__*/function () {
  function ExtensionCore() {
    _classCallCheck(this, ExtensionCore);
  }
  return _createClass(ExtensionCore, null, [{
    key: "init",
    value:
    // Default, will be updated

    function init() {
      var _this = this;
      if (_assertClassBrand(ExtensionCore, this, _initialized)._) return Promise.resolve(_assertClassBrand(ExtensionCore, this, _extensionData)._);
      if (_assertClassBrand(ExtensionCore, this, _initPromise)._) return _assertClassBrand(ExtensionCore, this, _initPromise)._;
      _initPromise._ = _assertClassBrand(ExtensionCore, this, new Promise(function (resolve, reject) {
        _resolveInitPromise._ = _assertClassBrand(ExtensionCore, _this, resolve);
        _rejectInitPromise._ = _assertClassBrand(ExtensionCore, _this, reject);
        _timeoutId._ = _assertClassBrand(ExtensionCore, _this, setTimeout(function () {
          console.error('[ExtensionCore] Timeout waiting for EXTENSION_INIT message.');
          _assertClassBrand(ExtensionCore, _this, _rejectInitPromise)._.call(_this, new Error('Timeout waiting for extension data'));
          window.removeEventListener('message', _assertClassBrand(ExtensionCore, _this, _handleInitMessageWrapper)._);
        }, 5000));

        // Use a wrapper function for the event listener so 'this' refers to ExtensionCore
        window.addEventListener('message', _assertClassBrand(ExtensionCore, _this, _handleInitMessageWrapper)._);
        console.log('[ExtensionCore] Requesting EXTENSION_INIT data...');
        window.postMessage({
          type: 'REQUEST_EXTENSION_INIT'
        }, '*');
      }));
      return _assertClassBrand(ExtensionCore, this, _initPromise)._;
    }

    // Wrapper to ensure 'this' context is correct for static method
  }, {
    key: "getUrl",
    value: function getUrl() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      if (!_assertClassBrand(ExtensionCore, this, _initialized)._) throw new Error('Extension not initialized');
      return "".concat(_assertClassBrand(ExtensionCore, this, _extensionData)._.url).concat(path);
    }
  }, {
    key: "resources",
    get: function get() {
      if (!_assertClassBrand(ExtensionCore, this, _isEnabled)._) return {
        templates: [],
        css: []
      }; // Return empty if disabled
      return {
        templates: [this.getUrl('src/injected/views/list/list_renderer.xml'), this.getUrl('src/injected/views/form/form_view.xml'), this.getUrl('src/injected/views/field.xml'), this.getUrl('src/injected/views/view_button/view_button.xml'), this.getUrl('src/injected/views/custom/sidebar_dev.xml')],
        css: [this.getUrl('src/injected/tooltip/css/tooltip.css'), this.getUrl('src/injected/views/custom/sidebar_dev.css')]
      };
    }
  }, {
    key: "extensionData",
    get: function get() {
      return _assertClassBrand(ExtensionCore, this, _extensionData)._;
    }
  }, {
    key: "isEnabled",
    get: function get() {
      // Ensure init has run to get the latest state, but don't block indefinitely if init failed
      if (!_assertClassBrand(ExtensionCore, this, _initialized)._ && _assertClassBrand(ExtensionCore, this, _initPromise)._) {
        console.warn("[ExtensionCore] isEnabled accessed before full initialization, relying on default or last known state.");
      }
      return _assertClassBrand(ExtensionCore, this, _isEnabled)._;
    }
  }]);
}();
_ExtensionCore = ExtensionCore;
var _extensionData = {
  _: null
};
var _initialized = {
  _: false
};
var _resolveInitPromise = {
  _: null
};
var _rejectInitPromise = {
  _: null
};
var _initPromise = {
  _: null
};
var _timeoutId = {
  _: null
};
var _isEnabled = {
  _: true
};
var _handleInitMessageWrapper = {
  _: function _(event) {
    _assertClassBrand(_ExtensionCore, _ExtensionCore, _handleInitMessage)._.call(_ExtensionCore, event);
  }
};
var _handleInitMessage = {
  _: function _(event) {
    if (event.source === window && event.data && (event.data.type === 'EXTENSION_INIT' || event.data.type === 'EXTENSION_INIT_ERROR')) {
      clearTimeout(_assertClassBrand(_ExtensionCore, _ExtensionCore, _timeoutId)._);
      window.removeEventListener('message', _assertClassBrand(_ExtensionCore, _ExtensionCore, _handleInitMessageWrapper)._);
      if (event.data.type === 'EXTENSION_INIT_ERROR') {
        console.error('[ExtensionCore] Received EXTENSION_INIT_ERROR:', event.data.error);
        _initialized._ = _assertClassBrand(_ExtensionCore, _ExtensionCore, false); // Mark as not initialized properly
        if (_assertClassBrand(_ExtensionCore, _ExtensionCore, _rejectInitPromise)._) {
          _assertClassBrand(_ExtensionCore, _ExtensionCore, _rejectInitPromise)._.call(_ExtensionCore, new Error(event.data.error || 'Failed to initialize extension data'));
        }
      } else {
        console.log('[ExtensionCore] Received EXTENSION_INIT:', event.data.data);
        _extensionData._ = _assertClassBrand(_ExtensionCore, _ExtensionCore, event.data.data);
        _isEnabled._ = _assertClassBrand(_ExtensionCore, _ExtensionCore, _assertClassBrand(_ExtensionCore, _ExtensionCore, _extensionData)._.isEnabled !== false); // Update enabled state
        _initialized._ = _assertClassBrand(_ExtensionCore, _ExtensionCore, true);
        if (_assertClassBrand(_ExtensionCore, _ExtensionCore, _resolveInitPromise)._) {
          _assertClassBrand(_ExtensionCore, _ExtensionCore, _resolveInitPromise)._.call(_ExtensionCore, _assertClassBrand(_ExtensionCore, _ExtensionCore, _extensionData)._);
        }
      }
      _resolveInitPromise._ = _assertClassBrand(_ExtensionCore, _ExtensionCore, null);
      _rejectInitPromise._ = _assertClassBrand(_ExtensionCore, _ExtensionCore, null);
    }
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ExtensionCore);

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*******************************!*\
  !*** ./src/injected/index.js ***!
  \*******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_extension_core_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./core/extension-core.js */ "./src/injected/core/extension-core.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
// src/injected/index.js

function waitForOdooReady() {
  return _waitForOdooReady.apply(this, arguments);
}
function _waitForOdooReady() {
  _waitForOdooReady = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    var timeout,
      _args2 = arguments;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          timeout = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : 15000;
          return _context2.abrupt("return", new Promise(function (resolve, reject) {
            var startTime = Date.now();
            var interval = setInterval(function () {
              if (typeof odoo !== 'undefined' && typeof odoo.define === 'function' && odoo.runtime && odoo.runtime.app && odoo.runtime.app.env) {
                clearInterval(interval);
                console.log('[Odoo Dev Index] Odoo environment appears ready.');
                resolve();
              } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                console.warn('[Odoo Dev Index] Timeout waiting for Odoo to be ready. Extension might not work correctly.');
                reject(new Error('Timeout waiting for Odoo ready state.'));
              } else if (typeof odoo !== 'undefined' && typeof odoo.define === 'function' && (!odoo.runtime || !odoo.runtime.app)) {
                console.log('[Odoo Dev Index] Odoo define is ready, but odoo.runtime.app not yet...');
              }
            }, 200); // Check every 200ms
          }));
        case 2:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _waitForOdooReady.apply(this, arguments);
}
function initializeOdooDev() {
  return _initializeOdooDev.apply(this, arguments);
}
function _initializeOdooDev() {
  _initializeOdooDev = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    "use strict";

    var loadScript, extensionUrl, srcFolder, globalUrlScript, isWebModule, hasFileLoaded, remainingScripts;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          // Function to dynamically load scripts
          loadScript = function loadScript(path) {
            var url = new URL(path, srcFolder);
            console.log("[Odoo Dev Index] Requesting script:", path);
            return new Promise(function (resolve, reject) {
              var script = document.createElement("script");
              script.src = url.href;
              script.type = "module"; // Assuming all are modules
              script.onload = function () {
                console.log("[Odoo Dev Index] Loaded script:", path);
                resolve(path);
              };
              script.onerror = function (err) {
                var errorMsg = "Failed to load script: ".concat(path, " from ").concat(url.href);
                console.error("[Odoo Dev Index]", errorMsg, err);
                reject(new Error(errorMsg));
              };
              document.head.appendChild(script);
            });
          }; // Check if we should inject modules
          // 1. Initialize ExtensionCore to get basic data (URL, etc.)
          console.log("[Odoo Dev Index] Initializing ExtensionCore...");
          _context3.next = 5;
          return _core_extension_core_js__WEBPACK_IMPORTED_MODULE_0__["default"].init();
        case 5:
          window.ExtensionCore = _core_extension_core_js__WEBPACK_IMPORTED_MODULE_0__["default"]; // Make it globally available
          console.log("[Odoo Dev Index] ExtensionCore initialized. Extension Enabled:", _core_extension_core_js__WEBPACK_IMPORTED_MODULE_0__["default"].isEnabled);
          if (_core_extension_core_js__WEBPACK_IMPORTED_MODULE_0__["default"].isEnabled) {
            _context3.next = 10;
            break;
          }
          console.log("[Odoo Dev Index] Extension is disabled by configuration. Halting Odoo module injections.");
          // Any previously injected elements/patches from a prior enabled state
          // will be gone due to the page reload forced by contentScriptIsolated.js.
          return _context3.abrupt("return");
        case 10:
          extensionUrl = _core_extension_core_js__WEBPACK_IMPORTED_MODULE_0__["default"].getUrl();
          srcFolder = extensionUrl + "src/injected/"; // Create a script global with the URL of the extension
          globalUrlScript = document.createElement("script");
          globalUrlScript.textContent = "window.__devExtensionUrl = \"".concat(extensionUrl, "\";");
          document.head.appendChild(globalUrlScript);
          isWebModule = window.location.pathname.includes('/web') && !window.location.pathname.includes('/web/login') && !window.location.pathname.includes('/web/signup') || window.location.pathname.includes('/odoo');
          hasFileLoaded = document.querySelector('input[type="file"]') !== null;
          if (!(isWebModule || hasFileLoaded)) {
            _context3.next = 40;
            break;
          }
          console.log("[Odoo Dev Index] Conditions met, injecting Odoo modules...");

          // 2. Load odoo_version_utils.js (needed by bundle_xml.js)
          // This defines 'odoo_dev.version_utils'
          _context3.next = 21;
          return loadScript("./utils/odoo_version_utils.js");
        case 21:
          _context3.next = 23;
          return loadScript("./templates/bundle_xml.js");
        case 23:
          _context3.next = 25;
          return loadScript("./core/client.js");
        case 25:
          // 5. IMPORTANT: Wait for client.js's *internal* async operations (template loading) to complete.
          console.log("[Odoo Dev Index] Waiting for client.js internal initialization (template/CSS loading)...");
          if (!window.odooDevClientReadyPromise) {
            _context3.next = 32;
            break;
          }
          _context3.next = 29;
          return window.odooDevClientReadyPromise;
        case 29:
          console.log("[Odoo Dev Index] client.js has finished its internal initialization.");
          _context3.next = 33;
          break;
        case 32:
          // This should not happen if client.js is structured correctly
          console.warn("[Odoo Dev Index] window.odooDevClientReadyPromise was not set by client.js. Proceeding, but templates might not be ready.");
        case 33:
          // 6. Now that templates are loaded, load all other scripts.
          console.log("[Odoo Dev Index] Loading remaining UI components and patches...");
          remainingScripts = [
          // ExtensionCore is already an ES Module import, no need to loadScript it.
          // bundle_xml.js and client.js already loaded.
          // odoo_version_utils.js already loaded.

          // ****** Services ******
          "./tooltip/js/dev_info_service.js", "./services/active_record.js",
          // ****** Components ******
          "./views/custom/field_xpath.js", "./views/custom/sidebar_dev.js",
          // Antes que el form_controller.js para que se actualice el resModel
          "./views/form/form_controller.js", "./views/list/list_controller.js",
          // ****** Webclient Patches ******
          "./webclient.js", "./tooltip/js/tooltip.js", "./views/form/form_compiler.js", "./views/list/list_renderer.js", "./views/view_button/view_button.js", "./views/field.js", "./form_label.js"]; // Load remaining scripts in parallel
          _context3.next = 37;
          return Promise.all(remainingScripts.map(function (scriptPath) {
            return loadScript(scriptPath)["catch"](function (err) {
              // Log individual script load errors but don't necessarily stop all others
              console.error("[Odoo Dev Index] Non-critical error loading script: ".concat(err.message, ". Some features might be affected."));
            });
          }));
        case 37:
          console.log("[Odoo Dev Index] All specified injected scripts have been processed.");
          _context3.next = 41;
          break;
        case 40:
          console.log("[Odoo Dev Index] Conditions not met, no Odoo modules injected.");
        case 41:
          _context3.next = 46;
          break;
        case 43:
          _context3.prev = 43;
          _context3.t0 = _context3["catch"](0);
          console.error("[Odoo Dev Index] Critical error during extension initialization:", _context3.t0);
        case 46:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 43]]);
  }));
  return _initializeOdooDev.apply(this, arguments);
}
_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
  return _regeneratorRuntime().wrap(function _callee$(_context) {
    while (1) switch (_context.prev = _context.next) {
      case 0:
        _context.next = 2;
        return initializeOdooDev();
      case 2:
      case "end":
        return _context.stop();
    }
  }, _callee);
}))();
})();

/******/ })()
;
//# sourceMappingURL=loader.bundle.js.map