const {app,BrowserWindow}=require('electron');const path=require('node:path');
const {startServer}=require('./serve-web.cjs');let server;
app.whenReady().then(async()=>{
 server=await startServer(path.join(__dirname,'web'));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const window=new BrowserWindow({width:1440,height:900,minWidth:960,minHeight:600,title:'Veilbreak',autoHideMenuBar:true,backgroundColor:'#101718',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin)event.preventDefault();});
 await window.loadURL(origin);
}).catch(error=>{console.error(error);app.quit();});
app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>server?.close());
