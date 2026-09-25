const assert=require('node:assert');
(async()=>{const browser=await require('./browser-support.cjs')();try{
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto('file:///home/user/Gane-man/Veilbreak-Phone.html',{waitUntil:'load'});
 if(await page.getByRole('button',{name:'Open navigation'}).isVisible())await page.getByRole('button',{name:'Open navigation'}).click();await page.locator('.sidebar').getByRole('button',{name:/^Training Grounds/}).click();await page.getByRole('button',{name:'ENTER THE RANGE',exact:true}).click();
 await page.getByRole('button',{name:'DEPLOY NOW',exact:true}).waitFor({timeout:60000});await page.getByRole('button',{name:'DEPLOY NOW',exact:true}).click();
 await page.getByLabel('Movement joystick').waitFor();assert(await page.getByRole('button',{name:'Hold to fire'}).isVisible());
 const cdp=await context.newCDPSession(page);const point=async label=>{const r=await page.getByLabel(label,{exact:true}).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
 const stick=await point('Movement joystick'),fire=await point('Hold to fire'),look=await point('Drag to look');
 const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({...p,id:i+1,radiusX:3,radiusY:3,force:1}))});
 // Two simultaneous physical touch points: move + automatic fire.
 await touch('touchStart',[stick,fire]);await touch('touchMove',[{x:stick.x,y:stick.y-42},fire]);await page.waitForFunction(()=>document.querySelector('.ammo b')?.textContent!=='30',null,{timeout:60000});await touch('touchEnd',[]);
 assert.notEqual(await page.locator('.ammo b').innerText(),'30');
 await page.getByRole('button',{name:'Reload weapon',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('.ammo b')?.textContent==='30',null,{timeout:60000});
 await page.getByRole('button',{name:'Toggle aim'}).tap();assert.equal(await page.getByRole('button',{name:'Toggle aim'}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Toggle crouch'}).tap();assert.equal(await page.getByRole('button',{name:'Toggle crouch'}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Jump',exact:true}).tap();
 // Drag in the unobstructed upper-right look region.
 await touch('touchStart',[{x:650,y:100}]);await touch('touchMove',[{x:700,y:115}]);await touch('touchEnd',[]);
 await page.getByRole('button',{name:'Switch weapon',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('.ammo b')?.textContent==='14',null,{timeout:60000});
 await page.getByRole('button',{name:'Pause touch game'}).tap();await page.getByRole('button',{name:'RESUME OPERATION'}).waitFor();await page.getByRole('button',{name:'ABORT',exact:true}).tap();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save this game (.html)'}).tap();const d=await downloadPromise;assert.equal(d.suggestedFilename(),'Veilbreak-Phone.html');
 // The self-saved game must also open, without relying on in-memory blob URLs.
 const saved=await d.path();const second=await context.newPage();await second.goto('file://'+saved);await second.getByText('WELCOME BACK, OPERATOR').waitFor();await second.close();
 console.log('External requests:',requests);assert.deepEqual(requests,[],'No external HTTP dependencies');assert.deepEqual(errors,[]);console.log('PASS single HTML over file://: offline boot, embedded GLBs, simultaneous touch move/fire, reload, aim, crouch, jump button, look drag, sidearm switch, pause/abort, self-download and reopen. No HTTP requests or JS errors. Physical Android/iOS testing not performed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
