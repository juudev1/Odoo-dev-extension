/******/ (() => { // webpackBootstrap
/*!************************************************!*\
  !*** ./src/extension/contentScriptIsolated.js ***!
  \************************************************/
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
// src/extension/contentScriptIsolated.js

// --- Constants for Storage Keys ---
var EXTENSION_ENABLED_KEY = 'odooDevExtensionEnabled';
var BACKGROUND_ENABLED_KEY = 'odooDevEnableBackground';
var IMAGE_STORAGE_KEY = 'odoo_bg'; // Assuming this is your key for the image data URL

// --- Module-level State ---
var extensionInitData = null; // Cached data: { id, url, version, backgroundImg, isEnabled, isBackgroundEnabled }
var isDataReady = false; // Flag to indicate if extensionInitData is populated

/**
 * Fetches all relevant extension states from chrome.storage.local.
 * @returns {Promise<object>} A promise that resolves to an object containing isEnabled and isBackgroundEnabled states.
 */
function getStatesFromStorage() {
  return _getStatesFromStorage.apply(this, arguments);
}
/**
 * Fetches the stored background image (as a data URL).
 * @returns {Promise<string|null>} A promise that resolves to the image data URL or null.
 */
function _getStatesFromStorage() {
  _getStatesFromStorage = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          return _context2.abrupt("return", new Promise(function (resolve) {
            chrome.storage.local.get([EXTENSION_ENABLED_KEY, BACKGROUND_ENABLED_KEY], function (result) {
              if (chrome.runtime.lastError) {
                console.error("[Isolated Script] Storage Error getting states:", chrome.runtime.lastError.message);
                // Default to true for both if storage fails, to ensure features are on by default on error
                resolve({
                  isEnabled: true,
                  isBackgroundEnabled: true
                });
                return;
              }
              resolve({
                isEnabled: result[EXTENSION_ENABLED_KEY] !== false,
                // Default to true if undefined
                isBackgroundEnabled: result[BACKGROUND_ENABLED_KEY] !== false // Default to true if undefined
              });
            });
          }));
        case 1:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _getStatesFromStorage.apply(this, arguments);
}
function getStoredBackgroundImage() {
  return _getStoredBackgroundImage.apply(this, arguments);
}
/**
 * Prepares the initial data for the extension, including states from storage and manifest details.
 * This function populates/updates `extensionInitData`.
 * @param {boolean} forceRefresh - If true, re-fetches states and image from storage even if data is already "ready".
 * @returns {Promise<object|null>} The prepared extension data object, or null on critical error.
 */
function _getStoredBackgroundImage() {
  _getStoredBackgroundImage = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          return _context3.abrupt("return", new Promise(function (resolve) {
            chrome.storage.local.get([IMAGE_STORAGE_KEY], function (result) {
              if (chrome.runtime.lastError) {
                console.error("[Isolated Script] Storage Error getting background image:", chrome.runtime.lastError.message);
                resolve(null);
                return;
              }
              resolve(result[IMAGE_STORAGE_KEY] || null); // Return null if not set
            });
          }));
        case 1:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _getStoredBackgroundImage.apply(this, arguments);
}
function prepareExtensionData() {
  return _prepareExtensionData.apply(this, arguments);
}
/**
 * Sends the current `extensionInitData` to the MAIN world via postMessage.
 * @param {boolean} forceDataRefresh - If true, calls prepareExtensionData with forceRefresh=true before sending.
 */
function _prepareExtensionData() {
  _prepareExtensionData = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
    var forceRefresh,
      states,
      storedImage,
      manifest,
      _args4 = arguments;
    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          forceRefresh = _args4.length > 0 && _args4[0] !== undefined ? _args4[0] : false;
          if (!(isDataReady && !forceRefresh)) {
            _context4.next = 3;
            break;
          }
          return _context4.abrupt("return", extensionInitData);
        case 3:
          _context4.prev = 3;
          _context4.next = 6;
          return getStatesFromStorage();
        case 6:
          states = _context4.sent;
          _context4.next = 9;
          return getStoredBackgroundImage();
        case 9:
          storedImage = _context4.sent;
          // Get the latest image
          manifest = chrome.runtime.getManifest();
          extensionInitData = {
            id: chrome.runtime.id,
            url: chrome.runtime.getURL(''),
            version: manifest.version,
            backgroundImg: storedImage,
            // Current stored image
            isEnabled: states.isEnabled,
            // Current main extension enabled state
            isBackgroundEnabled: states.isBackgroundEnabled // Current background enabled state
          };
          isDataReady = true; // Mark data as ready (or re-validated)
          // console.log('[Isolated Script] Extension data prepared successfully:', extensionInitData);
          return _context4.abrupt("return", extensionInitData);
        case 16:
          _context4.prev = 16;
          _context4.t0 = _context4["catch"](3);
          console.error('[Isolated Script] Critical error preparing extension data:', _context4.t0);
          isDataReady = false; // Mark as not ready if there was an error
          extensionInitData = null; // Clear potentially stale data
          return _context4.abrupt("return", null);
        case 22:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[3, 16]]);
  }));
  return _prepareExtensionData.apply(this, arguments);
}
function sendInitDataToMainWorld() {
  return _sendInitDataToMainWorld.apply(this, arguments);
} // --- Event Listeners ---
// Listen for requests from the MAIN world (e.g., ExtensionCore.init())
function _sendInitDataToMainWorld() {
  _sendInitDataToMainWorld = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
    var forceDataRefresh,
      dataToSend,
      _args5 = arguments;
    return _regeneratorRuntime().wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          forceDataRefresh = _args5.length > 0 && _args5[0] !== undefined ? _args5[0] : false;
          _context5.next = 3;
          return prepareExtensionData(forceDataRefresh);
        case 3:
          dataToSend = _context5.sent;
          // Ensures data is up-to-date if forced

          if (dataToSend) {
            console.log('[Isolated Script] Sending EXTENSION_INIT to MAIN world. Data:', JSON.stringify(dataToSend));
            window.postMessage({
              type: 'EXTENSION_INIT',
              data: dataToSend
            }, '*'); // Target '*' is okay for same-window communication to MAIN world
          } else {
            console.error('[Isolated Script] Cannot send EXTENSION_INIT to MAIN world because data preparation failed.');
            window.postMessage({
              type: 'EXTENSION_INIT_ERROR',
              error: 'Failed to prepare extension data in isolated world.'
            }, '*');
          }
        case 5:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return _sendInitDataToMainWorld.apply(this, arguments);
}
window.addEventListener('message', /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(event) {
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(event.source === window && event.data && event.data.type === 'REQUEST_EXTENSION_INIT')) {
            _context.next = 3;
            break;
          }
          _context.next = 3;
          return sendInitDataToMainWorld();
        case 3:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function (_x) {
    return _ref.apply(this, arguments);
  };
}());

// Listen for messages from the popup (e.g., toggle changes)
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('[Isolated Script] Received message from runtime:', request);
  if (request.type === 'ODEV_EXTENSION_STATE_CHANGED') {
    console.log('[Isolated Script] Main extension state changed by popup. New intended state:', request.enabled);
    // The popup has already updated chrome.storage.local for EXTENSION_ENABLED_KEY.
    // The strategy is to reload the page. On reload, prepareExtensionData will fetch the new state.
    console.log('[Isolated Script] Forcing page reload to apply main extension state change.');
    sendResponse({
      status: "reloading_page_due_to_main_state_change"
    }); // Acknowledge before reload
    window.location.reload();
    // Return true because reload is happening, but the function technically "handles" the message.
    // The port will close due to reload anyway.
    return true;
  } else if (request.type === 'ODEV_BACKGROUND_STATE_CHANGED') {
    console.log('[Isolated Script] Background enabled state changed by popup. New state:', request.backgroundEnabled);
    // The popup has already updated chrome.storage.local for BACKGROUND_ENABLED_KEY.
    // We need to:
    // 1. Re-prepare extensionInitData to include this new `isBackgroundEnabled` state (and potentially new isEnabled state).
    // 2. Send this updated data to the MAIN world so it can react (e.g., client.js removing/adding background style).
    // NO PAGE RELOAD for this specific change.

    // Force prepareExtensionData to re-fetch all states from storage to ensure consistency
    sendInitDataToMainWorld(true) // Pass `true` to force data refresh
    .then(function () {
      console.log("[Isolated Script] Successfully resent init data to main world after background state change.");
      sendResponse({
        status: "background_state_updated_and_resent_to_main"
      });
    })["catch"](function (error) {
      console.error("[Isolated Script] Error sending init data to main world after background state change:", error);
      sendResponse({
        status: "error_updating_main_world_for_background",
        error: error.message
      });
    });
    return true; // IMPORTANT: Indicate that sendResponse will be called asynchronously.
  }

  // If the message type isn't handled above, and you don't intend to send a response,
  // it's good practice to either return `false` or not return anything explicitly (undefined).
  // This signals to Chrome that the message port can be closed for this listener.
  // console.log("[Isolated Script] Unhandled message type:", request.type);
  // sendResponse({ status: "unknown_message_type" }); // Optional: if you want to always respond
  return false; // Or simply don't return if no other branches handle it.
});

// --- Initial Execution ---
// Prepare the extension data when the content script is first injected.
// This ensures that `extensionInitData` (including initial states from storage)
// is populated and ready when the MAIN world sends `REQUEST_EXTENSION_INIT`.
prepareExtensionData().then(function (initialData) {
  if (initialData) {
    // console.log("[Isolated Script] Initial data preparation complete on load.", initialData);
  } else {
    console.error("[Isolated Script] Initial data preparation failed on load.");
  }
})["catch"](function (error) {
  console.error("[Isolated Script] Error during initial data preparation on load:", error);
});
/******/ })()
;
//# sourceMappingURL=contentScript.bundle.js.map