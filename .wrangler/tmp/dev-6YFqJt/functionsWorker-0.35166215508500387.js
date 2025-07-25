var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-WbCvF8/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// .wrangler/tmp/pages-N9uAjv/functionsWorker-0.35166215508500387.mjs
var __defProp2 = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __export = /* @__PURE__ */ __name((target, all3) => {
  for (var name in all3)
    __defProp2(target, name, { get: all3[name], enumerable: true });
}, "__export");
function stripCfConnectingIPHeader2(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
var init_strip_cf_connecting_ip_header = __esm({
  "../.wrangler/tmp/bundle-xQDN3Q/strip-cf-connecting-ip-header.js"() {
    __name2(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader2.apply(null, argArray)
        ]);
      }
    });
  }
});
function bind(fn, thisArg) {
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function wrap() {
    return fn.apply(thisArg, arguments);
  }, "wrap"), "wrap");
}
__name(bind, "bind");
var init_bind = __esm({
  "../node_modules/axios/lib/helpers/bind.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(bind, "bind");
  }
});
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
__name(isBuffer, "isBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
__name(isArrayBufferView, "isArrayBufferView");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
__name(forEach, "forEach");
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
__name(findKey, "findKey");
function merge() {
  const { caseless } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = /* @__PURE__ */ __name2((val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  }, "assignValue");
  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
__name(merge, "merge");
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
__name(isSpecCompliantForm, "isSpecCompliantForm");
var toString;
var getPrototypeOf;
var iterator;
var toStringTag;
var kindOf;
var kindOfTest;
var typeOfTest;
var isArray;
var isUndefined;
var isArrayBuffer;
var isString;
var isFunction;
var isNumber;
var isObject;
var isBoolean;
var isPlainObject;
var isEmptyObject;
var isDate;
var isFile;
var isBlob;
var isFileList;
var isStream;
var isFormData;
var isURLSearchParams;
var isReadableStream;
var isRequest;
var isResponse;
var isHeaders;
var trim;
var _global;
var isContextDefined;
var extend;
var stripBOM;
var inherits;
var toFlatObject;
var endsWith;
var toArray;
var isTypedArray;
var forEachEntry;
var matchAll;
var isHTMLForm;
var toCamelCase;
var hasOwnProperty;
var isRegExp;
var reduceDescriptors;
var freezeMethods;
var toObjectSet;
var noop;
var toFiniteNumber;
var toJSONObject;
var isAsyncFn;
var isThenable;
var _setImmediate;
var asap;
var isIterable;
var utils_default;
var init_utils = __esm({
  "../node_modules/axios/lib/utils.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_bind();
    ({ toString } = Object.prototype);
    ({ getPrototypeOf } = Object);
    ({ iterator, toStringTag } = Symbol);
    kindOf = /* @__PURE__ */ ((cache) => (thing) => {
      const str = toString.call(thing);
      return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
    })(/* @__PURE__ */ Object.create(null));
    kindOfTest = /* @__PURE__ */ __name2((type) => {
      type = type.toLowerCase();
      return (thing) => kindOf(thing) === type;
    }, "kindOfTest");
    typeOfTest = /* @__PURE__ */ __name2((type) => (thing) => typeof thing === type, "typeOfTest");
    ({ isArray } = Array);
    isUndefined = typeOfTest("undefined");
    __name2(isBuffer, "isBuffer");
    isArrayBuffer = kindOfTest("ArrayBuffer");
    __name2(isArrayBufferView, "isArrayBufferView");
    isString = typeOfTest("string");
    isFunction = typeOfTest("function");
    isNumber = typeOfTest("number");
    isObject = /* @__PURE__ */ __name2((thing) => thing !== null && typeof thing === "object", "isObject");
    isBoolean = /* @__PURE__ */ __name2((thing) => thing === true || thing === false, "isBoolean");
    isPlainObject = /* @__PURE__ */ __name2((val) => {
      if (kindOf(val) !== "object") {
        return false;
      }
      const prototype3 = getPrototypeOf(val);
      return (prototype3 === null || prototype3 === Object.prototype || Object.getPrototypeOf(prototype3) === null) && !(toStringTag in val) && !(iterator in val);
    }, "isPlainObject");
    isEmptyObject = /* @__PURE__ */ __name2((val) => {
      if (!isObject(val) || isBuffer(val)) {
        return false;
      }
      try {
        return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
      } catch (e) {
        return false;
      }
    }, "isEmptyObject");
    isDate = kindOfTest("Date");
    isFile = kindOfTest("File");
    isBlob = kindOfTest("Blob");
    isFileList = kindOfTest("FileList");
    isStream = /* @__PURE__ */ __name2((val) => isObject(val) && isFunction(val.pipe), "isStream");
    isFormData = /* @__PURE__ */ __name2((thing) => {
      let kind;
      return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
      kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
    }, "isFormData");
    isURLSearchParams = kindOfTest("URLSearchParams");
    [isReadableStream, isRequest, isResponse, isHeaders] = ["ReadableStream", "Request", "Response", "Headers"].map(kindOfTest);
    trim = /* @__PURE__ */ __name2((str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""), "trim");
    __name2(forEach, "forEach");
    __name2(findKey, "findKey");
    _global = (() => {
      if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
    })();
    isContextDefined = /* @__PURE__ */ __name2((context) => !isUndefined(context) && context !== _global, "isContextDefined");
    __name2(merge, "merge");
    extend = /* @__PURE__ */ __name2((a, b, thisArg, { allOwnKeys } = {}) => {
      forEach(b, (val, key) => {
        if (thisArg && isFunction(val)) {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      }, { allOwnKeys });
      return a;
    }, "extend");
    stripBOM = /* @__PURE__ */ __name2((content) => {
      if (content.charCodeAt(0) === 65279) {
        content = content.slice(1);
      }
      return content;
    }, "stripBOM");
    inherits = /* @__PURE__ */ __name2((constructor, superConstructor, props, descriptors2) => {
      constructor.prototype = Object.create(superConstructor.prototype, descriptors2);
      constructor.prototype.constructor = constructor;
      Object.defineProperty(constructor, "super", {
        value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
    }, "inherits");
    toFlatObject = /* @__PURE__ */ __name2((sourceObj, destObj, filter2, propFilter) => {
      let props;
      let i;
      let prop;
      const merged = {};
      destObj = destObj || {};
      if (sourceObj == null) return destObj;
      do {
        props = Object.getOwnPropertyNames(sourceObj);
        i = props.length;
        while (i-- > 0) {
          prop = props[i];
          if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
            destObj[prop] = sourceObj[prop];
            merged[prop] = true;
          }
        }
        sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
      } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
      return destObj;
    }, "toFlatObject");
    endsWith = /* @__PURE__ */ __name2((str, searchString, position) => {
      str = String(str);
      if (position === void 0 || position > str.length) {
        position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    }, "endsWith");
    toArray = /* @__PURE__ */ __name2((thing) => {
      if (!thing) return null;
      if (isArray(thing)) return thing;
      let i = thing.length;
      if (!isNumber(i)) return null;
      const arr = new Array(i);
      while (i-- > 0) {
        arr[i] = thing[i];
      }
      return arr;
    }, "toArray");
    isTypedArray = /* @__PURE__ */ ((TypedArray) => {
      return (thing) => {
        return TypedArray && thing instanceof TypedArray;
      };
    })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
    forEachEntry = /* @__PURE__ */ __name2((obj, fn) => {
      const generator = obj && obj[iterator];
      const _iterator = generator.call(obj);
      let result;
      while ((result = _iterator.next()) && !result.done) {
        const pair = result.value;
        fn.call(obj, pair[0], pair[1]);
      }
    }, "forEachEntry");
    matchAll = /* @__PURE__ */ __name2((regExp, str) => {
      let matches;
      const arr = [];
      while ((matches = regExp.exec(str)) !== null) {
        arr.push(matches);
      }
      return arr;
    }, "matchAll");
    isHTMLForm = kindOfTest("HTMLFormElement");
    toCamelCase = /* @__PURE__ */ __name2((str) => {
      return str.toLowerCase().replace(
        /[-_\s]([a-z\d])(\w*)/g,
        /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function replacer(m, p1, p2) {
          return p1.toUpperCase() + p2;
        }, "replacer"), "replacer")
      );
    }, "toCamelCase");
    hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
    isRegExp = kindOfTest("RegExp");
    reduceDescriptors = /* @__PURE__ */ __name2((obj, reducer) => {
      const descriptors2 = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};
      forEach(descriptors2, (descriptor, name) => {
        let ret;
        if ((ret = reducer(descriptor, name, obj)) !== false) {
          reducedDescriptors[name] = ret || descriptor;
        }
      });
      Object.defineProperties(obj, reducedDescriptors);
    }, "reduceDescriptors");
    freezeMethods = /* @__PURE__ */ __name2((obj) => {
      reduceDescriptors(obj, (descriptor, name) => {
        if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
          return false;
        }
        const value = obj[name];
        if (!isFunction(value)) return;
        descriptor.enumerable = false;
        if ("writable" in descriptor) {
          descriptor.writable = false;
          return;
        }
        if (!descriptor.set) {
          descriptor.set = () => {
            throw Error("Can not rewrite read-only method '" + name + "'");
          };
        }
      });
    }, "freezeMethods");
    toObjectSet = /* @__PURE__ */ __name2((arrayOrString, delimiter) => {
      const obj = {};
      const define = /* @__PURE__ */ __name2((arr) => {
        arr.forEach((value) => {
          obj[value] = true;
        });
      }, "define");
      isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
      return obj;
    }, "toObjectSet");
    noop = /* @__PURE__ */ __name2(() => {
    }, "noop");
    toFiniteNumber = /* @__PURE__ */ __name2((value, defaultValue) => {
      return value != null && Number.isFinite(value = +value) ? value : defaultValue;
    }, "toFiniteNumber");
    __name2(isSpecCompliantForm, "isSpecCompliantForm");
    toJSONObject = /* @__PURE__ */ __name2((obj) => {
      const stack = new Array(10);
      const visit = /* @__PURE__ */ __name2((source, i) => {
        if (isObject(source)) {
          if (stack.indexOf(source) >= 0) {
            return;
          }
          if (isBuffer(source)) {
            return source;
          }
          if (!("toJSON" in source)) {
            stack[i] = source;
            const target = isArray(source) ? [] : {};
            forEach(source, (value, key) => {
              const reducedValue = visit(value, i + 1);
              !isUndefined(reducedValue) && (target[key] = reducedValue);
            });
            stack[i] = void 0;
            return target;
          }
        }
        return source;
      }, "visit");
      return visit(obj, 0);
    }, "toJSONObject");
    isAsyncFn = kindOfTest("AsyncFunction");
    isThenable = /* @__PURE__ */ __name2((thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch), "isThenable");
    _setImmediate = ((setImmediateSupported, postMessageSupported) => {
      if (setImmediateSupported) {
        return setImmediate;
      }
      return postMessageSupported ? ((token, callbacks) => {
        _global.addEventListener("message", ({ source, data }) => {
          if (source === _global && data === token) {
            callbacks.length && callbacks.shift()();
          }
        }, false);
        return (cb) => {
          callbacks.push(cb);
          _global.postMessage(token, "*");
        };
      })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
    })(
      typeof setImmediate === "function",
      isFunction(_global.postMessage)
    );
    asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
    isIterable = /* @__PURE__ */ __name2((thing) => thing != null && isFunction(thing[iterator]), "isIterable");
    utils_default = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData,
      isArrayBufferView,
      isString,
      isNumber,
      isBoolean,
      isObject,
      isPlainObject,
      isEmptyObject,
      isReadableStream,
      isRequest,
      isResponse,
      isHeaders,
      isUndefined,
      isDate,
      isFile,
      isBlob,
      isRegExp,
      isFunction,
      isStream,
      isURLSearchParams,
      isTypedArray,
      isFileList,
      forEach,
      merge,
      extend,
      trim,
      stripBOM,
      inherits,
      toFlatObject,
      kindOf,
      kindOfTest,
      endsWith,
      toArray,
      forEachEntry,
      matchAll,
      isHTMLForm,
      hasOwnProperty,
      hasOwnProp: hasOwnProperty,
      // an alias to avoid ESLint no-prototype-builtins detection
      reduceDescriptors,
      freezeMethods,
      toObjectSet,
      toCamelCase,
      noop,
      toFiniteNumber,
      findKey,
      global: _global,
      isContextDefined,
      isSpecCompliantForm,
      toJSONObject,
      isAsyncFn,
      isThenable,
      setImmediate: _setImmediate,
      asap,
      isIterable
    };
  }
});
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack;
  }
  this.message = message;
  this.name = "AxiosError";
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  if (response) {
    this.response = response;
    this.status = response.status ? response.status : null;
  }
}
__name(AxiosError, "AxiosError");
var prototype;
var descriptors;
var AxiosError_default;
var init_AxiosError = __esm({
  "../node_modules/axios/lib/core/AxiosError.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    __name2(AxiosError, "AxiosError");
    utils_default.inherits(AxiosError, Error, {
      toJSON: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: utils_default.toJSONObject(this.config),
          code: this.code,
          status: this.status
        };
      }, "toJSON"), "toJSON")
    });
    prototype = AxiosError.prototype;
    descriptors = {};
    [
      "ERR_BAD_OPTION_VALUE",
      "ERR_BAD_OPTION",
      "ECONNABORTED",
      "ETIMEDOUT",
      "ERR_NETWORK",
      "ERR_FR_TOO_MANY_REDIRECTS",
      "ERR_DEPRECATED",
      "ERR_BAD_RESPONSE",
      "ERR_BAD_REQUEST",
      "ERR_CANCELED",
      "ERR_NOT_SUPPORT",
      "ERR_INVALID_URL"
      // eslint-disable-next-line func-names
    ].forEach((code) => {
      descriptors[code] = { value: code };
    });
    Object.defineProperties(AxiosError, descriptors);
    Object.defineProperty(prototype, "isAxiosError", { value: true });
    AxiosError.from = (error, code, config, request, response, customProps) => {
      const axiosError = Object.create(prototype);
      utils_default.toFlatObject(error, axiosError, /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function filter2(obj) {
        return obj !== Error.prototype;
      }, "filter2"), "filter"), (prop) => {
        return prop !== "isAxiosError";
      });
      AxiosError.call(axiosError, error.message, code, config, request, response);
      axiosError.cause = error;
      axiosError.name = error.name;
      customProps && Object.assign(axiosError, customProps);
      return axiosError;
    };
    AxiosError_default = AxiosError;
  }
});
var null_default;
var init_null = __esm({
  "../node_modules/axios/lib/helpers/null.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    null_default = null;
  }
});
function isVisitable(thing) {
  return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
__name(isVisitable, "isVisitable");
function removeBrackets(key) {
  return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
__name(removeBrackets, "removeBrackets");
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }, "each"), "each")).join(dots ? "." : "");
}
__name(renderKey, "renderKey");
function isFlatArray(arr) {
  return utils_default.isArray(arr) && !arr.some(isVisitable);
}
__name(isFlatArray, "isFlatArray");
function toFormData(obj, formData, options) {
  if (!utils_default.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (null_default || FormData)();
  options = utils_default.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function defined(option, source) {
    return !utils_default.isUndefined(source[option]);
  }, "defined"), "defined"));
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
  if (!utils_default.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils_default.isDate(value)) {
      return value.toISOString();
    }
    if (utils_default.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils_default.isBlob(value)) {
      throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
    }
    if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  __name(convertValue, "convertValue");
  __name2(convertValue, "convertValue");
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (value && !path && typeof value === "object") {
      if (utils_default.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function each(el, index) {
          !(utils_default.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        }, "each"), "each"));
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  __name(defaultVisitor, "defaultVisitor");
  __name2(defaultVisitor, "defaultVisitor");
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path) {
    if (utils_default.isUndefined(value)) return;
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils_default.forEach(value, /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function each(el, key) {
      const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(
        formData,
        el,
        utils_default.isString(key) ? key.trim() : key,
        path,
        exposedHelpers
      );
      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    }, "each"), "each"));
    stack.pop();
  }
  __name(build, "build");
  __name2(build, "build");
  if (!utils_default.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
__name(toFormData, "toFormData");
var predicates;
var toFormData_default;
var init_toFormData = __esm({
  "../node_modules/axios/lib/helpers/toFormData.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_AxiosError();
    init_null();
    __name2(isVisitable, "isVisitable");
    __name2(removeBrackets, "removeBrackets");
    __name2(renderKey, "renderKey");
    __name2(isFlatArray, "isFlatArray");
    predicates = utils_default.toFlatObject(utils_default, {}, null, /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function filter(prop) {
      return /^is[A-Z]/.test(prop);
    }, "filter"), "filter"));
    __name2(toFormData, "toFormData");
    toFormData_default = toFormData;
  }
});
function encode(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function replacer(match2) {
    return charMap[match2];
  }, "replacer"), "replacer"));
}
__name(encode, "encode");
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData_default(params, this, options);
}
__name(AxiosURLSearchParams, "AxiosURLSearchParams");
var prototype2;
var AxiosURLSearchParams_default;
var init_AxiosURLSearchParams = __esm({
  "../node_modules/axios/lib/helpers/AxiosURLSearchParams.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_toFormData();
    __name2(encode, "encode");
    __name2(AxiosURLSearchParams, "AxiosURLSearchParams");
    prototype2 = AxiosURLSearchParams.prototype;
    prototype2.append = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function append(name, value) {
      this._pairs.push([name, value]);
    }, "append"), "append");
    prototype2.toString = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function toString2(encoder) {
      const _encode = encoder ? function(value) {
        return encoder.call(this, value, encode);
      } : encode;
      return this._pairs.map(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function each(pair) {
        return _encode(pair[0]) + "=" + _encode(pair[1]);
      }, "each"), "each"), "").join("&");
    }, "toString2"), "toString");
    AxiosURLSearchParams_default = AxiosURLSearchParams;
  }
});
function encode2(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
__name(encode2, "encode2");
function buildURL(url, params, options) {
  if (!params) {
    return url;
  }
  const _encode = options && options.encode || encode2;
  if (utils_default.isFunction(options)) {
    options = {
      serialize: options
    };
  }
  const serializeFn = options && options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}
__name(buildURL, "buildURL");
var init_buildURL = __esm({
  "../node_modules/axios/lib/helpers/buildURL.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_AxiosURLSearchParams();
    __name2(encode2, "encode");
    __name2(buildURL, "buildURL");
  }
});
var InterceptorManager;
var InterceptorManager_default;
var init_InterceptorManager = __esm({
  "../node_modules/axios/lib/core/InterceptorManager.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    InterceptorManager = class {
      static {
        __name(this, "InterceptorManager");
      }
      static {
        __name2(this, "InterceptorManager");
      }
      constructor() {
        this.handlers = [];
      }
      /**
       * Add a new interceptor to the stack
       *
       * @param {Function} fulfilled The function to handle `then` for a `Promise`
       * @param {Function} rejected The function to handle `reject` for a `Promise`
       *
       * @return {Number} An ID used to remove interceptor later
       */
      use(fulfilled, rejected, options) {
        this.handlers.push({
          fulfilled,
          rejected,
          synchronous: options ? options.synchronous : false,
          runWhen: options ? options.runWhen : null
        });
        return this.handlers.length - 1;
      }
      /**
       * Remove an interceptor from the stack
       *
       * @param {Number} id The ID that was returned by `use`
       *
       * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
       */
      eject(id) {
        if (this.handlers[id]) {
          this.handlers[id] = null;
        }
      }
      /**
       * Clear all interceptors from the stack
       *
       * @returns {void}
       */
      clear() {
        if (this.handlers) {
          this.handlers = [];
        }
      }
      /**
       * Iterate over all the registered interceptors
       *
       * This method is particularly useful for skipping over any
       * interceptors that may have become `null` calling `eject`.
       *
       * @param {Function} fn The function to call for each interceptor
       *
       * @returns {void}
       */
      forEach(fn) {
        utils_default.forEach(this.handlers, /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function forEachHandler(h) {
          if (h !== null) {
            fn(h);
          }
        }, "forEachHandler"), "forEachHandler"));
      }
    };
    InterceptorManager_default = InterceptorManager;
  }
});
var transitional_default;
var init_transitional = __esm({
  "../node_modules/axios/lib/defaults/transitional.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    transitional_default = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    };
  }
});
var URLSearchParams_default;
var init_URLSearchParams = __esm({
  "../node_modules/axios/lib/platform/browser/classes/URLSearchParams.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_AxiosURLSearchParams();
    URLSearchParams_default = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams_default;
  }
});
var FormData_default;
var init_FormData = __esm({
  "../node_modules/axios/lib/platform/browser/classes/FormData.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    FormData_default = typeof FormData !== "undefined" ? FormData : null;
  }
});
var Blob_default;
var init_Blob = __esm({
  "../node_modules/axios/lib/platform/browser/classes/Blob.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    Blob_default = typeof Blob !== "undefined" ? Blob : null;
  }
});
var browser_default;
var init_browser = __esm({
  "../node_modules/axios/lib/platform/browser/index.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_URLSearchParams();
    init_FormData();
    init_Blob();
    browser_default = {
      isBrowser: true,
      classes: {
        URLSearchParams: URLSearchParams_default,
        FormData: FormData_default,
        Blob: Blob_default
      },
      protocols: ["http", "https", "file", "blob", "url", "data"]
    };
  }
});
var utils_exports = {};
__export(utils_exports, {
  hasBrowserEnv: /* @__PURE__ */ __name(() => hasBrowserEnv, "hasBrowserEnv"),
  hasStandardBrowserEnv: /* @__PURE__ */ __name(() => hasStandardBrowserEnv, "hasStandardBrowserEnv"),
  hasStandardBrowserWebWorkerEnv: /* @__PURE__ */ __name(() => hasStandardBrowserWebWorkerEnv, "hasStandardBrowserWebWorkerEnv"),
  navigator: /* @__PURE__ */ __name(() => _navigator, "navigator"),
  origin: /* @__PURE__ */ __name(() => origin, "origin")
});
var hasBrowserEnv;
var _navigator;
var hasStandardBrowserEnv;
var hasStandardBrowserWebWorkerEnv;
var origin;
var init_utils2 = __esm({
  "../node_modules/axios/lib/platform/common/utils.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
    _navigator = typeof navigator === "object" && navigator || void 0;
    hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
    hasStandardBrowserWebWorkerEnv = (() => {
      return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
      self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
    })();
    origin = hasBrowserEnv && window.location.href || "http://localhost";
  }
});
var platform_default;
var init_platform = __esm({
  "../node_modules/axios/lib/platform/index.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_browser();
    init_utils2();
    platform_default = {
      ...utils_exports,
      ...browser_default
    };
  }
});
function toURLEncodedForm(data, options) {
  return toFormData_default(data, new platform_default.classes.URLSearchParams(), {
    visitor: /* @__PURE__ */ __name2(function(value, key, path, helpers) {
      if (platform_default.isNode && utils_default.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    }, "visitor"),
    ...options
  });
}
__name(toURLEncodedForm, "toURLEncodedForm");
var init_toURLEncodedForm = __esm({
  "../node_modules/axios/lib/helpers/toURLEncodedForm.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_toFormData();
    init_platform();
    __name2(toURLEncodedForm, "toURLEncodedForm");
  }
});
function parsePropPath(name) {
  return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match2) => {
    return match2[0] === "[]" ? "" : match2[1] || match2[0];
  });
}
__name(parsePropPath, "parsePropPath");
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
__name(arrayToObject, "arrayToObject");
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils_default.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils_default.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils_default.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils_default.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  __name(buildPath, "buildPath");
  __name2(buildPath, "buildPath");
  if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
    const obj = {};
    utils_default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
__name(formDataToJSON, "formDataToJSON");
var formDataToJSON_default;
var init_formDataToJSON = __esm({
  "../node_modules/axios/lib/helpers/formDataToJSON.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    __name2(parsePropPath, "parsePropPath");
    __name2(arrayToObject, "arrayToObject");
    __name2(formDataToJSON, "formDataToJSON");
    formDataToJSON_default = formDataToJSON;
  }
});
function stringifySafely(rawValue, parser, encoder) {
  if (utils_default.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils_default.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
__name(stringifySafely, "stringifySafely");
var defaults;
var defaults_default;
var init_defaults = __esm({
  "../node_modules/axios/lib/defaults/index.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_AxiosError();
    init_transitional();
    init_toFormData();
    init_toURLEncodedForm();
    init_platform();
    init_formDataToJSON();
    __name2(stringifySafely, "stringifySafely");
    defaults = {
      transitional: transitional_default,
      adapter: ["xhr", "http", "fetch"],
      transformRequest: [/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function transformRequest(data, headers) {
        const contentType = headers.getContentType() || "";
        const hasJSONContentType = contentType.indexOf("application/json") > -1;
        const isObjectPayload = utils_default.isObject(data);
        if (isObjectPayload && utils_default.isHTMLForm(data)) {
          data = new FormData(data);
        }
        const isFormData2 = utils_default.isFormData(data);
        if (isFormData2) {
          return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
        }
        if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) {
          return data;
        }
        if (utils_default.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils_default.isURLSearchParams(data)) {
          headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
          return data.toString();
        }
        let isFileList2;
        if (isObjectPayload) {
          if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }
          if ((isFileList2 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
            const _FormData = this.env && this.env.FormData;
            return toFormData_default(
              isFileList2 ? { "files[]": data } : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }
        if (isObjectPayload || hasJSONContentType) {
          headers.setContentType("application/json", false);
          return stringifySafely(data);
        }
        return data;
      }, "transformRequest"), "transformRequest")],
      transformResponse: [/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function transformResponse(data) {
        const transitional2 = this.transitional || defaults.transitional;
        const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
        const JSONRequested = this.responseType === "json";
        if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) {
          return data;
        }
        if (data && utils_default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
          const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;
          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === "SyntaxError") {
                throw AxiosError_default.from(e, AxiosError_default.ERR_BAD_RESPONSE, this, null, this.response);
              }
              throw e;
            }
          }
        }
        return data;
      }, "transformResponse"), "transformResponse")],
      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      maxBodyLength: -1,
      env: {
        FormData: platform_default.classes.FormData,
        Blob: platform_default.classes.Blob
      },
      validateStatus: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function validateStatus(status) {
        return status >= 200 && status < 300;
      }, "validateStatus"), "validateStatus"),
      headers: {
        common: {
          "Accept": "application/json, text/plain, */*",
          "Content-Type": void 0
        }
      }
    };
    utils_default.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
      defaults.headers[method] = {};
    });
    defaults_default = defaults;
  }
});
var ignoreDuplicateOf;
var parseHeaders_default;
var init_parseHeaders = __esm({
  "../node_modules/axios/lib/helpers/parseHeaders.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    ignoreDuplicateOf = utils_default.toObjectSet([
      "age",
      "authorization",
      "content-length",
      "content-type",
      "etag",
      "expires",
      "from",
      "host",
      "if-modified-since",
      "if-unmodified-since",
      "last-modified",
      "location",
      "max-forwards",
      "proxy-authorization",
      "referer",
      "retry-after",
      "user-agent"
    ]);
    parseHeaders_default = /* @__PURE__ */ __name2((rawHeaders) => {
      const parsed = {};
      let key;
      let val;
      let i;
      rawHeaders && rawHeaders.split("\n").forEach(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function parser(line) {
        i = line.indexOf(":");
        key = line.substring(0, i).trim().toLowerCase();
        val = line.substring(i + 1).trim();
        if (!key || parsed[key] && ignoreDuplicateOf[key]) {
          return;
        }
        if (key === "set-cookie") {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
        }
      }, "parser"), "parser"));
      return parsed;
    }, "default");
  }
});
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
__name(normalizeHeader, "normalizeHeader");
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils_default.isArray(value) ? value.map(normalizeValue) : String(value);
}
__name(normalizeValue, "normalizeValue");
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match2;
  while (match2 = tokensRE.exec(str)) {
    tokens[match2[1]] = match2[2];
  }
  return tokens;
}
__name(parseTokens, "parseTokens");
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils_default.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils_default.isString(value)) return;
  if (utils_default.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils_default.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
__name(matchHeaderValue, "matchHeaderValue");
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
__name(formatHeader, "formatHeader");
function buildAccessors(obj, header) {
  const accessorName = utils_default.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: /* @__PURE__ */ __name2(function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      }, "value"),
      configurable: true
    });
  });
}
__name(buildAccessors, "buildAccessors");
var $internals;
var isValidHeaderName;
var AxiosHeaders;
var AxiosHeaders_default;
var init_AxiosHeaders = __esm({
  "../node_modules/axios/lib/core/AxiosHeaders.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_parseHeaders();
    $internals = Symbol("internals");
    __name2(normalizeHeader, "normalizeHeader");
    __name2(normalizeValue, "normalizeValue");
    __name2(parseTokens, "parseTokens");
    isValidHeaderName = /* @__PURE__ */ __name2((str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim()), "isValidHeaderName");
    __name2(matchHeaderValue, "matchHeaderValue");
    __name2(formatHeader, "formatHeader");
    __name2(buildAccessors, "buildAccessors");
    AxiosHeaders = class {
      static {
        __name(this, "AxiosHeaders");
      }
      static {
        __name2(this, "AxiosHeaders");
      }
      constructor(headers) {
        headers && this.set(headers);
      }
      set(header, valueOrRewrite, rewrite) {
        const self2 = this;
        function setHeader(_value, _header, _rewrite) {
          const lHeader = normalizeHeader(_header);
          if (!lHeader) {
            throw new Error("header name must be a non-empty string");
          }
          const key = utils_default.findKey(self2, lHeader);
          if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
            self2[key || _header] = normalizeValue(_value);
          }
        }
        __name(setHeader, "setHeader");
        __name2(setHeader, "setHeader");
        const setHeaders = /* @__PURE__ */ __name2((headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite)), "setHeaders");
        if (utils_default.isPlainObject(header) || header instanceof this.constructor) {
          setHeaders(header, valueOrRewrite);
        } else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
          setHeaders(parseHeaders_default(header), valueOrRewrite);
        } else if (utils_default.isObject(header) && utils_default.isIterable(header)) {
          let obj = {}, dest, key;
          for (const entry of header) {
            if (!utils_default.isArray(entry)) {
              throw TypeError("Object iterator must return a key-value pair");
            }
            obj[key = entry[0]] = (dest = obj[key]) ? utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
          }
          setHeaders(obj, valueOrRewrite);
        } else {
          header != null && setHeader(valueOrRewrite, header, rewrite);
        }
        return this;
      }
      get(header, parser) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils_default.findKey(this, header);
          if (key) {
            const value = this[key];
            if (!parser) {
              return value;
            }
            if (parser === true) {
              return parseTokens(value);
            }
            if (utils_default.isFunction(parser)) {
              return parser.call(this, value, key);
            }
            if (utils_default.isRegExp(parser)) {
              return parser.exec(value);
            }
            throw new TypeError("parser must be boolean|regexp|function");
          }
        }
      }
      has(header, matcher) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils_default.findKey(this, header);
          return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
        }
        return false;
      }
      delete(header, matcher) {
        const self2 = this;
        let deleted = false;
        function deleteHeader(_header) {
          _header = normalizeHeader(_header);
          if (_header) {
            const key = utils_default.findKey(self2, _header);
            if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
              delete self2[key];
              deleted = true;
            }
          }
        }
        __name(deleteHeader, "deleteHeader");
        __name2(deleteHeader, "deleteHeader");
        if (utils_default.isArray(header)) {
          header.forEach(deleteHeader);
        } else {
          deleteHeader(header);
        }
        return deleted;
      }
      clear(matcher) {
        const keys = Object.keys(this);
        let i = keys.length;
        let deleted = false;
        while (i--) {
          const key = keys[i];
          if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
            delete this[key];
            deleted = true;
          }
        }
        return deleted;
      }
      normalize(format) {
        const self2 = this;
        const headers = {};
        utils_default.forEach(this, (value, header) => {
          const key = utils_default.findKey(headers, header);
          if (key) {
            self2[key] = normalizeValue(value);
            delete self2[header];
            return;
          }
          const normalized = format ? formatHeader(header) : String(header).trim();
          if (normalized !== header) {
            delete self2[header];
          }
          self2[normalized] = normalizeValue(value);
          headers[normalized] = true;
        });
        return this;
      }
      concat(...targets) {
        return this.constructor.concat(this, ...targets);
      }
      toJSON(asStrings) {
        const obj = /* @__PURE__ */ Object.create(null);
        utils_default.forEach(this, (value, header) => {
          value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
        });
        return obj;
      }
      [Symbol.iterator]() {
        return Object.entries(this.toJSON())[Symbol.iterator]();
      }
      toString() {
        return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
      }
      getSetCookie() {
        return this.get("set-cookie") || [];
      }
      get [Symbol.toStringTag]() {
        return "AxiosHeaders";
      }
      static from(thing) {
        return thing instanceof this ? thing : new this(thing);
      }
      static concat(first, ...targets) {
        const computed = new this(first);
        targets.forEach((target) => computed.set(target));
        return computed;
      }
      static accessor(header) {
        const internals = this[$internals] = this[$internals] = {
          accessors: {}
        };
        const accessors = internals.accessors;
        const prototype3 = this.prototype;
        function defineAccessor(_header) {
          const lHeader = normalizeHeader(_header);
          if (!accessors[lHeader]) {
            buildAccessors(prototype3, _header);
            accessors[lHeader] = true;
          }
        }
        __name(defineAccessor, "defineAccessor");
        __name2(defineAccessor, "defineAccessor");
        utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
        return this;
      }
    };
    AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
    utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
      let mapped = key[0].toUpperCase() + key.slice(1);
      return {
        get: /* @__PURE__ */ __name2(() => value, "get"),
        set(headerValue) {
          this[mapped] = headerValue;
        }
      };
    });
    utils_default.freezeMethods(AxiosHeaders);
    AxiosHeaders_default = AxiosHeaders;
  }
});
function transformData(fns, response) {
  const config = this || defaults_default;
  const context = response || config;
  const headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils_default.forEach(fns, /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  }, "transform"), "transform"));
  headers.normalize();
  return data;
}
__name(transformData, "transformData");
var init_transformData = __esm({
  "../node_modules/axios/lib/core/transformData.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_defaults();
    init_AxiosHeaders();
    __name2(transformData, "transformData");
  }
});
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}
__name(isCancel, "isCancel");
var init_isCancel = __esm({
  "../node_modules/axios/lib/cancel/isCancel.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(isCancel, "isCancel");
  }
});
function CanceledError(message, config, request) {
  AxiosError_default.call(this, message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
  this.name = "CanceledError";
}
__name(CanceledError, "CanceledError");
var CanceledError_default;
var init_CanceledError = __esm({
  "../node_modules/axios/lib/cancel/CanceledError.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_AxiosError();
    init_utils();
    __name2(CanceledError, "CanceledError");
    utils_default.inherits(CanceledError, AxiosError_default, {
      __CANCEL__: true
    });
    CanceledError_default = CanceledError;
  }
});
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError_default(
      "Request failed with status code " + response.status,
      [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}
__name(settle, "settle");
var init_settle = __esm({
  "../node_modules/axios/lib/core/settle.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_AxiosError();
    __name2(settle, "settle");
  }
});
function parseProtocol(url) {
  const match2 = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match2 && match2[1] || "";
}
__name(parseProtocol, "parseProtocol");
var init_parseProtocol = __esm({
  "../node_modules/axios/lib/helpers/parseProtocol.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(parseProtocol, "parseProtocol");
  }
});
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  }, "push"), "push");
}
__name(speedometer, "speedometer");
var speedometer_default;
var init_speedometer = __esm({
  "../node_modules/axios/lib/helpers/speedometer.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(speedometer, "speedometer");
    speedometer_default = speedometer;
  }
});
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = /* @__PURE__ */ __name2((args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  }, "invoke");
  const throttled = /* @__PURE__ */ __name2((...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  }, "throttled");
  const flush = /* @__PURE__ */ __name2(() => lastArgs && invoke(lastArgs), "flush");
  return [throttled, flush];
}
__name(throttle, "throttle");
var throttle_default;
var init_throttle = __esm({
  "../node_modules/axios/lib/helpers/throttle.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(throttle, "throttle");
    throttle_default = throttle;
  }
});
var progressEventReducer;
var progressEventDecorator;
var asyncDecorator;
var init_progressEventReducer = __esm({
  "../node_modules/axios/lib/helpers/progressEventReducer.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_speedometer();
    init_throttle();
    init_utils();
    progressEventReducer = /* @__PURE__ */ __name2((listener, isDownloadStream, freq = 3) => {
      let bytesNotified = 0;
      const _speedometer = speedometer_default(50, 250);
      return throttle_default((e) => {
        const loaded = e.loaded;
        const total = e.lengthComputable ? e.total : void 0;
        const progressBytes = loaded - bytesNotified;
        const rate = _speedometer(progressBytes);
        const inRange = loaded <= total;
        bytesNotified = loaded;
        const data = {
          loaded,
          total,
          progress: total ? loaded / total : void 0,
          bytes: progressBytes,
          rate: rate ? rate : void 0,
          estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
          event: e,
          lengthComputable: total != null,
          [isDownloadStream ? "download" : "upload"]: true
        };
        listener(data);
      }, freq);
    }, "progressEventReducer");
    progressEventDecorator = /* @__PURE__ */ __name2((total, throttled) => {
      const lengthComputable = total != null;
      return [(loaded) => throttled[0]({
        lengthComputable,
        total,
        loaded
      }), throttled[1]];
    }, "progressEventDecorator");
    asyncDecorator = /* @__PURE__ */ __name2((fn) => (...args) => utils_default.asap(() => fn(...args)), "asyncDecorator");
  }
});
var isURLSameOrigin_default;
var init_isURLSameOrigin = __esm({
  "../node_modules/axios/lib/helpers/isURLSameOrigin.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_platform();
    isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url) => {
      url = new URL(url, platform_default.origin);
      return origin2.protocol === url.protocol && origin2.host === url.host && (isMSIE || origin2.port === url.port);
    })(
      new URL(platform_default.origin),
      platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)
    ) : () => true;
  }
});
var cookies_default;
var init_cookies = __esm({
  "../node_modules/axios/lib/helpers/cookies.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_platform();
    cookies_default = platform_default.hasStandardBrowserEnv ? (
      // Standard browser envs support document.cookie
      {
        write(name, value, expires, path, domain, secure) {
          const cookie = [name + "=" + encodeURIComponent(value)];
          utils_default.isNumber(expires) && cookie.push("expires=" + new Date(expires).toGMTString());
          utils_default.isString(path) && cookie.push("path=" + path);
          utils_default.isString(domain) && cookie.push("domain=" + domain);
          secure === true && cookie.push("secure");
          document.cookie = cookie.join("; ");
        },
        read(name) {
          const match2 = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
          return match2 ? decodeURIComponent(match2[3]) : null;
        },
        remove(name) {
          this.write(name, "", Date.now() - 864e5);
        }
      }
    ) : (
      // Non-standard browser env (web workers, react-native) lack needed support.
      {
        write() {
        },
        read() {
          return null;
        },
        remove() {
        }
      }
    );
  }
});
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
__name(isAbsoluteURL, "isAbsoluteURL");
var init_isAbsoluteURL = __esm({
  "../node_modules/axios/lib/helpers/isAbsoluteURL.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(isAbsoluteURL, "isAbsoluteURL");
  }
});
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
__name(combineURLs, "combineURLs");
var init_combineURLs = __esm({
  "../node_modules/axios/lib/helpers/combineURLs.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(combineURLs, "combineURLs");
  }
});
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
__name(buildFullPath, "buildFullPath");
var init_buildFullPath = __esm({
  "../node_modules/axios/lib/core/buildFullPath.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_isAbsoluteURL();
    init_combineURLs();
    __name2(buildFullPath, "buildFullPath");
  }
});
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, prop, caseless) {
    if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) {
      return utils_default.merge.call({ caseless }, target, source);
    } else if (utils_default.isPlainObject(source)) {
      return utils_default.merge({}, source);
    } else if (utils_default.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  __name(getMergedValue, "getMergedValue");
  __name2(getMergedValue, "getMergedValue");
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  __name(mergeDeepProperties, "mergeDeepProperties");
  __name2(mergeDeepProperties, "mergeDeepProperties");
  function valueFromConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  __name(valueFromConfig2, "valueFromConfig2");
  __name2(valueFromConfig2, "valueFromConfig2");
  function defaultToConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  __name(defaultToConfig2, "defaultToConfig2");
  __name2(defaultToConfig2, "defaultToConfig2");
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(void 0, a);
    }
  }
  __name(mergeDirectKeys, "mergeDirectKeys");
  __name2(mergeDirectKeys, "mergeDirectKeys");
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: /* @__PURE__ */ __name2((a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true), "headers")
  };
  utils_default.forEach(Object.keys({ ...config1, ...config2 }), /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function computeConfigValue(prop) {
    const merge2 = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge2(config1[prop], config2[prop], prop);
    utils_default.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  }, "computeConfigValue"), "computeConfigValue"));
  return config;
}
__name(mergeConfig, "mergeConfig");
var headersToObject;
var init_mergeConfig = __esm({
  "../node_modules/axios/lib/core/mergeConfig.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_AxiosHeaders();
    headersToObject = /* @__PURE__ */ __name2((thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing, "headersToObject");
    __name2(mergeConfig, "mergeConfig");
  }
});
var resolveConfig_default;
var init_resolveConfig = __esm({
  "../node_modules/axios/lib/helpers/resolveConfig.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_platform();
    init_utils();
    init_isURLSameOrigin();
    init_cookies();
    init_buildFullPath();
    init_mergeConfig();
    init_AxiosHeaders();
    init_buildURL();
    resolveConfig_default = /* @__PURE__ */ __name2((config) => {
      const newConfig = mergeConfig({}, config);
      let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
      newConfig.headers = headers = AxiosHeaders_default.from(headers);
      newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
      if (auth) {
        headers.set(
          "Authorization",
          "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
        );
      }
      let contentType;
      if (utils_default.isFormData(data)) {
        if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) {
          headers.setContentType(void 0);
        } else if ((contentType = headers.getContentType()) !== false) {
          const [type, ...tokens] = contentType ? contentType.split(";").map((token) => token.trim()).filter(Boolean) : [];
          headers.setContentType([type || "multipart/form-data", ...tokens].join("; "));
        }
      }
      if (platform_default.hasStandardBrowserEnv) {
        withXSRFToken && utils_default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
        if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin_default(newConfig.url)) {
          const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
          if (xsrfValue) {
            headers.set(xsrfHeaderName, xsrfValue);
          }
        }
      }
      return newConfig;
    }, "default");
  }
});
var isXHRAdapterSupported;
var xhr_default;
var init_xhr = __esm({
  "../node_modules/axios/lib/adapters/xhr.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_settle();
    init_transitional();
    init_AxiosError();
    init_CanceledError();
    init_parseProtocol();
    init_platform();
    init_AxiosHeaders();
    init_progressEventReducer();
    init_resolveConfig();
    isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
    xhr_default = isXHRAdapterSupported && function(config) {
      return new Promise(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function dispatchXhrRequest(resolve, reject) {
        const _config = resolveConfig_default(config);
        let requestData = _config.data;
        const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
        let { responseType, onUploadProgress, onDownloadProgress } = _config;
        let onCanceled;
        let uploadThrottled, downloadThrottled;
        let flushUpload, flushDownload;
        function done() {
          flushUpload && flushUpload();
          flushDownload && flushDownload();
          _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
          _config.signal && _config.signal.removeEventListener("abort", onCanceled);
        }
        __name(done, "done");
        __name2(done, "done");
        let request = new XMLHttpRequest();
        request.open(_config.method.toUpperCase(), _config.url, true);
        request.timeout = _config.timeout;
        function onloadend() {
          if (!request) {
            return;
          }
          const responseHeaders = AxiosHeaders_default.from(
            "getAllResponseHeaders" in request && request.getAllResponseHeaders()
          );
          const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };
          settle(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function _resolve(value) {
            resolve(value);
            done();
          }, "_resolve"), "_resolve"), /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function _reject(err) {
            reject(err);
            done();
          }, "_reject"), "_reject"), response);
          request = null;
        }
        __name(onloadend, "onloadend");
        __name2(onloadend, "onloadend");
        if ("onloadend" in request) {
          request.onloadend = onloadend;
        } else {
          request.onreadystatechange = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
              return;
            }
            setTimeout(onloadend);
          }, "handleLoad"), "handleLoad");
        }
        request.onabort = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function handleAbort() {
          if (!request) {
            return;
          }
          reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
          request = null;
        }, "handleAbort"), "handleAbort");
        request.onerror = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function handleError2() {
          reject(new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request));
          request = null;
        }, "handleError2"), "handleError");
        request.ontimeout = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function handleTimeout() {
          let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
          const transitional2 = _config.transitional || transitional_default;
          if (_config.timeoutErrorMessage) {
            timeoutErrorMessage = _config.timeoutErrorMessage;
          }
          reject(new AxiosError_default(
            timeoutErrorMessage,
            transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
            config,
            request
          ));
          request = null;
        }, "handleTimeout"), "handleTimeout");
        requestData === void 0 && requestHeaders.setContentType(null);
        if ("setRequestHeader" in request) {
          utils_default.forEach(requestHeaders.toJSON(), /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function setRequestHeader(val, key) {
            request.setRequestHeader(key, val);
          }, "setRequestHeader"), "setRequestHeader"));
        }
        if (!utils_default.isUndefined(_config.withCredentials)) {
          request.withCredentials = !!_config.withCredentials;
        }
        if (responseType && responseType !== "json") {
          request.responseType = _config.responseType;
        }
        if (onDownloadProgress) {
          [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
          request.addEventListener("progress", downloadThrottled);
        }
        if (onUploadProgress && request.upload) {
          [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
          request.upload.addEventListener("progress", uploadThrottled);
          request.upload.addEventListener("loadend", flushUpload);
        }
        if (_config.cancelToken || _config.signal) {
          onCanceled = /* @__PURE__ */ __name2((cancel) => {
            if (!request) {
              return;
            }
            reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
            request.abort();
            request = null;
          }, "onCanceled");
          _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
          if (_config.signal) {
            _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
          }
        }
        const protocol = parseProtocol(_config.url);
        if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
          reject(new AxiosError_default("Unsupported protocol " + protocol + ":", AxiosError_default.ERR_BAD_REQUEST, config));
          return;
        }
        request.send(requestData || null);
      }, "dispatchXhrRequest"), "dispatchXhrRequest"));
    };
  }
});
var composeSignals;
var composeSignals_default;
var init_composeSignals = __esm({
  "../node_modules/axios/lib/helpers/composeSignals.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_CanceledError();
    init_AxiosError();
    init_utils();
    composeSignals = /* @__PURE__ */ __name2((signals, timeout) => {
      const { length } = signals = signals ? signals.filter(Boolean) : [];
      if (timeout || length) {
        let controller = new AbortController();
        let aborted;
        const onabort = /* @__PURE__ */ __name2(function(reason) {
          if (!aborted) {
            aborted = true;
            unsubscribe();
            const err = reason instanceof Error ? reason : this.reason;
            controller.abort(err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err));
          }
        }, "onabort");
        let timer = timeout && setTimeout(() => {
          timer = null;
          onabort(new AxiosError_default(`timeout ${timeout} of ms exceeded`, AxiosError_default.ETIMEDOUT));
        }, timeout);
        const unsubscribe = /* @__PURE__ */ __name2(() => {
          if (signals) {
            timer && clearTimeout(timer);
            timer = null;
            signals.forEach((signal2) => {
              signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
            });
            signals = null;
          }
        }, "unsubscribe");
        signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
        const { signal } = controller;
        signal.unsubscribe = () => utils_default.asap(unsubscribe);
        return signal;
      }
    }, "composeSignals");
    composeSignals_default = composeSignals;
  }
});
var streamChunk;
var readBytes;
var readStream;
var trackStream;
var init_trackStream = __esm({
  "../node_modules/axios/lib/helpers/trackStream.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    streamChunk = /* @__PURE__ */ __name2(function* (chunk, chunkSize) {
      let len = chunk.byteLength;
      if (!chunkSize || len < chunkSize) {
        yield chunk;
        return;
      }
      let pos = 0;
      let end;
      while (pos < len) {
        end = pos + chunkSize;
        yield chunk.slice(pos, end);
        pos = end;
      }
    }, "streamChunk");
    readBytes = /* @__PURE__ */ __name2(async function* (iterable, chunkSize) {
      for await (const chunk of readStream(iterable)) {
        yield* streamChunk(chunk, chunkSize);
      }
    }, "readBytes");
    readStream = /* @__PURE__ */ __name2(async function* (stream) {
      if (stream[Symbol.asyncIterator]) {
        yield* stream;
        return;
      }
      const reader = stream.getReader();
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          yield value;
        }
      } finally {
        await reader.cancel();
      }
    }, "readStream");
    trackStream = /* @__PURE__ */ __name2((stream, chunkSize, onProgress, onFinish) => {
      const iterator2 = readBytes(stream, chunkSize);
      let bytes = 0;
      let done;
      let _onFinish = /* @__PURE__ */ __name2((e) => {
        if (!done) {
          done = true;
          onFinish && onFinish(e);
        }
      }, "_onFinish");
      return new ReadableStream({
        async pull(controller) {
          try {
            const { done: done2, value } = await iterator2.next();
            if (done2) {
              _onFinish();
              controller.close();
              return;
            }
            let len = value.byteLength;
            if (onProgress) {
              let loadedBytes = bytes += len;
              onProgress(loadedBytes);
            }
            controller.enqueue(new Uint8Array(value));
          } catch (err) {
            _onFinish(err);
            throw err;
          }
        },
        cancel(reason) {
          _onFinish(reason);
          return iterator2.return();
        }
      }, {
        highWaterMark: 2
      });
    }, "trackStream");
  }
});
var isFetchSupported;
var isReadableStreamSupported;
var encodeText;
var test;
var supportsRequestStream;
var DEFAULT_CHUNK_SIZE;
var supportsResponseStream;
var resolvers;
var getBodyLength;
var resolveBodyLength;
var fetch_default;
var init_fetch = __esm({
  "../node_modules/axios/lib/adapters/fetch.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_platform();
    init_utils();
    init_AxiosError();
    init_composeSignals();
    init_trackStream();
    init_AxiosHeaders();
    init_progressEventReducer();
    init_resolveConfig();
    init_settle();
    isFetchSupported = typeof fetch === "function" && typeof Request === "function" && typeof Response === "function";
    isReadableStreamSupported = isFetchSupported && typeof ReadableStream === "function";
    encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Response(str).arrayBuffer()));
    test = /* @__PURE__ */ __name2((fn, ...args) => {
      try {
        return !!fn(...args);
      } catch (e) {
        return false;
      }
    }, "test");
    supportsRequestStream = isReadableStreamSupported && test(() => {
      let duplexAccessed = false;
      const hasContentType = new Request(platform_default.origin, {
        body: new ReadableStream(),
        method: "POST",
        get duplex() {
          duplexAccessed = true;
          return "half";
        }
      }).headers.has("Content-Type");
      return duplexAccessed && !hasContentType;
    });
    DEFAULT_CHUNK_SIZE = 64 * 1024;
    supportsResponseStream = isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
    resolvers = {
      stream: supportsResponseStream && ((res) => res.body)
    };
    isFetchSupported && ((res) => {
      ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
        !resolvers[type] && (resolvers[type] = utils_default.isFunction(res[type]) ? (res2) => res2[type]() : (_, config) => {
          throw new AxiosError_default(`Response type '${type}' is not supported`, AxiosError_default.ERR_NOT_SUPPORT, config);
        });
      });
    })(new Response());
    getBodyLength = /* @__PURE__ */ __name2(async (body) => {
      if (body == null) {
        return 0;
      }
      if (utils_default.isBlob(body)) {
        return body.size;
      }
      if (utils_default.isSpecCompliantForm(body)) {
        const _request = new Request(platform_default.origin, {
          method: "POST",
          body
        });
        return (await _request.arrayBuffer()).byteLength;
      }
      if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) {
        return body.byteLength;
      }
      if (utils_default.isURLSearchParams(body)) {
        body = body + "";
      }
      if (utils_default.isString(body)) {
        return (await encodeText(body)).byteLength;
      }
    }, "getBodyLength");
    resolveBodyLength = /* @__PURE__ */ __name2(async (headers, body) => {
      const length = utils_default.toFiniteNumber(headers.getContentLength());
      return length == null ? getBodyLength(body) : length;
    }, "resolveBodyLength");
    fetch_default = isFetchSupported && (async (config) => {
      let {
        url,
        method,
        data,
        signal,
        cancelToken,
        timeout,
        onDownloadProgress,
        onUploadProgress,
        responseType,
        headers,
        withCredentials = "same-origin",
        fetchOptions
      } = resolveConfig_default(config);
      responseType = responseType ? (responseType + "").toLowerCase() : "text";
      let composedSignal = composeSignals_default([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
      let request;
      const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
        composedSignal.unsubscribe();
      });
      let requestContentLength;
      try {
        if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
          let _request = new Request(url, {
            method: "POST",
            body: data,
            duplex: "half"
          });
          let contentTypeHeader;
          if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
            headers.setContentType(contentTypeHeader);
          }
          if (_request.body) {
            const [onProgress, flush] = progressEventDecorator(
              requestContentLength,
              progressEventReducer(asyncDecorator(onUploadProgress))
            );
            data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
          }
        }
        if (!utils_default.isString(withCredentials)) {
          withCredentials = withCredentials ? "include" : "omit";
        }
        const isCredentialsSupported = "credentials" in Request.prototype;
        request = new Request(url, {
          ...fetchOptions,
          signal: composedSignal,
          method: method.toUpperCase(),
          headers: headers.normalize().toJSON(),
          body: data,
          duplex: "half",
          credentials: isCredentialsSupported ? withCredentials : void 0
        });
        let response = await fetch(request, fetchOptions);
        const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
        if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
          const options = {};
          ["status", "statusText", "headers"].forEach((prop) => {
            options[prop] = response[prop];
          });
          const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
          const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
            responseContentLength,
            progressEventReducer(asyncDecorator(onDownloadProgress), true)
          ) || [];
          response = new Response(
            trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
              flush && flush();
              unsubscribe && unsubscribe();
            }),
            options
          );
        }
        responseType = responseType || "text";
        let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](response, config);
        !isStreamResponse && unsubscribe && unsubscribe();
        return await new Promise((resolve, reject) => {
          settle(resolve, reject, {
            data: responseData,
            headers: AxiosHeaders_default.from(response.headers),
            status: response.status,
            statusText: response.statusText,
            config,
            request
          });
        });
      } catch (err) {
        unsubscribe && unsubscribe();
        if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
          throw Object.assign(
            new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request),
            {
              cause: err.cause || err
            }
          );
        }
        throw AxiosError_default.from(err, err && err.code, config, request);
      }
    });
  }
});
var knownAdapters;
var renderReason;
var isResolvedHandle;
var adapters_default;
var init_adapters = __esm({
  "../node_modules/axios/lib/adapters/adapters.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_null();
    init_xhr();
    init_fetch();
    init_AxiosError();
    knownAdapters = {
      http: null_default,
      xhr: xhr_default,
      fetch: fetch_default
    };
    utils_default.forEach(knownAdapters, (fn, value) => {
      if (fn) {
        try {
          Object.defineProperty(fn, "name", { value });
        } catch (e) {
        }
        Object.defineProperty(fn, "adapterName", { value });
      }
    });
    renderReason = /* @__PURE__ */ __name2((reason) => `- ${reason}`, "renderReason");
    isResolvedHandle = /* @__PURE__ */ __name2((adapter) => utils_default.isFunction(adapter) || adapter === null || adapter === false, "isResolvedHandle");
    adapters_default = {
      getAdapter: /* @__PURE__ */ __name2((adapters) => {
        adapters = utils_default.isArray(adapters) ? adapters : [adapters];
        const { length } = adapters;
        let nameOrAdapter;
        let adapter;
        const rejectedReasons = {};
        for (let i = 0; i < length; i++) {
          nameOrAdapter = adapters[i];
          let id;
          adapter = nameOrAdapter;
          if (!isResolvedHandle(nameOrAdapter)) {
            adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
            if (adapter === void 0) {
              throw new AxiosError_default(`Unknown adapter '${id}'`);
            }
          }
          if (adapter) {
            break;
          }
          rejectedReasons[id || "#" + i] = adapter;
        }
        if (!adapter) {
          const reasons = Object.entries(rejectedReasons).map(
            ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
          );
          let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
          throw new AxiosError_default(
            `There is no suitable adapter to dispatch the request ` + s,
            "ERR_NOT_SUPPORT"
          );
        }
        return adapter;
      }, "getAdapter"),
      adapters: knownAdapters
    };
  }
});
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError_default(null, config);
  }
}
__name(throwIfCancellationRequested, "throwIfCancellationRequested");
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(
    config,
    config.transformRequest
  );
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters_default.getAdapter(config.adapter || defaults_default.adapter);
  return adapter(config).then(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );
    response.headers = AxiosHeaders_default.from(response.headers);
    return response;
  }, "onAdapterResolution"), "onAdapterResolution"), /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  }, "onAdapterRejection"), "onAdapterRejection"));
}
__name(dispatchRequest, "dispatchRequest");
var init_dispatchRequest = __esm({
  "../node_modules/axios/lib/core/dispatchRequest.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_transformData();
    init_isCancel();
    init_defaults();
    init_CanceledError();
    init_AxiosHeaders();
    init_adapters();
    __name2(throwIfCancellationRequested, "throwIfCancellationRequested");
    __name2(dispatchRequest, "dispatchRequest");
  }
});
var VERSION;
var init_data = __esm({
  "../node_modules/axios/lib/env/data.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    VERSION = "1.11.0";
  }
});
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === void 0 || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError_default("option " + opt + " must be " + result, AxiosError_default.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
    }
  }
}
__name(assertOptions, "assertOptions");
var validators;
var deprecatedWarnings;
var validator_default;
var init_validator = __esm({
  "../node_modules/axios/lib/helpers/validator.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_data();
    init_AxiosError();
    validators = {};
    ["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
      validators[type] = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function validator(thing) {
        return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
      }, "validator"), "validator");
    });
    deprecatedWarnings = {};
    validators.transitional = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
      }
      __name(formatMessage, "formatMessage");
      __name2(formatMessage, "formatMessage");
      return (value, opt, opts) => {
        if (validator === false) {
          throw new AxiosError_default(
            formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
            AxiosError_default.ERR_DEPRECATED
          );
        }
        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          console.warn(
            formatMessage(
              opt,
              " has been deprecated since v" + version + " and will be removed in the near future"
            )
          );
        }
        return validator ? validator(value, opt, opts) : true;
      };
    }, "transitional"), "transitional");
    validators.spelling = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function spelling(correctSpelling) {
      return (value, opt) => {
        console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
        return true;
      };
    }, "spelling"), "spelling");
    __name2(assertOptions, "assertOptions");
    validator_default = {
      assertOptions,
      validators
    };
  }
});
var validators2;
var Axios;
var Axios_default;
var init_Axios = __esm({
  "../node_modules/axios/lib/core/Axios.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_buildURL();
    init_InterceptorManager();
    init_dispatchRequest();
    init_mergeConfig();
    init_buildFullPath();
    init_validator();
    init_AxiosHeaders();
    validators2 = validator_default.validators;
    Axios = class {
      static {
        __name(this, "Axios");
      }
      static {
        __name2(this, "Axios");
      }
      constructor(instanceConfig) {
        this.defaults = instanceConfig || {};
        this.interceptors = {
          request: new InterceptorManager_default(),
          response: new InterceptorManager_default()
        };
      }
      /**
       * Dispatch a request
       *
       * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
       * @param {?Object} config
       *
       * @returns {Promise} The Promise to be fulfilled
       */
      async request(configOrUrl, config) {
        try {
          return await this._request(configOrUrl, config);
        } catch (err) {
          if (err instanceof Error) {
            let dummy = {};
            Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
            const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
            try {
              if (!err.stack) {
                err.stack = stack;
              } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
                err.stack += "\n" + stack;
              }
            } catch (e) {
            }
          }
          throw err;
        }
      }
      _request(configOrUrl, config) {
        if (typeof configOrUrl === "string") {
          config = config || {};
          config.url = configOrUrl;
        } else {
          config = configOrUrl || {};
        }
        config = mergeConfig(this.defaults, config);
        const { transitional: transitional2, paramsSerializer, headers } = config;
        if (transitional2 !== void 0) {
          validator_default.assertOptions(transitional2, {
            silentJSONParsing: validators2.transitional(validators2.boolean),
            forcedJSONParsing: validators2.transitional(validators2.boolean),
            clarifyTimeoutError: validators2.transitional(validators2.boolean)
          }, false);
        }
        if (paramsSerializer != null) {
          if (utils_default.isFunction(paramsSerializer)) {
            config.paramsSerializer = {
              serialize: paramsSerializer
            };
          } else {
            validator_default.assertOptions(paramsSerializer, {
              encode: validators2.function,
              serialize: validators2.function
            }, true);
          }
        }
        if (config.allowAbsoluteUrls !== void 0) {
        } else if (this.defaults.allowAbsoluteUrls !== void 0) {
          config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
        } else {
          config.allowAbsoluteUrls = true;
        }
        validator_default.assertOptions(config, {
          baseUrl: validators2.spelling("baseURL"),
          withXsrfToken: validators2.spelling("withXSRFToken")
        }, true);
        config.method = (config.method || this.defaults.method || "get").toLowerCase();
        let contextHeaders = headers && utils_default.merge(
          headers.common,
          headers[config.method]
        );
        headers && utils_default.forEach(
          ["delete", "get", "head", "post", "put", "patch", "common"],
          (method) => {
            delete headers[method];
          }
        );
        config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
        const requestInterceptorChain = [];
        let synchronousRequestInterceptors = true;
        this.interceptors.request.forEach(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function unshiftRequestInterceptors(interceptor) {
          if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
            return;
          }
          synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
          requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
        }, "unshiftRequestInterceptors"), "unshiftRequestInterceptors"));
        const responseInterceptorChain = [];
        this.interceptors.response.forEach(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function pushResponseInterceptors(interceptor) {
          responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
        }, "pushResponseInterceptors"), "pushResponseInterceptors"));
        let promise;
        let i = 0;
        let len;
        if (!synchronousRequestInterceptors) {
          const chain = [dispatchRequest.bind(this), void 0];
          chain.unshift(...requestInterceptorChain);
          chain.push(...responseInterceptorChain);
          len = chain.length;
          promise = Promise.resolve(config);
          while (i < len) {
            promise = promise.then(chain[i++], chain[i++]);
          }
          return promise;
        }
        len = requestInterceptorChain.length;
        let newConfig = config;
        i = 0;
        while (i < len) {
          const onFulfilled = requestInterceptorChain[i++];
          const onRejected = requestInterceptorChain[i++];
          try {
            newConfig = onFulfilled(newConfig);
          } catch (error) {
            onRejected.call(this, error);
            break;
          }
        }
        try {
          promise = dispatchRequest.call(this, newConfig);
        } catch (error) {
          return Promise.reject(error);
        }
        i = 0;
        len = responseInterceptorChain.length;
        while (i < len) {
          promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
        }
        return promise;
      }
      getUri(config) {
        config = mergeConfig(this.defaults, config);
        const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        return buildURL(fullPath, config.params, config.paramsSerializer);
      }
    };
    utils_default.forEach(["delete", "get", "head", "options"], /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data
        }));
      };
    }, "forEachMethodNoData"), "forEachMethodNoData"));
    utils_default.forEach(["post", "put", "patch"], /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function forEachMethodWithData(method) {
      function generateHTTPMethod(isForm) {
        return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function httpMethod(url, data, config) {
          return this.request(mergeConfig(config || {}, {
            method,
            headers: isForm ? {
              "Content-Type": "multipart/form-data"
            } : {},
            url,
            data
          }));
        }, "httpMethod"), "httpMethod");
      }
      __name(generateHTTPMethod, "generateHTTPMethod");
      __name2(generateHTTPMethod, "generateHTTPMethod");
      Axios.prototype[method] = generateHTTPMethod();
      Axios.prototype[method + "Form"] = generateHTTPMethod(true);
    }, "forEachMethodWithData"), "forEachMethodWithData"));
    Axios_default = Axios;
  }
});
var CancelToken;
var CancelToken_default;
var init_CancelToken = __esm({
  "../node_modules/axios/lib/cancel/CancelToken.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_CanceledError();
    CancelToken = class _CancelToken {
      static {
        __name(this, "_CancelToken");
      }
      static {
        __name2(this, "CancelToken");
      }
      constructor(executor) {
        if (typeof executor !== "function") {
          throw new TypeError("executor must be a function.");
        }
        let resolvePromise;
        this.promise = new Promise(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function promiseExecutor(resolve) {
          resolvePromise = resolve;
        }, "promiseExecutor"), "promiseExecutor"));
        const token = this;
        this.promise.then((cancel) => {
          if (!token._listeners) return;
          let i = token._listeners.length;
          while (i-- > 0) {
            token._listeners[i](cancel);
          }
          token._listeners = null;
        });
        this.promise.then = (onfulfilled) => {
          let _resolve;
          const promise = new Promise((resolve) => {
            token.subscribe(resolve);
            _resolve = resolve;
          }).then(onfulfilled);
          promise.cancel = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function reject() {
            token.unsubscribe(_resolve);
          }, "reject"), "reject");
          return promise;
        };
        executor(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function cancel(message, config, request) {
          if (token.reason) {
            return;
          }
          token.reason = new CanceledError_default(message, config, request);
          resolvePromise(token.reason);
        }, "cancel"), "cancel"));
      }
      /**
       * Throws a `CanceledError` if cancellation has been requested.
       */
      throwIfRequested() {
        if (this.reason) {
          throw this.reason;
        }
      }
      /**
       * Subscribe to the cancel signal
       */
      subscribe(listener) {
        if (this.reason) {
          listener(this.reason);
          return;
        }
        if (this._listeners) {
          this._listeners.push(listener);
        } else {
          this._listeners = [listener];
        }
      }
      /**
       * Unsubscribe from the cancel signal
       */
      unsubscribe(listener) {
        if (!this._listeners) {
          return;
        }
        const index = this._listeners.indexOf(listener);
        if (index !== -1) {
          this._listeners.splice(index, 1);
        }
      }
      toAbortSignal() {
        const controller = new AbortController();
        const abort = /* @__PURE__ */ __name2((err) => {
          controller.abort(err);
        }, "abort");
        this.subscribe(abort);
        controller.signal.unsubscribe = () => this.unsubscribe(abort);
        return controller.signal;
      }
      /**
       * Returns an object that contains a new `CancelToken` and a function that, when called,
       * cancels the `CancelToken`.
       */
      static source() {
        let cancel;
        const token = new _CancelToken(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function executor(c) {
          cancel = c;
        }, "executor"), "executor"));
        return {
          token,
          cancel
        };
      }
    };
    CancelToken_default = CancelToken;
  }
});
function spread(callback) {
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function wrap(arr) {
    return callback.apply(null, arr);
  }, "wrap"), "wrap");
}
__name(spread, "spread");
var init_spread = __esm({
  "../node_modules/axios/lib/helpers/spread.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    __name2(spread, "spread");
  }
});
function isAxiosError(payload) {
  return utils_default.isObject(payload) && payload.isAxiosError === true;
}
__name(isAxiosError, "isAxiosError");
var init_isAxiosError = __esm({
  "../node_modules/axios/lib/helpers/isAxiosError.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    __name2(isAxiosError, "isAxiosError");
  }
});
var HttpStatusCode;
var HttpStatusCode_default;
var init_HttpStatusCode = __esm({
  "../node_modules/axios/lib/helpers/HttpStatusCode.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    HttpStatusCode = {
      Continue: 100,
      SwitchingProtocols: 101,
      Processing: 102,
      EarlyHints: 103,
      Ok: 200,
      Created: 201,
      Accepted: 202,
      NonAuthoritativeInformation: 203,
      NoContent: 204,
      ResetContent: 205,
      PartialContent: 206,
      MultiStatus: 207,
      AlreadyReported: 208,
      ImUsed: 226,
      MultipleChoices: 300,
      MovedPermanently: 301,
      Found: 302,
      SeeOther: 303,
      NotModified: 304,
      UseProxy: 305,
      Unused: 306,
      TemporaryRedirect: 307,
      PermanentRedirect: 308,
      BadRequest: 400,
      Unauthorized: 401,
      PaymentRequired: 402,
      Forbidden: 403,
      NotFound: 404,
      MethodNotAllowed: 405,
      NotAcceptable: 406,
      ProxyAuthenticationRequired: 407,
      RequestTimeout: 408,
      Conflict: 409,
      Gone: 410,
      LengthRequired: 411,
      PreconditionFailed: 412,
      PayloadTooLarge: 413,
      UriTooLong: 414,
      UnsupportedMediaType: 415,
      RangeNotSatisfiable: 416,
      ExpectationFailed: 417,
      ImATeapot: 418,
      MisdirectedRequest: 421,
      UnprocessableEntity: 422,
      Locked: 423,
      FailedDependency: 424,
      TooEarly: 425,
      UpgradeRequired: 426,
      PreconditionRequired: 428,
      TooManyRequests: 429,
      RequestHeaderFieldsTooLarge: 431,
      UnavailableForLegalReasons: 451,
      InternalServerError: 500,
      NotImplemented: 501,
      BadGateway: 502,
      ServiceUnavailable: 503,
      GatewayTimeout: 504,
      HttpVersionNotSupported: 505,
      VariantAlsoNegotiates: 506,
      InsufficientStorage: 507,
      LoopDetected: 508,
      NotExtended: 510,
      NetworkAuthenticationRequired: 511
    };
    Object.entries(HttpStatusCode).forEach(([key, value]) => {
      HttpStatusCode[value] = key;
    });
    HttpStatusCode_default = HttpStatusCode;
  }
});
function createInstance(defaultConfig) {
  const context = new Axios_default(defaultConfig);
  const instance = bind(Axios_default.prototype.request, context);
  utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
  utils_default.extend(instance, context, null, { allOwnKeys: true });
  instance.create = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  }, "create"), "create");
  return instance;
}
__name(createInstance, "createInstance");
var axios;
var axios_default;
var init_axios = __esm({
  "../node_modules/axios/lib/axios.js"() {
    "use strict";
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_utils();
    init_bind();
    init_Axios();
    init_mergeConfig();
    init_defaults();
    init_formDataToJSON();
    init_CanceledError();
    init_CancelToken();
    init_isCancel();
    init_data();
    init_toFormData();
    init_AxiosError();
    init_spread();
    init_isAxiosError();
    init_AxiosHeaders();
    init_adapters();
    init_HttpStatusCode();
    __name2(createInstance, "createInstance");
    axios = createInstance(defaults_default);
    axios.Axios = Axios_default;
    axios.CanceledError = CanceledError_default;
    axios.CancelToken = CancelToken_default;
    axios.isCancel = isCancel;
    axios.VERSION = VERSION;
    axios.toFormData = toFormData_default;
    axios.AxiosError = AxiosError_default;
    axios.Cancel = axios.CanceledError;
    axios.all = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function all(promises) {
      return Promise.all(promises);
    }, "all"), "all");
    axios.spread = spread;
    axios.isAxiosError = isAxiosError;
    axios.mergeConfig = mergeConfig;
    axios.AxiosHeaders = AxiosHeaders_default;
    axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
    axios.getAdapter = adapters_default.getAdapter;
    axios.HttpStatusCode = HttpStatusCode_default;
    axios.default = axios;
    axios_default = axios;
  }
});
var Axios2;
var AxiosError2;
var CanceledError2;
var isCancel2;
var CancelToken2;
var VERSION2;
var all2;
var Cancel;
var isAxiosError2;
var spread2;
var toFormData2;
var AxiosHeaders2;
var HttpStatusCode2;
var formToJSON;
var getAdapter;
var mergeConfig2;
var init_axios2 = __esm({
  "../node_modules/axios/index.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_axios();
    ({
      Axios: Axios2,
      AxiosError: AxiosError2,
      CanceledError: CanceledError2,
      isCancel: isCancel2,
      CancelToken: CancelToken2,
      VERSION: VERSION2,
      all: all2,
      Cancel,
      isAxiosError: isAxiosError2,
      spread: spread2,
      toFormData: toFormData2,
      AxiosHeaders: AxiosHeaders2,
      HttpStatusCode: HttpStatusCode2,
      formToJSON,
      getAdapter,
      mergeConfig: mergeConfig2
    } = axios_default);
  }
});
var VM_URL;
var init_config = __esm({
  "../node_modules/vm-sdk/dist/config.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    VM_URL = "https://vmprev.adaseal.eu";
  }
});
var apiToken;
var setApiToken;
var GET_FROM_VM;
var init_requests = __esm({
  "../node_modules/vm-sdk/dist/utils/requests.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_axios2();
    init_config();
    apiToken = "";
    setApiToken = /* @__PURE__ */ __name2((token) => {
      apiToken = token;
    }, "setApiToken");
    GET_FROM_VM = class {
      static {
        __name(this, "GET_FROM_VM");
      }
      static {
        __name2(this, "GET_FROM_VM");
      }
      constructor(baseUrl = VM_URL) {
        this.baseUrl = baseUrl;
        this.apiToken = apiToken;
      }
      async get(action, options) {
        if (!this.apiToken) {
          throw new Error("API token is not set. Use setApiToken() to set your token.");
        }
        try {
          const queryParams = new URLSearchParams({
            action
          });
          if (options) {
            Object.entries(options).forEach(([key, value]) => {
              if (value !== void 0 && value !== null) {
                if (typeof value === "boolean") {
                  queryParams.append(key, value.toString());
                } else {
                  queryParams.append(key, String(value));
                }
              }
            });
          }
          const url = `${this.baseUrl}/api.php?${queryParams.toString()}`;
          const response = await axios_default.get(url, {
            headers: { "X-API-Token": this.apiToken }
          });
          return response.data;
        } catch (error) {
          console.error("Error fetching data:", error);
          throw new Error("Failed to fetch data from VM.");
        }
      }
    };
  }
});
var AppError;
var handleError;
var getDefaultMessage;
var init_errorHandler = __esm({
  "../node_modules/vm-sdk/dist/utils/errorHandler.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    AppError = class extends Error {
      static {
        __name(this, "AppError");
      }
      static {
        __name2(this, "AppError");
      }
      constructor(message, status = 500, code, data) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.code = code;
        this.data = data;
      }
    };
    handleError = /* @__PURE__ */ __name2((error) => {
      var _a, _b, _c;
      if (error instanceof AppError) {
        return {
          status: error.status,
          message: error.message,
          code: error.code,
          data: error.data
        };
      }
      if ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) {
        return {
          status: error.response.status,
          message: ((_b = error.response.data) === null || _b === void 0 ? void 0 : _b.message) || getDefaultMessage(error.response.status),
          code: (_c = error.response.data) === null || _c === void 0 ? void 0 : _c.code,
          data: error.response.data
        };
      }
      if (error === null || error === void 0 ? void 0 : error.request) {
        return {
          status: 0,
          message: "Network error",
          code: "NETWORK_ERROR",
          data: { originalError: error.message }
        };
      }
      return {
        status: 500,
        message: "Internal SDK error",
        code: "UNKNOWN_ERROR",
        data: { originalError: error === null || error === void 0 ? void 0 : error.message }
      };
    }, "handleError");
    getDefaultMessage = /* @__PURE__ */ __name2((status) => {
      switch (status) {
        case 400:
          return "Bad request";
        case 401:
          return "Unauthorized access";
        case 403:
          return "Forbidden";
        case 404:
          return "Resource not found";
        default:
          return "Something went wrong";
      }
    }, "getDefaultMessage");
  }
});
async function getVersion() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_version");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getVersion, "getVersion");
var init_getVersion = __esm({
  "../node_modules/vm-sdk/dist/api/getVersion.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getVersion, "getVersion");
  }
});
async function getHealth() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("health");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getHealth, "getHealth");
var init_getHealth = __esm({
  "../node_modules/vm-sdk/dist/api/getHealth.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getHealth, "getHealth");
  }
});
async function isAuthenticated() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("is_authenticated");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(isAuthenticated, "isAuthenticated");
var init_getAuthentication = __esm({
  "../node_modules/vm-sdk/dist/api/getAuthentication.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(isAuthenticated, "isAuthenticated");
  }
});
async function getTokens() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_tokens");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getTokens, "getTokens");
var init_getTokens = __esm({
  "../node_modules/vm-sdk/dist/api/getTokens.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getTokens, "getTokens");
  }
});
async function getPools() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_pools");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getPools, "getPools");
var init_getPools = __esm({
  "../node_modules/vm-sdk/dist/api/getPools.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getPools, "getPools");
  }
});
async function getDistributions() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_distributions");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getDistributions, "getDistributions");
var init_getDistributions = __esm({
  "../node_modules/vm-sdk/dist/api/getDistributions.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getDistributions, "getDistributions");
  }
});
async function getSanitizedAddress(address) {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("sanitize_address", { address });
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getSanitizedAddress, "getSanitizedAddress");
var init_getSanitizedAddress = __esm({
  "../node_modules/vm-sdk/dist/api/getSanitizedAddress.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getSanitizedAddress, "getSanitizedAddress");
  }
});
async function getRewardBreakdown(staking_address) {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_reward_breakdown", { staking_address });
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getRewardBreakdown, "getRewardBreakdown");
var init_getRewardBreakdown = __esm({
  "../node_modules/vm-sdk/dist/api/getRewardBreakdown.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getRewardBreakdown, "getRewardBreakdown");
  }
});
async function getRewards(staking_address) {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_rewards", { staking_address });
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getRewards, "getRewards");
var init_getRewards = __esm({
  "../node_modules/vm-sdk/dist/api/getRewards.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getRewards, "getRewards");
  }
});
async function getBlacklist() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_blacklist");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getBlacklist, "getBlacklist");
var init_getBlacklist = __esm({
  "../node_modules/vm-sdk/dist/api/getBlacklist.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getBlacklist, "getBlacklist");
  }
});
async function getWhitelist() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_whitelist");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getWhitelist, "getWhitelist");
var init_getWhitelist = __esm({
  "../node_modules/vm-sdk/dist/api/getWhitelist.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getWhitelist, "getWhitelist");
  }
});
async function getSystemInfo() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("system_info");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getSystemInfo, "getSystemInfo");
var init_getSystemInfo = __esm({
  "../node_modules/vm-sdk/dist/api/getSystemInfo.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getSystemInfo, "getSystemInfo");
  }
});
async function getStatistics() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_statistics");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getStatistics, "getStatistics");
var init_getStatistics = __esm({
  "../node_modules/vm-sdk/dist/api/getStatistics.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getStatistics, "getStatistics");
  }
});
async function getTx(input) {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_tx", { txid: input.txid });
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getTx, "getTx");
var init_getTx = __esm({
  "../node_modules/vm-sdk/dist/api/getTx.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getTx, "getTx");
  }
});
async function getPendingTxCount() {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("get_pending_tx_count");
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getPendingTxCount, "getPendingTxCount");
var init_getPendingTxCount = __esm({
  "../node_modules/vm-sdk/dist/api/getPendingTxCount.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getPendingTxCount, "getPendingTxCount");
  }
});
async function getEstimateFees(token_count) {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("estimate_fees", { token_count });
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getEstimateFees, "getEstimateFees");
var init_getEstimateFees = __esm({
  "../node_modules/vm-sdk/dist/api/getEstimateFees.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getEstimateFees, "getEstimateFees");
  }
});
async function getCustomRequest(input) {
  try {
    const vmClient = new GET_FROM_VM();
    const response = await vmClient.get("custom_request", input);
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getCustomRequest, "getCustomRequest");
var init_getCustomRequest = __esm({
  "../node_modules/vm-sdk/dist/api/getCustomRequest.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getCustomRequest, "getCustomRequest");
  }
});
async function getDeliveredRewards(input) {
  try {
    const vmClient = new GET_FROM_VM();
    const params = { staking_address: input.staking_address };
    if (input.token_id) {
      params.token_id = input.token_id;
    }
    const response = await vmClient.get("delivered_rewards", params);
    return response;
  } catch (error) {
    const errorResponse = handleError(error);
    throw new AppError(errorResponse.message, errorResponse.status, errorResponse.code, errorResponse.data);
  }
}
__name(getDeliveredRewards, "getDeliveredRewards");
var init_getDeliveredRewards = __esm({
  "../node_modules/vm-sdk/dist/api/getDeliveredRewards.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_requests();
    init_errorHandler();
    __name2(getDeliveredRewards, "getDeliveredRewards");
  }
});
var dist_exports = {};
__export(dist_exports, {
  GET_FROM_VM: /* @__PURE__ */ __name(() => GET_FROM_VM, "GET_FROM_VM"),
  getBlacklist: /* @__PURE__ */ __name(() => getBlacklist, "getBlacklist"),
  getCustomRequest: /* @__PURE__ */ __name(() => getCustomRequest, "getCustomRequest"),
  getDeliveredRewards: /* @__PURE__ */ __name(() => getDeliveredRewards, "getDeliveredRewards"),
  getDistributions: /* @__PURE__ */ __name(() => getDistributions, "getDistributions"),
  getEstimateFees: /* @__PURE__ */ __name(() => getEstimateFees, "getEstimateFees"),
  getHealth: /* @__PURE__ */ __name(() => getHealth, "getHealth"),
  getPendingTxCount: /* @__PURE__ */ __name(() => getPendingTxCount, "getPendingTxCount"),
  getPools: /* @__PURE__ */ __name(() => getPools, "getPools"),
  getRewardBreakdown: /* @__PURE__ */ __name(() => getRewardBreakdown, "getRewardBreakdown"),
  getRewards: /* @__PURE__ */ __name(() => getRewards, "getRewards"),
  getSanitizedAddress: /* @__PURE__ */ __name(() => getSanitizedAddress, "getSanitizedAddress"),
  getStatistics: /* @__PURE__ */ __name(() => getStatistics, "getStatistics"),
  getSystemInfo: /* @__PURE__ */ __name(() => getSystemInfo, "getSystemInfo"),
  getTokens: /* @__PURE__ */ __name(() => getTokens, "getTokens"),
  getTx: /* @__PURE__ */ __name(() => getTx, "getTx"),
  getVersion: /* @__PURE__ */ __name(() => getVersion, "getVersion"),
  getWhitelist: /* @__PURE__ */ __name(() => getWhitelist, "getWhitelist"),
  isAuthenticated: /* @__PURE__ */ __name(() => isAuthenticated, "isAuthenticated"),
  setApiToken: /* @__PURE__ */ __name(() => setApiToken, "setApiToken")
});
var init_dist = __esm({
  "../node_modules/vm-sdk/dist/index.js"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    init_getVersion();
    init_getHealth();
    init_getAuthentication();
    init_getTokens();
    init_getPools();
    init_getDistributions();
    init_getSanitizedAddress();
    init_getRewardBreakdown();
    init_getRewards();
    init_getBlacklist();
    init_getWhitelist();
    init_getSystemInfo();
    init_getStatistics();
    init_getTx();
    init_getPendingTxCount();
    init_getEstimateFees();
    init_getCustomRequest();
    init_getDeliveredRewards();
    init_getPendingTxCount();
    init_getEstimateFees();
    init_getCustomRequest();
    init_requests();
  }
});
var onRequestGet;
var init_getRewards2 = __esm({
  "api/getRewards.ts"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    onRequestGet = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      const url = new URL(request.url);
      const stakeAddress = url.searchParams.get("walletId");
      console.log("getRewards called with stakeAddress:", stakeAddress);
      console.log("API Key exists:", !!env.VITE_VM_API_KEY);
      console.log("API Key length:", env.VITE_VM_API_KEY?.length);
      if (!stakeAddress) {
        return new Response(
          JSON.stringify({ error: "stakeAddress is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!env.VITE_VM_API_KEY) {
        return new Response(
          JSON.stringify({ error: "API key not available in environment" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      try {
        const { getRewards: getRewards2, setApiToken: setApiToken2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
        setApiToken2(env.VITE_VM_API_KEY);
        console.log("About to call getRewards with stakeAddress:", stakeAddress);
        const rewards = await getRewards2(stakeAddress);
        console.log("getRewards completed successfully");
        return new Response(
          JSON.stringify({ rewards }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET",
              "Access-Control-Allow-Headers": "Content-Type"
            }
          }
        );
      } catch (error) {
        console.error("Full error object:", error);
        console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        return new Response(
          JSON.stringify({
            error: `Failed to process request: ${error instanceof Error ? error.message : "Unknown error"}`,
            fullError: error instanceof Error ? error.stack : "No stack trace"
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }, "onRequestGet");
  }
});
var onRequestPost;
var onRequestGet2;
var init_profileData = __esm({
  "api/profileData.ts"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    onRequestPost = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      if (request.headers.get("Content-Type") !== "application/json") {
        return new Response(
          JSON.stringify({ error: "Request body must be JSON" }),
          { status: 415, headers: { "Content-Type": "application/json" } }
        );
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const { walletId, value } = body;
      if (!walletId) {
        return new Response(
          JSON.stringify({ error: "Missing walletId" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      try {
        await env.VM_WEB_PROFILES.put(walletId, JSON.stringify(value));
        return new Response(
          JSON.stringify({ success: true, walletId }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("KV PUT Error:", err);
        return new Response(
          JSON.stringify({ error: "Error storing data" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }, "onRequestPost");
    onRequestGet2 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      const url = new URL(request.url);
      const walletId = url.searchParams.get("walletId");
      if (!walletId) {
        return new Response(
          JSON.stringify({ error: "walletId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      try {
        const stored = await env.VM_WEB_PROFILES.get(walletId, { type: "json" });
        if (stored === null) {
          return new Response(
            JSON.stringify({ error: "Not found", walletId }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ walletId, value: stored }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("KV GET Error:", err);
        return new Response(
          JSON.stringify({ error: "Error fetching data" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }, "onRequestGet");
  }
});
var onRequestGet3;
var init_sanitizeAddress = __esm({
  "api/sanitizeAddress.ts"() {
    init_functionsRoutes_0_5653304564625372();
    init_strip_cf_connecting_ip_header();
    onRequestGet3 = /* @__PURE__ */ __name2(async (context) => {
      const { request, env } = context;
      const url = new URL(request.url);
      const walletAddress = url.searchParams.get("address");
      console.log("sanitizeAddress called with address:", walletAddress);
      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: "address is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      try {
        const { getSanitizedAddress: getSanitizedAddress2, setApiToken: setApiToken2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
        setApiToken2(env.VITE_VM_API_KEY);
        const response = await getSanitizedAddress2(walletAddress);
        return new Response(
          JSON.stringify({ address: response.address }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET",
              "Access-Control-Allow-Headers": "Content-Type"
            }
          }
        );
      } catch (error) {
        console.error("Error:", error);
        return new Response(
          JSON.stringify({ error: `Failed to sanitize address: ${error instanceof Error ? error.message : "Unknown error"}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }, "onRequestGet");
  }
});
var routes;
var init_functionsRoutes_0_5653304564625372 = __esm({
  "../.wrangler/tmp/pages-N9uAjv/functionsRoutes-0.5653304564625372.mjs"() {
    init_getRewards2();
    init_profileData();
    init_profileData();
    init_sanitizeAddress();
    routes = [
      {
        routePath: "/api/getRewards",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet]
      },
      {
        routePath: "/api/profileData",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet2]
      },
      {
        routePath: "/api/profileData",
        mountPath: "/api",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost]
      },
      {
        routePath: "/api/sanitizeAddress",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet3]
      }
    ];
  }
});
init_functionsRoutes_0_5653304564625372();
init_strip_cf_connecting_ip_header();
init_functionsRoutes_0_5653304564625372();
init_strip_cf_connecting_ip_header();
init_functionsRoutes_0_5653304564625372();
init_strip_cf_connecting_ip_header();
init_functionsRoutes_0_5653304564625372();
init_strip_cf_connecting_ip_header();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode3 = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith2 = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith2), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode3(token));
    } else {
      var prefix = escapeString(encode3(token.prefix));
      var suffix = escapeString(encode3(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
init_functionsRoutes_0_5653304564625372();
init_strip_cf_connecting_ip_header();
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
init_functionsRoutes_0_5653304564625372();
init_strip_cf_connecting_ip_header();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
init_functionsRoutes_0_5653304564625372();
init_strip_cf_connecting_ip_header();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../../../.nvm/versions/node/v22.13.1/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../../../.nvm/versions/node/v22.13.1/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-WbCvF8/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../../../.nvm/versions/node/v22.13.1/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-WbCvF8/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.35166215508500387.js.map
