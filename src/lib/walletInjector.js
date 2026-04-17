/**
 * walletInjector.js
 *
 * Generates the JavaScript provider script that is injected into dApp iframes.
 * The injected script replaces window.ethereum with a bridge provider that
 * routes every RPC call through the parent DappStore window via postMessage.
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  iframe (external dApp)                                              │
 *   │    window.ethereum = QF bridge provider                              │
 *   │    dApp calls provider.request({ method: 'eth_sendTransaction', …}) │
 *   │       └──► postMessage → WALLET_REQUEST                             │
 *   └─────────────────────────────────────────────────────────────────────┘
 *                          │
 *                          ▼
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  parent (DappStore)                                                  │
 *   │    DappRunner.tsx / DappViewer.jsx listen for WALLET_REQUEST         │
 *   │    ├── read-only calls (eth_call, eth_chainId…) → forward to RPC    │
 *   │    └── eth_sendTransaction → intercept, show fee modal, route via   │
 *   │         DappProxy.executeWithFees()                                  │
 *   │                                                                      │
 *   │    posts back WALLET_RESPONSE with result / error                   │
 *   └─────────────────────────────────────────────────────────────────────┘
 */

/**
 * Returns a self-executing JavaScript string that, when injected into a page,
 * installs the QF DappStore bridge provider as window.ethereum.
 *
 * @param {object} cfg
 * @param {string} cfg.dappId          - The numeric dApp ID (used in postMessage).
 * @param {string} [cfg.parentOrigin]  - Expected parent origin for security checks.
 *                                       Pass '*' (or omit) during proxied loads.
 * @returns {string} Minification-safe IIFE to inject via <script> or srcdoc.
 */
export function createProviderScript({ dappId, parentOrigin = '*', chainId = 3426 }) {
  // Serialise config values so they are embedded safely
  const cfgJson = JSON.stringify({ dappId: String(dappId), parentOrigin: String(parentOrigin), chainId: Number(chainId) })

  return `
(function(cfg) {
  'use strict';

  var DAPP_ID    = cfg.dappId;
  var DS_ORIGIN  = cfg.parentOrigin; // '*' when running under the proxy
  var CHAIN_ID   = cfg.chainId || 3426;
  var CHAIN_HEX  = '0x' + CHAIN_ID.toString(16);
  var _reqId     = 0;
  var _pending   = {};
  var _listeners = {};

  /* ── Outbound: send a message to the parent DappStore window ── */
  function postToParent(msg) {
    try {
      window.parent.postMessage(msg, DS_ORIGIN === '*' ? '*' : DS_ORIGIN);
    } catch (e) {
      window.parent.postMessage(msg, '*');
    }
  }

  /* ── Core RPC dispatcher ── */
  function rpc(method, params) {
    return new Promise(function(resolve, reject) {
      var id = ++_reqId;
      _pending[id] = { resolve: resolve, reject: reject };

      postToParent({
        type:      'WALLET_REQUEST',
        dappId:    DAPP_ID,
        requestId: id,
        method:    method,
        params:    params || []
      });

      // 5-minute safety timeout
      setTimeout(function() {
        if (_pending[id]) {
          delete _pending[id];
          reject(new Error('[QF DappStore] Request timed out: ' + method));
        }
      }, 300000);
    });
  }

  /* ── Inbound: handle responses and events from parent ── */
  window.addEventListener('message', function(event) {
    // Origin check — skip when DS_ORIGIN is wildcard
    if (DS_ORIGIN !== '*' && event.origin !== DS_ORIGIN) return;

    var d = event.data;
    if (!d || typeof d !== 'object') return;

    if (d.type === 'WALLET_RESPONSE') {
      var p = _pending[d.requestId];
      if (p) {
        delete _pending[d.requestId];
        if (d.error) {
          p.reject(new Error(d.error));
        } else {
          p.resolve(d.result);
        }
      }
      return;
    }

    if (d.type === 'WALLET_EVENT') {
      var handlers = _listeners[d.event];
      if (handlers) {
        handlers.forEach(function(fn) {
          try { fn(d.data); } catch (_) {}
        });
      }

      // Keep selectedAddress in sync for legacy dApps
      if (d.event === 'accountsChanged' && Array.isArray(d.data)) {
        provider.selectedAddress = d.data[0] || null;
      }
      if (d.event === 'chainChanged') {
        provider.chainId = d.data;
      }
    }
  });

  /* ── The injected EIP-1193 provider ── */
  var provider = {
    isMetaMask:     true,   // maximise dApp compatibility
    isQFDappStore:  true,   // allows DappStore to detect its own provider
    chainId:        CHAIN_HEX,
    networkVersion: String(CHAIN_ID),
    selectedAddress: null,

    /* EIP-1193 */
    request: function(args) {
      return rpc(args.method, args.params);
    },

    /* Legacy web3 1.x async */
    sendAsync: function(payload, callback) {
      rpc(payload.method, payload.params)
        .then(function(result) {
          callback(null, { id: payload.id, jsonrpc: '2.0', result: result });
        })
        .catch(function(err) { callback(err); });
    },

    /* Legacy synchronous / promise hybrid */
    send: function(methodOrPayload, paramsOrCallback) {
      if (typeof methodOrPayload === 'string') {
        // send(method, params?) → Promise
        return rpc(methodOrPayload, paramsOrCallback);
      }
      if (typeof paramsOrCallback === 'function') {
        // send(payload, callback) — legacy callback form
        this.sendAsync(methodOrPayload, paramsOrCallback);
        return;
      }
      // send(payload) → Promise
      return rpc(methodOrPayload.method, methodOrPayload.params);
    },

    /* Event emitter */
    on: function(event, handler) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(handler);
      return this;
    },
    once: function(event, handler) {
      var self = this;
      function wrapper(data) {
        self.removeListener(event, wrapper);
        handler(data);
      }
      return this.on(event, wrapper);
    },
    removeListener: function(event, handler) {
      if (_listeners[event]) {
        _listeners[event] = _listeners[event].filter(function(fn) { return fn !== handler; });
      }
      return this;
    },
    removeAllListeners: function(event) {
      if (event) { _listeners[event] = []; } else { _listeners = {}; }
      return this;
    },

    /* Convenience helpers */
    enable:      function() { return rpc('eth_requestAccounts', []); },
    isConnected: function() { return true; }
  };

  /* ── Install provider ── */
  try {
    Object.defineProperty(window, 'ethereum', {
      value:        provider,
      writable:     false,
      configurable: true
    });
  } catch (_) {
    // defineProperty failed (e.g. already non-configurable) — fall back
    window.ethereum = provider;
  }

  // Minimal web3 shim for very old dApps that access window.web3 directly
  window.web3 = { currentProvider: provider, eth: { accounts: [] } };

  // Signal EIP-1193 provider availability
  window.dispatchEvent(new Event('ethereum#initialized'));

  console.log('[QF DappStore] Wallet provider injected (dApp ' + DAPP_ID + ')');

})(${cfgJson});
`
}

/**
 * Compact variant of createProviderScript — produces the same logic but
 * without comments, suitable for embedding inline in HTML <script> tags
 * sent over the proxy to minimise response size.
 *
 * @param {string|number} dappId
 * @returns {string}
 */
export function createMinifiedProviderScript(dappId, chainId = 3426) {
  const escapedId  = JSON.stringify(String(dappId))
  const chainHex   = JSON.stringify('0x' + Number(chainId).toString(16))
  const chainDec   = JSON.stringify(String(chainId))
  return `(function(){var ID=${escapedId},CHX=${chainHex},CDV=${chainDec},_i=0,_p={},_ev={};function post(m){try{window.parent.postMessage(m,'*')}catch(e){}}function rpc(m,p){return new Promise(function(res,rej){var id=++_i;_p[id]={res:res,rej:rej};post({type:'WALLET_REQUEST',dappId:ID,requestId:id,method:m,params:p||[]});setTimeout(function(){if(_p[id]){delete _p[id];rej(new Error('timeout'))}},300000)})}window.addEventListener('message',function(e){var d=e.data;if(!d)return;if(d.type==='WALLET_RESPONSE'){var p=_p[d.requestId];if(p){delete _p[d.requestId];d.error?p.rej(new Error(d.error)):p.res(d.result)}}if(d.type==='WALLET_EVENT'){(_ev[d.event]||[]).forEach(function(f){try{f(d.data)}catch(e){}});if(d.event==='accountsChanged')pv.selectedAddress=d.data[0]||null;if(d.event==='chainChanged')pv.chainId=d.data}});var pv={isMetaMask:true,isQFDappStore:true,chainId:CHX,networkVersion:CDV,selectedAddress:null,request:function(a){return rpc(a.method,a.params)},sendAsync:function(a,cb){rpc(a.method,a.params).then(function(r){cb(null,{id:a.id,jsonrpc:'2.0',result:r})}).catch(cb)},send:function(m,p){return typeof m==='string'?rpc(m,p):rpc(m.method,m.params)},on:function(e,fn){(_ev[e]=_ev[e]||[]).push(fn);return this},removeListener:function(e,fn){_ev[e]=(_ev[e]||[]).filter(function(f){return f!==fn});return this},enable:function(){return rpc('eth_requestAccounts',[])},isConnected:function(){return true}};try{Object.defineProperty(window,'ethereum',{value:pv,writable:false,configurable:true})}catch(e){window.ethereum=pv}window.web3={currentProvider:pv};window.dispatchEvent(new Event('ethereum#initialized'))})();`
}
