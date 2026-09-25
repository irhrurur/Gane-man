import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
 root:'portable',base:'./',publicDir:resolve('public'),
 resolve:{alias:{'@':resolve('src'),'next/dynamic':resolve('portable/dynamic.tsx')}},
 define:{'process.env.NODE_ENV':JSON.stringify('production'),'process.env.NEXT_PUBLIC_STATIC':JSON.stringify('true')},
 build:{outDir:resolve('web-build'),emptyOutDir:true,chunkSizeWarningLimit:1100},
});
