const {chromium}=require('@playwright/test');const assert=require('assert');
(async()=>{
 const browser=await require('./browser-support.cjs')();
 const page=await browser.newPage({viewport:{width:960,height:600}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
 await page.locator('.sidebar').getByRole('button',{name:/^Training Grounds/}).click();
 await page.getByRole('button',{name:'ENTER THE RANGE',exact:true}).click();
 await page.getByRole('button',{name:'DEPLOY NOW',exact:true}).waitFor({timeout:60000});
 await page.getByRole('button',{name:'DEPLOY NOW',exact:true}).click();
 const report=await page.evaluate(async()=>{
  const e=window.game;cancelAnimationFrame(e.frame);e.paused=false;e.renderer.shadowMap.enabled=false;
  const results=[];const check=(v,n)=>{if(!v)throw Error(n);results.push(n)};
  const render=e.renderer.render.bind(e.renderer);e.renderer.render=()=>{};
  let t=e.lastTime;const tick=(n=1)=>{for(let i=0;i<n;i++){e.loop(t+=20);cancelAnimationFrame(e.frame);}};
  check(e.assets.models.size===29,'29 glTF resources loaded');
  check(e.bots.every(b=>b.group.userData.actor?.userData.animator),'Bots use cloned skeletons + independent mixers');
  check(e.arms.children.length>0,'First-person skinned arms are present');
  check(e.bots[0].group.userData.actor.userData.animator.actions.Walk,'Authentic walk clip available');
  const z=e.camera.position.z;e.keys.add('KeyW');tick(15);e.keys.clear();check(e.camera.position.z<z,'Forward movement');
  check(e.collides(-37,35),'Imported building has collision');check(!e.collides(0,65),'Spawn clear');
  const start=[0,64],q=[start],seen=new Set(['0,64']);for(let i=0;i<q.length;i++){const [x,z]=q[i];for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){const nx=x+dx,nz=z+dz,k=nx+','+nz;if(!seen.has(k)&&!e.botCollides(nx,nz)){seen.add(k);q.push([nx,nz]);}}}
  for(const [x,z] of [[-28,36],[30,32],[-32,-14],[32,-22],[0,-58]])check(seen.has(x+','+z),'Walk-in objective room reachable '+x+','+z);
  check(e.worldRadius===78,'Larger 160m compound bounds');

  e.camera.position.set(0,1.75,65);e.yaw=0;e.pitch=0;e.camera.rotation.set(0,0,0);
  e.bots.forEach(b=>b.group.position.set(30,0,-20));const b=e.bots[0];b.group.position.set(0,0,59);b.group.rotation.set(0,0,0);
  e.camera.position.y=1.05;e.weapon.accuracy=100;e.scene.updateMatrixWorld(true);b.group.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();o.computeBoundingSphere();}});
  const hp=b.hp;e.shoot();check(e.ammo===29,'Imported rifle consumes ammunition');check(b.hp<hp,'Raycast hits animated skinned mesh');check(e.effects.length>0,'Impacts and tracer spawn');
  e.reload();tick(100);check(e.ammo===30,'Reload completes and consumes reserve');
  e.switchWeapon();check(e.gun.children[0].name==='Pistol_1','Switch equips imported pistol');e.switchWeapon();
  e.camera.position.set(-3,1.75,62);e.keys.add('KeyE');e.updateObjectives(.02);check(e.weapon.id==='tactical'&&e.pickups.length===2,'E pickup equips DMR and removes world model');
  const old=e.traffic.position.clone();e.elapsed+=5;e.updateObjectives(.02);check(e.traffic.position.distanceTo(old)>0,'Imported aircraft follows patrol');
  e.ability();check(e.cooldown>0,'Ability cooldown');
  e.damageBot(b,999);e.updateBots(.1);check(b.group.userData.actor.userData.animator.current==='Death','Death crossfade uses authored clip');
  const before=e.bots.length;e.spawnBot(false,90,'drone');check(e.bots.length===before+1&&e.bots.at(-1).group.userData.actor.name==='Enemy_Flying','Imported animated drone spawns');
  e.config.rule='capture';e.config.target=1;e.makeTarget(0,10);e.camera.position.set(0,1.75,10);e.keys.add('KeyE');for(let i=0;i<100;i++)e.updateObjectives(.02);check(e.targets.at(-1).done,'Imported terminal interaction completes');e.keys.clear();
  await e.audio.loadSamples();check(e.audio.buffers.size===3,'Three Ogg samples decoded');e.audio.shoot();e.audio.step();e.audio.reload();
  e.camera.position.set(0,1.75,65);e.camera.rotation.set(0,0,0);e.weapon=e.primary={...e.primary,id:'vxr'};e.buildGun();e.paused=true;e.renderer.render=render;render(e.scene,e.camera);
  return {checks:results,drawCalls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles};
 });
 if(process.env.CAPTURE){const png=await page.evaluate(()=>{const e=window.game;e.renderer.render(e.scene,e.camera);return e.canvas.toDataURL('image/png').split(',')[1]});require('fs').mkdirSync('public/images',{recursive:true});await require('sharp')(Buffer.from(png,'base64')).jpeg({quality:85}).toFile('public/images/sector.jpg');}
 console.log(JSON.stringify(report,null,2));await page.screenshot({path:'test-results/assets-game.png',timeout:120000});assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
