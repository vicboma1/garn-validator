"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.isConstructor=isConstructor;exports.notIsRegExp=exports.isRegExp=exports.stringToRegExp=exports.checkRegExp=exports.stringify=exports.isRequiredKey=exports.isOptionalKey=exports.optionalRegex=exports.isPrimitive=exports.whatTypeIs=exports.isInvalidType=exports.isCustomValidator=exports.isFunctionHacked=exports.isClass=exports.checkConstructor=exports.isNullish=exports.configurationSymbol=exports.validatorSymbol=void 0;require("./polyfills.js");var _constants=require("./constants.js");const isProxy=Proxy.isProxy;const validatorSymbol=Symbol("validator mark");exports.validatorSymbol=validatorSymbol;const configurationSymbol=Symbol("rewrite configuration");exports.configurationSymbol=configurationSymbol;const isMainValidator=type=>type&&!!type[validatorSymbol];const isNullish=val=>val===undefined||val===null;exports.isNullish=isNullish;const checkConstructor=(type,val)=>!isNullish(val)&&val.constructor===type||Proxy===type&&isProxy(val);exports.checkConstructor=checkConstructor;const isClass=fn=>typeof fn==="function"&&/^\bclass(?!\$)\b/.test(fn.toString())&&!isFunctionHacked(fn);exports.isClass=isClass;const isFunctionHacked=fn=>typeof fn==="function"&&fn.toString.toString()!=="function toString() { [native code] }";exports.isFunctionHacked=isFunctionHacked;const isCustomValidator=fn=>checkConstructor(Function,fn)&&!isInvalidType(fn)&&!isClass(fn)&&!isConstructor(fn);exports.isCustomValidator=isCustomValidator;const isInvalidType=fn=>checkConstructor(_constants.AsyncFunction,fn)||checkConstructor(_constants.GeneratorFunction,fn);exports.isInvalidType=isInvalidType;function isConstructor(f){if(!f)return false;if(typeof f!=="function")return false;if(!f.name)return false;if(isClass(f))return true;return _constants.constructors.some(c=>c===f)}const whatTypeIs=type=>{if(checkConstructor(Object,type))return"schema";if(isPrimitive(type))return"primitive";if(Array.isArray(type))return"enum";if(checkConstructor(RegExp,type))return"regex";if(isConstructor(type))return"constructor";if(isMainValidator(type))return"main-validator";if(isCustomValidator(type))return"validator";return"invalid"};exports.whatTypeIs=whatTypeIs;const isPrimitive=value=>Object(value)!==value||value.constructor===Number||value.constructor===String;exports.isPrimitive=isPrimitive;const addStripMark=str=>`__strip__${str}__strip__`;const parser=()=>{const seen=new WeakMap;return(key,value)=>{if(typeof value==="object"&&value!==null){if(seen.has(value)){const oldKey=seen.get(value);return`[circular reference] -> ${oldKey||"rootObject"}`}seen.set(value,key)}if(typeof value==="function"&&value[validatorSymbol]){return addStripMark(value.name)}if(typeof value==="function"&&isConstructor(value)){return addStripMark(value.name)}if(typeof value==="function"){return addStripMark(value.toString())}if(checkConstructor(RegExp,value)){return addStripMark(value.toString())}return value}};const optionalRegex=/[?$]$/;exports.optionalRegex=optionalRegex;const isOptionalKey=key=>optionalRegex.test(key);exports.isOptionalKey=isOptionalKey;const isRequiredKey=key=>notIsRegExp(key)&&!isOptionalKey(key);exports.isRequiredKey=isRequiredKey;const stringify=val=>{let str=JSON.stringify(val,parser());return str&&str.replace(/("__strip__)|(__strip__")/g,"")};exports.stringify=stringify;const checkRegExp=(regExp,value)=>regExp.test(value);exports.checkRegExp=checkRegExp;const stringToRegExp=string=>new RegExp(eval(string));exports.stringToRegExp=stringToRegExp;const isRegExp=value=>value&&/^\/.+\/$/.test(value);exports.isRegExp=isRegExp;const notIsRegExp=value=>!isRegExp(value);exports.notIsRegExp=notIsRegExp;