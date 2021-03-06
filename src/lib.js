import {
  stringToRegExp,
  checkConstructor,
  isRegExp,
  checkRegExp,
  stringify,
  isRequiredKey,
  isOptionalKey,
  optionalRegex,
  isNullish,
  whatTypeIs,
  validatorSymbol,
  configurationSymbol,
  deepClone,
} from "./helpers.js";

import {
  TypeValidationError,
  SerieValidationError,
  EnumValidationError,
  SchemaValidationError,
  CastError,
} from "./constructors.js";

const onValidDefault = (val) => val;
const onInvalidDefault = (error) => {
  throw error;
};

const logErrorsAndReturnFalse = (error) => {
  if (error instanceof AggregateError) {
    console.group(error.name + ":", error.message);
    error.errors.forEach(logErrorsAndReturnFalse);
    console.groupEnd(error.name + ":");
  } else {
    console.error((error && error.message) || error);
  }
  return false;
};

const formatErrorMessage = (data) => {
  const { type, value, path, kind } = data;
  let _value = stringify(value);
  let _type = stringify(type);
  let _kind = kind || whatTypeIs(type);
  let _path = path.length ? `At path /${path.join("/")} ` : "";
  let _typeString = kind === "serie" ? _type.replace(/[\[\]]/g, "") : _type;

  return `${_path}${_value} do not match ${_kind} ${_typeString}`;
};

const createError = (data) => {
  data.$Error = data.$Error || TypeValidationError;
  data.path = data.path || [];
  data.message = formatErrorMessage(data);
  return new data.$Error(data.message, data);
};

const createAggregateError = (errors, data) => {
  data.$Error = data.$Error;
  data.path = data.path || [];
  data.message = formatErrorMessage(data);
  return new data.$Error(errors, data.message, data);
};
const throwError = (data) => {
  throw createError(data);
};
const throwErrors = (errors, data) => {
  if (errors.length === 1) throw errors[0];
  throw createAggregateError(errors, data);
};

const mapError = (error, data) => {
  if (!error.raw) return error;
  data.path = data.path || [];
  const overriddenPath = {
    ...error.raw,
    path: [...data.path, ...error.raw.path],
    $Error: error.constructor,
  };

  if (error instanceof AggregateError) {
    const errors = error.errors.map((e) => mapError(e, data));
    return createAggregateError(errors, overriddenPath);
  } else {
    return createError(overriddenPath);
  }
};

const reThrowError = (error, data) => {
  throw mapError(error, data);
};

const truthyOrThrow = (input, data) => {
  if (input) return input;
  throwError(data);
};

const updateRef = (ref, key, value) => {
  try {
    ref[key] = value;
  } catch {
    // key not configurable
  }
};

const validSchemaOrThrow = (data) => {
  const {
    behavior,
    type: schema,
    value: object,
    root = object,
    path = [],
  } = data;
  if (!(object instanceof Object || typeof object === "string")) {
    return throwError(data);
  }
  const mustUpdateRef = behavior.name === "mustBe";
  let clonedObject = object;
  if (mustUpdateRef) {
    clonedObject = deepClone(object);
  }
  let requiredErrors = [];
  const requiredKeys = Object.keys(schema).filter(isRequiredKey);
  for (const keyName of requiredKeys) {
    try {
      let newValue = validTypeOrThrow({
        behavior,
        type: schema[keyName],
        value: clonedObject[keyName],
        root,
        keyName,
        path: [...path, keyName],
      });
      mustUpdateRef && updateRef(clonedObject, keyName, newValue);
    } catch (error) {
      if (!behavior.collectAllErrors) {
        throw error;
      }
      requiredErrors.push(error);
    }
  }
  const optionalError = [];
  const optionalKeys = Object.keys(schema)
    .filter(isOptionalKey)
    .filter((key) => !requiredKeys.includes(key.replace(optionalRegex, "")));
  for (const keyName of optionalKeys) {
    try {
      const keyNameStripped = keyName.replace(optionalRegex, "");
      let value = clonedObject[keyNameStripped];
      if (!isNullish(value)) {
        let type = schema[keyName];
        let newValue = validTypeOrThrow({
          behavior,
          type,
          value,
          root,
          keyName: keyNameStripped,
          path: [...path, keyNameStripped],
        });
        mustUpdateRef && updateRef(clonedObject, keyNameStripped, newValue);
      }
    } catch (error) {
      if (!behavior.collectAllErrors) {
        throw error;
      }
      optionalError.push(error);
    }
  }
  let regexErrors = [];
  const regexKeys = Object.keys(schema).filter(isRegExp);
  const untestedKeys = Object.keys(clonedObject)
    .filter((key) => !requiredKeys.includes(key))
    .filter(
      (key) =>
        !optionalKeys.map((k) => k.replace(optionalRegex, "")).includes(key)
    );
  for (const regexpString of regexKeys) {
    let keys = untestedKeys.filter((keyName) =>
      stringToRegExp(regexpString).test(keyName)
    );
    for (const keyName of keys) {
      try {
        let newValue = validTypeOrThrow({
          behavior,
          type: schema[regexpString],
          value: clonedObject[keyName],
          root,
          keyName:keyName,
          path: [...path, keyName],
        });
        mustUpdateRef && updateRef(clonedObject, keyName, newValue);
      } catch (error) {
        if (!behavior.collectAllErrors) {
          throw error;
        }
        regexErrors.push(error);
      }
    }
  }
  const errors = [...regexErrors, ...requiredErrors, ...optionalError];
  if (errors.length > 0) {
    throwErrors(errors, {
      ...data,
      $Error: SchemaValidationError,
      kind: "schema",
    });
  }
  return clonedObject;
};

const validMainValidatorOrThrow = (data) => {
  const { type: fn, value } = data;
  try {
    if (
      fn.applyDefault &&
      (data.behavior.name === "mustBe" || data.behavior.name === "applyDefault")
    ) {
      return fn(value);
    } else {
      let overrideBehavior = {
        ...data.behavior,
        onValid: onValidDefault,
        onInvalid: onInvalidDefault,
      };
      return fn(value, { [configurationSymbol]: overrideBehavior });
    }
  } catch (error) {
    if (error.raw) {
      reThrowError(error, data);
    }
    throw error;
  }
};
const validCustomValidatorOrThrow = (data) => {
  const { type: fn, value, root, keyName } = data;
  return truthyOrThrow(fn(value, root, keyName), data);
};

const validConstructorOrThrow = (data) =>
  truthyOrThrow(checkConstructor(data.type, data.value), data);
const validPrimitiveOrThrow = (data) =>
  truthyOrThrow(data.value === data.type, data);

const validRegExpOrThrow = (data) =>
  truthyOrThrow(
    data.value.constructor === String && checkRegExp(data.type, data.value),
    data
  );

const validSeriesOrThrow = (behavior, types, value) => {
  const errors = [];
  let valueTransformed = value;
  for (const type of types) {
    value !== valueTransformed;
    try {
      valueTransformed = validTypeOrThrow({
        behavior,
        type,
        value: valueTransformed,
      });
    } catch (error) {
      errors.push(error);
      if (!behavior.collectAllErrors) break;
    }
  }
  if (errors.length > 0) {
    throwErrors(errors, {
      type: types,
      value,
      $Error: SerieValidationError,
      kind: "serie",
    });
  }
  return valueTransformed;
};
const validEnumOrThrow = (data) => {
  const { behavior, type: types, value, root, keyName, path } = data;
  const errors = [];
  for (const type of types) {
    try {
      return validTypeOrThrow({ behavior, type, value, root, keyName, path });
    } catch (error) {
      errors.push(error);
    }
  }
  throwErrors(errors, {
    ...data,
    $Error: EnumValidationError,
    kind: "enum",
  });
};

const validTypeOrThrow = (data) => {
  switch (whatTypeIs(data.type)) {
    case "regex":
      validRegExpOrThrow(data);
      return data.value;
    case "primitive":
      validPrimitiveOrThrow(data);
      return data.value;
    case "constructor":
      validConstructorOrThrow(data);
      return data.value;
    case "enum":
      return validEnumOrThrow(data);
    case "schema":
      return validSchemaOrThrow(data);
    case "validator":
      validCustomValidatorOrThrow(data);
      return data.value;
    case "main-validator":
      return validMainValidatorOrThrow(data);
    case "invalid":
      throw new SyntaxError(
        `checking with validator ${stringify(data.type)} not supported`
      );
  }
};

const createValidator = (types, behavior) => {
  const validator = (value, overrideBehavior) => {
    let currentBehavior = behavior;
    if (overrideBehavior && overrideBehavior[configurationSymbol]) {
      currentBehavior = overrideBehavior[configurationSymbol];
    }
    let newValue = value;
    try {
      newValue = validSeriesOrThrow(currentBehavior, types, value);
    } catch (error) {
      return currentBehavior.onInvalid(error, newValue);
    }

    return currentBehavior.onValid(newValue);
  };
  validator[validatorSymbol] = true;
  validator.displayName = `${behavior.name}(${types.map(stringify)})`;
  if (behavior.name === "mustBe") {
    validator.or = createOr(types, behavior);
  }
  if (behavior.name === "applyDefault") {
    validator.applyDefault = true;
  }
  return validator;
};

const applyDefault = (defaultValue) => (error, value) => {
  try {
    if (defaultValue instanceof Function) return defaultValue(value, error);
  } catch (err) {
    throw new CastError(
      [err],
      `Imposible to cast with ${stringify(defaultValue)}:
${err}`,
      error.raw
    );
  }
  return defaultValue;
};

const createOr = (types, behavior) => (defaultValue) => {
  let v = createValidator(types, {
    ...behavior,
    onInvalid: applyDefault(defaultValue),
    name: "applyDefault",
  });
  v.displayName = `mustBe(${types.map(stringify)}).or(${stringify(
    defaultValue
  )})`;

  return v;
};

const run = (behavior) => (...types) => createValidator(types, behavior);

const config = ({
  collectAllErrors = false,
  onValid = onValidDefault,
  onInvalid = onInvalidDefault,
  applyTransformation = false,
  applyDefault = false,
  name = "mustBe",
}) =>
  run({
    collectAllErrors,
    onValid,
    onInvalid,
    applyTransformation,
    applyDefault,
    name,
  });

export const mustBe = config({
  // onValid: onValidDefault, // default
  // onInvalid: onInvalidDefault, // default
  // collectAllErrors: false, // default
  name: "mustBe",
});

export const isValid = config({
  onInvalid: () => false,
  onValid: () => true,
  name: "isValid",
  // collectAllErrors: false, // default
});

export const isValidOrLog = config({
  onInvalid: logErrorsAndReturnFalse,
  onValid: () => true,
  name: "isValidOrLog",
  // collectAllErrors: false, // default
});

const flatAggregateError = (error) => {
  if (error instanceof AggregateError) {
    let errors = error.errors.flatMap(flatAggregateError);
    return errors;
  } else {
    return [error];
  }
};

export const hasErrors = config({
  onInvalid: (error) => flatAggregateError(error),
  onValid: () => null,
  name: "hasErrors",

  collectAllErrors: true,
});

export const isValidOrLogAll = config({
  onInvalid: logErrorsAndReturnFalse,
  onValid: () => true,
  name: "isValidOrLogAll",

  collectAllErrors: true,
});

export const mustBeOrThrowAll = config({
  collectAllErrors: true,
  name: "mustBeOrThrowAll",
});

export default mustBe;
