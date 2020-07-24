"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.isConstructor=isConstructor;exports.isError=exports.notIsRegExp=exports.isRegExp=exports.stringToRegExp=exports.checkRegExp=exports.stringify=exports.isPrimitive=exports.isInstanceOf=exports.isNormalFunction=exports.isType=void 0;const isType=type=>val=>![undefined,null].includes(val)&&val.constructor===type;exports.isType=isType;const isNormalFunction=f=>f&&typeof f==="function"&&(!f.name||f.name[0]===f.name[0].toLowerCase());exports.isNormalFunction=isNormalFunction;function isConstructor(f){if(isNormalFunction(f))return false;if(f&&f.name==="Symbol")return true;try{new f;return true}catch(err){return false}}const isInstanceOf=type=>val=>val instanceof type;exports.isInstanceOf=isInstanceOf;const isPrimitive=value=>!isInstanceOf(Object)(value);exports.isPrimitive=isPrimitive;const parser=()=>{const seen=new WeakMap;return(key,value)=>{if(typeof value==="object"&&value!==null){if(seen.has(value)){const oldKey=seen.get(value);return`[circular reference] -> ${oldKey||"rootObject"}`}seen.set(value,key)}if(typeof value==="function"){return value.toString()}return value}};const stringify=val=>JSON.stringify(val,parser());exports.stringify=stringify;const checkRegExp=(regExp,value)=>regExp.test(value);exports.checkRegExp=checkRegExp;const stringToRegExp=string=>new RegExp(eval(string));exports.stringToRegExp=stringToRegExp;const isRegExp=value=>value&&/^\/.+\/$/.test(value);exports.isRegExp=isRegExp;const notIsRegExp=value=>!isRegExp(value);exports.notIsRegExp=notIsRegExp;const isError=e=>e instanceof Error;exports.isError=isError;