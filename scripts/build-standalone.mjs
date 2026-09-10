// Builds veilbreak-standalone.html — the ENTIRE game (menu + 3D engine +
// models + art + styles) packed into ONE file that plays by double-clicking
// it. No server, no install, no link, no token. Run: npm run standalone.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "veilbreak-standalone.html");

// ---- 1. Read assets: 3D models + menu art become embedded base64. ----
const models = {};
for (const f of readdirSync(join(root, "public/models"))) {
  if (f.endsWith(".glb"))
    models[f] = readFileSync(join(root, "public/models", f)).toString("base64");
}
const images = {};
for (const f of readdirSync(join(root, "public/images"))) {
  if (f.endsWith(".jpg"))
    images[f] =
      "data:image/jpeg;base64," +
      readFileSync(join(root, "public/images", f)).toString("base64");
}
if (Object.keys(models).length === 0) throw new Error("no .glb models found");
if (Object.keys(images).length === 0) throw new Error("no .jpg art found");

const virtualPlugin = {
  name: "veil-virtual",
  setup(build) {
    build.onResolve({ filter: /^veil:(models|images)$/ }, (args) => ({
      path: args.path,
      namespace: "veil",
    }));
    build.onLoad({ filter: /.*/, namespace: "veil" }, (args) => ({
      contents:
        args.path === "veil:models"
          ? `export const MODELS_B64 = ${JSON.stringify(models)};`
          : `export const IMAGES_B64 = ${JSON.stringify(images)};`,
      loader: "js",
    }));
  },
};

// ---- 2. Bundle the exact same React app (menu + game) into one script. ----
const result = await esbuild.build({
  entryPoints: [join(root, "standalone/entry.tsx")],
  bundle: true,
  format: "iife",
  minify: true,
  target: ["es2020"],
  platform: "browser",
  jsx: "automatic",
  alias: { "next/dynamic": join(root, "standalone/next-dynamic.tsx") },
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [virtualPlugin],
  write: false,
  logLevel: "warning",
});
let js = result.outputFiles[0].text;

// ---- 3. Point image URLs at the embedded art. ----
// Dynamic banner: url(/images/${expr}.jpg) -> url(${__VEIL_IMAGES__[(expr)+".jpg"]})
js = js.replace(
  /url\(\/images\/\$\{([^{}]+)\}\.jpg\)/g,
  (_m, expr) => `url(\${__VEIL_IMAGES__[(${expr})+".jpg"]})`,
);
// Static art: "/images/x.jpg" -> __VEIL_IMAGES__["x.jpg"]
js = js.replace(
  /(['"])\/images\/([A-Za-z0-9_.-]+\.jpg)\1/g,
  (_m, _q, name) => `__VEIL_IMAGES__[${JSON.stringify(name)}]`,
);
if (js.includes("/images/"))
  throw new Error("unresolved /images/ reference left in bundle");
// Inline-<script> safety: a literal </script inside a string would end the tag.
js = js.split("</script").join("<\\/script");

// ---- 4. Compile the stylesheet (tailwind + custom CSS). ----
let css = "";
try {
  const src = readFileSync(join(root, "src/app/globals.css"), "utf8");
  const out = await postcss([tailwindcss()]).process(src, {
    from: join(root, "src/app/globals.css"),
  });
  css = out.css;
  if (!css.includes(".campaign-hero") || css.length < 50000)
    throw new Error("compiled CSS looks incomplete");
} catch (err) {
  // Fallback: reuse the CSS already compiled by the running dev server.
  console.warn("tailwind compile failed, trying dev-server CSS:", err.message);
  const page = await (await fetch("http://localhost:3111/")).text();
  const m = page.match(/href="([^"]+\.css)"/);
  if (!m) throw new Error("no css chunk found on dev server");
  css = await (await fetch("http://localhost:3111" + m[1])).text();
}
if (css.includes("</style")) throw new Error("css contains </style");

let icon = "";
try {
  const svg = readFileSync(join(root, "public/icon.svg"), "utf8")
    .replace(/\s+/g, " ")
    .trim();
  icon = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}"/>`;
} catch {
  // favicon is optional
}

// ---- 5. Assemble the single file. ----
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>
<meta name="theme-color" content="#0e1213"/>
<title>VEILBREAK — Vanguard Operations</title>
${icon}
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync(OUT, html);
console.log(
  `wrote ${OUT} (${(html.length / 1048576).toFixed(2)} MB, ` +
    `${Object.keys(models).length} models, ${Object.keys(images).length} art)`,
);
