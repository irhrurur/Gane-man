const assert=require('node:assert');
(async()=>{const browser=await require('./browser-support.cjs')();try{
const page=await browser.newPage({viewport:{width:960,height:600}});const errors=[],models=new Set();let apiCalls=0;
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().endsWith('.glb')&&r.status()===200)models.add(r.url());});page.on('request',r=>{if(r.url().includes('/api/'))apiCalls++;});
// Lowest GPU preset keeps the software-rendered smoke test responsive.
await page.addInitScript(()=>localStorage.setItem('veilbreak-settings',JSON.stringify({quality:'Low',volume:0})));
await page.goto(process.env.TEST_URL||'http://localhost:3002/',{waitUntil:'networkidle'});
assert(await page.getByText('WELCOME BACK, OPERATOR').isVisible());
await page.locator('.sidebar').getByRole('button',{name:/^Training Grounds/}).click();
await page.getByRole('button',{name:'ENTER THE RANGE',exact:true}).click();
await page.getByRole('button',{name:'DEPLOY NOW',exact:true}).waitFor({timeout:60000});assert.equal(models.size,29);
await page.getByRole('button',{name:'DEPLOY NOW',exact:true}).click();
await page.locator('.ammo b').waitFor();const before=await page.locator('.ammo b').innerText();
await page.mouse.move(480,300);await page.mouse.down();await page.waitForFunction(()=>document.querySelector('.ammo b')?.textContent!=='30',null,{timeout:60000});await page.mouse.up();
assert.notEqual(await page.locator('.ammo b').innerText(),before);
await page.keyboard.press('KeyR');await page.waitForFunction(()=>document.querySelector('.ammo b')?.textContent==='30',null,{timeout:60000});
await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME OPERATION'}).waitFor();await page.getByRole('button',{name:'ABORT',exact:true}).click();
assert.equal(apiCalls,0);assert.deepEqual(errors,[]);
console.log('PASS portable HTML: menu, 29 local models, deployment, live firing, reload, pause/exit, zero cloud requests, zero JS errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
