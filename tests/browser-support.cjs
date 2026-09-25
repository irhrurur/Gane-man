// Bundled Chromium works when the Playwright browser CDN is unavailable.
module.exports=async()=>{
 const fs=require('fs'),path=require('path'),os=require('os'),zlib=require('zlib'),cp=require('child_process');
 const binary=(await import('@sparticuz/chromium')).default;
 const root=path.resolve(path.dirname(require.resolve('@sparticuz/chromium')),'..');
 const dir=path.join(os.tmpdir(),'veilbreak-chromium-libs');fs.mkdirSync(dir,{recursive:true});
 if(!fs.existsSync(path.join(dir,'lib/libnspr4.so'))){const tar=path.join(dir,'libs.tar');fs.writeFileSync(tar,zlib.brotliDecompressSync(fs.readFileSync(path.join(root,'bin/al2023.tar.br'))));cp.execFileSync('tar',['xf',tar,'-C',dir]);fs.unlinkSync(tar);}
 return require('@playwright/test').chromium.launch({executablePath:await binary.executablePath(),headless:true,env:{...process.env,LD_LIBRARY_PATH:path.join(dir,'lib')},args:[...binary.args,'--enable-unsafe-swiftshader']});
};
