/**
 * `ViewTransition` y `addTransitionType` viven en los tipos canary de React
 * (`@types/react/canary.d.ts`), no en `index.d.ts`. Esta referencia los expone
 * globalmente sin tener que tocar `compilerOptions.types` en tsconfig.json.
 */
/// <reference types="react/canary" />

export {};
