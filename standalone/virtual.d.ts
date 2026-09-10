// Virtual modules provided in-memory by scripts/build-standalone.mjs
// (esbuild plugin). Declared here so `tsc --noEmit` accepts the imports.
declare module "veil:models" {
  export const MODELS_B64: Record<string, string>;
}
declare module "veil:images" {
  export const IMAGES_B64: Record<string, string>;
}
