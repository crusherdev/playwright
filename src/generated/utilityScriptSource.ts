export const source = "var pwExport=function(e){var t={};function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){\"undefined\"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:\"Module\"}),Object.defineProperty(e,\"__esModule\",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&\"object\"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,\"default\",{enumerable:!0,value:e}),2&t&&\"string\"!=typeof e)for(var o in e)r.d(n,o,function(t){return e[t]}.bind(null,o));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,\"a\",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p=\"\",r(r.s=7)}({4:function(e,t){var r;r=function(){return this}();try{r=r||new Function(\"return this\")()}catch(e){\"object\"==typeof window&&(r=window)}e.exports=r},7:function(e,t,r){\"use strict\";(function(e){Object.defineProperty(t,\"__esModule\",{value:!0}),t.default=void 0;var n=r(8);t.default=class{evaluate(t,r,o,i,...u){const f=u.slice(0,i),a=u.slice(i),c=f.map(e=>(0,n.parseEvaluationResultValue)(e,a));let l=e.eval(o);return!0===t?l=l(...c):!1===t?l=l:\"function\"==typeof l&&(l=l(...c)),r?this._promiseAwareJsonValueNoThrow(l):l}jsonValue(e,t){if(!Object.is(t,void 0))return(0,n.serializeAsCallArgument)(t,e=>({fallThrough:e}))}_promiseAwareJsonValueNoThrow(e){const t=e=>{try{return this.jsonValue(!0,e)}catch(e){return}};return e&&\"object\"==typeof e&&\"function\"==typeof e.then?(async()=>{const r=await e;return t(r)})():t(e)}}}).call(this,r(4))},8:function(e,t,r){\"use strict\";(function(e){Object.defineProperty(t,\"__esModule\",{value:!0}),t.parseEvaluationResultValue=function e(t,r=[]){if(Object.is(t,void 0))return;if(\"object\"==typeof t&&t){if(\"v\"in t){if(\"undefined\"===t.v)return;return\"null\"===t.v?null:\"NaN\"===t.v?NaN:\"Infinity\"===t.v?1/0:\"-Infinity\"===t.v?-1/0:\"-0\"===t.v?-0:void 0}if(\"d\"in t)return new Date(t.d);if(\"r\"in t)return new RegExp(t.r.p,t.r.f);if(\"a\"in t)return t.a.map(t=>e(t,r));if(\"o\"in t){const n={};for(const{k:o,v:i}of t.o)n[o]=e(i,r);return n}if(\"h\"in t)return r[t.h]}return t},t.serializeAsCallArgument=function(t,r){return function t(r,n,o){const i=n(r);if(!(\"fallThrough\"in i))return i;r=i.fallThrough;if(o.has(r))throw new Error(\"Argument is a circular structure\");if(\"symbol\"==typeof r)return{v:\"undefined\"};if(Object.is(r,void 0))return{v:\"undefined\"};if(Object.is(r,null))return{v:\"null\"};if(Object.is(r,NaN))return{v:\"NaN\"};if(Object.is(r,1/0))return{v:\"Infinity\"};if(Object.is(r,-1/0))return{v:\"-Infinity\"};if(Object.is(r,-0))return{v:\"-0\"};if(\"boolean\"==typeof r)return r;if(\"number\"==typeof r)return r;if(\"string\"==typeof r)return r;if(u=r,u instanceof Error||u&&u.__proto__&&\"Error\"===u.__proto__.name){const t=r;return\"captureStackTrace\"in e.Error?t.stack||\"\":`${t.name}: ${t.message}\\n${t.stack}`}var u;if(function(e){return e instanceof Date||\"[object Date]\"===Object.prototype.toString.call(e)}(r))return{d:r.toJSON()};if(function(e){return e instanceof RegExp||\"[object RegExp]\"===Object.prototype.toString.call(e)}(r))return{r:{p:r.source,f:r.flags}};if(Array.isArray(r)){const e=[];o.add(r);for(let i=0;i<r.length;++i)e.push(t(r[i],n,o));return o.delete(r),{a:e}}if(\"object\"==typeof r){const e=[];o.add(r);for(const i of Object.keys(r)){let u;try{u=r[i]}catch(e){continue}\"toJSON\"===i&&\"function\"==typeof u?e.push({k:i,v:{o:[]}}):e.push({k:i,v:t(u,n,o)})}return o.delete(r),{o:e}}}(t,r,new Set)}}).call(this,r(4))}}).default;";