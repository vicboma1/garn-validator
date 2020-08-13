export const AsyncFunction: Function;
export const GeneratorFunction: Function;

export declare class AggregateError {
  constructor(errors: any[], message: string);
  name: string;
  errors: any[];
  message: string;
  stack: string;
}
export declare class EnumValidationError extends AggregateError {
}
export declare class SchemaValidationError extends AggregateError {
}

export declare class SerieValidationError extends AggregateError {
}

export function arrayOf(type: any): Function;
export function objectOf(type: any): Function;

export function isValid(type: any): (value: any) => boolean;
export function isValidOrLog(type: any): (value: any) => boolean;
export function isValidOrLogAll(type: any): (value: any) => boolean;

export function hasErrors(type: any): (value: any) => null | any[];

export function isValidOrThrowAll(
  type: any
): (value: any) => true | never;

export function isValidOrThrow(
  type: any
): (value: any) => true | never;

export default isValidOrThrow;

// TODO add mustBe().or()
