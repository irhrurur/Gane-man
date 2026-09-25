import * as THREE from 'three';
import { batchStatic } from './assets';
import type { Engine } from './engine';
/** Iron District: 160m x 160m, authored from textured Poly Haven modules. */
export function buildAssetMap(e:Engine){
 const assets=e.assets!,staticRoots:THREE.Group[]=[];e.worldRadius=78;e.camera.far=300;e.camera.position.set(0,1.75,65);e.extraction.set(0,0,65);
 e.scene.background=new THREE.Color(0x87959c);e.scene.fog=new THREE.FogExp2(0x87959c,.0045);
 e.scene.add(new THREE.HemisphereLight(0xc7dce9,0x4e504b,2.1));const sun=new THREE.DirectionalLight(0xffe7c2,3);sun.position.set(-45,65,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-80,right:80,top:80,bottom:-80});sun.shadow.normalBias=.04;e.scene.add(sun);
 const proxy=(box:THREE.Box3)=>{const size=box.getSize(new THREE.Vector3());size.x=Math.max(.18,size.x);size.z=Math.max(.18,size.z);const mesh=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),new THREE.MeshBasicMaterial({visible:false}));mesh.position.copy(box.getCenter(new THREE.Vector3()));e.scene.add(mesh);e.obstacles.push({box:new THREE.Box3().setFromObject(mesh),mesh,hp:Infinity});};
 const add=(name:string,x:number,z:number,height:number,y=0,rotation=0,solid=false)=>{const g=assets.model(name,height);g.position.set(x,y,z);g.rotation.y=rotation;g.traverse(o=>{if(o instanceof THREE.Mesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.side=THREE.DoubleSide);}});e.scene.add(g);staticRoots.push(g);if(solid)proxy(new THREE.Box3().setFromObject(g));return g;};
 // Photographic asphalt: large plane made from the imported surface material.
 const ground=assets.surface('AsphaltTile',160,160,28);e.scene.add(ground);
 const floor=(x:number,z:number,w:number,d:number)=>{const g=assets.surface('ConcreteTile',w,d,Math.max(w,d)/5);g.position.set(x,.025,z);e.scene.add(g);};
 // Walk-in maintenance sheds and perimeter administration blocks.
 function building(cx:number,cz:number,w:number,d:number,floors:number,open=false){
  floor(cx,cz,w,d);
  for(let level=0;level<floors;level++){
   for(let i=0;i<w/3;i++){const x=cx-w/2+1.5+i*3;for(const side of [-1,1]){if(open&&level===0&&side===1&&Math.abs(x-cx)<3)continue;add(level===0?'FactoryWall':'FactoryWindow',x,cz+side*d/2,3,level*3,side===1?0:Math.PI,true);}}
   for(let i=0;i<d/3;i++){const z=cz-d/2+1.5+i*3;for(const side of [-1,1])add(level===0&&i%3===0?'FactoryWall':'FactoryWindow',cx+side*w/2,z,3,level*3,side===1?Math.PI/2:-Math.PI/2,true);}
  }
  for(const side of [-1,1])for(let i=0;i<w/3;i++)add('FactoryCornice',cx-w/2+1.5+i*3,cz+side*d/2,.32,floors*3,side===1?0:Math.PI);
  for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])add('FactoryPillar',cx+dx,cz+dz,3,0,0);
  const roof=assets.surface('ConcreteTile',w+.3,d+.3,Math.max(w,d)/4);roof.position.set(cx,floors*3+.03,cz);e.scene.add(roof);
  if(open){add('UtilityBox',cx+w/2-1,cz,1.5,0,Math.PI/2,true);add('OilBarrel',cx-3,cz-2,1.1,0,0,true);const l=new THREE.PointLight(0xffe3b2,22,15);l.position.set(cx,2.8,cz);e.scene.add(l);}
 }
 building(-28,35,18,18,2,true);building(30,32,18,24,3,true);building(-33,-15,24,24,3,true);building(32,-22,18,24,2,true);building(0,-58,30,18,2,true);
 // Nontraversable skyline blocks remain behind the actual perimeter.
 building(-57,-57,18,18,4);building(59,-60,18,18,5);
 floor(-13,8,5,107);floor(15,8,5,107);
 for(const x of [-16,-12,-8,8,12,16])add('SecurityFence',x,4,2.5);
 for(const [x,z] of [[-53,4],[52,22],[-51,-30],[52,-50]]){add('UtilityBox',x,z,1.6,0,0,true);add('RoadBarrier',x+3,z,1.3,0,.5,true);}
 // Service lane, open central route, and staggered flanking cover.
 for(const [i,[x,z]] of [[-7,51],[8,44],[-7,23],[8,13],[-6,-3],[8,-17],[-8,-35],[5,-44],[-49,18],[51,1]].entries())add('RoadBarrier',x,z,1.15,0,i%2?Math.PI/10:-Math.PI/10,true);
 for(const [x,z] of [[-13,53],[18,49],[-14,-2],[14,-34],[-48,-39],[47,48]]){add('OilBarrel',x,z,1.1,0,0,true);add('OilBarrel',x+1.2,z+.3,1.05,0,.4,true);}
 add('CoveredCar',-11,37,1.35,0,.2,true);add('CoveredCar',12,-2,1.35,0,-.15,true);add('CoveredCar',-48,45,1.35,0,Math.PI/2,true);
 for(let z=-70;z<=70;z+=4){add('SecurityFence',-74,z,2.5,0,Math.PI/2);add('SecurityFence',74,z,2.5,0,Math.PI/2);}
 for(const x of [-25,25])for(const z of [-30,20]){const pipe=add('IndustrialPipe',x,z,4,3);pipe.rotation.z=Math.PI/2;add('PipeElbow',x+2,z,1.5,3);}
 // Authored fire escape meshes are scenery, not falsely advertised as walkable.
 add('FireStairs',-39,30,3,0,Math.PI);add('FirePlatform',-39,27,.6,2.4);add('FireRail',-39,27,1,3);add('FactoryGarage',-65,15,3,0,Math.PI/2,true);
 const aircraft=assets.model('Dispatcher',2.2);aircraft.position.set(-40,24,-45);e.scene.add(aircraft);e.traffic=aircraft;
 batchStatic(e.scene,staticRoots);
 const positions=[[-28,35],[30,32],[-33,-15],[32,-22],[0,-58]];
 if(['capture','stealth','sabotage'].includes(e.config.rule))positions.slice(0,e.config.target).forEach(([x,z])=>e.makeTarget(x,z));
 e.makeBeacon(0,0);if(e.config.rule==='escort'){e.beacon.clear();e.beacon.add(assets.model('Dispatcher',1.4));e.beacon.position.set(0,.3,55);}
 const ring=new THREE.Mesh(new THREE.RingGeometry(2.7,3,48),new THREE.MeshBasicMaterial({color:0x67ffda,side:THREE.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.03,65);e.scene.add(ring);
 e.sign('IRON DISTRICT // CHECKPOINT',0,4,73);e.sign('01 // MOTOR POOL',-28,3.5,44.3);e.sign('02 // OPERATIONS',30,4,44.3);e.sign('05 // RELAY CONTROL',0,4,-48.7);
 for(const [i,id] of ['tactical','heavy','breach'].entries()){const g=assets.model(({tactical:'AR_2',heavy:'Grenade_1',breach:'Shotgun_1'})[id as 'tactical'],.3);g.position.set(-3+i*3,.8,62);e.scene.add(g);e.pickups.push({group:g,id});}
}
