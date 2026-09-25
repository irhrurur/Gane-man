import * as THREE from 'three';
import { batchStatic } from './assets';
import type { Engine } from './engine';
/** Authored modular combat district. Only collision proxies and VFX use primitives. */
export function buildAssetMap(e:Engine){
 const staticRoots:THREE.Group[]=[];const assets=e.assets!;const night=e.config.environment==='horror';
 e.scene.background=new THREE.Color(night?0x10121e:0x283a49);e.scene.fog=new THREE.FogExp2(night?0x10121e:0x283a49,.009);
 e.scene.add(new THREE.HemisphereLight(0xb2daff,0x333344,2));const sun=new THREE.DirectionalLight(0xffc19c,3);sun.position.set(-20,45,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42});sun.shadow.normalBias=.04;e.scene.add(sun);
 const add=(name:string,x:number,z:number,height:number,y=0,rotation=0,solid=false)=>{const g=assets.model(name,height);g.position.set(x,y,z);g.rotation.y=rotation;e.scene.add(g);staticRoots.push(g);if(solid){const box=new THREE.Box3().setFromObject(g);const size=box.getSize(new THREE.Vector3());const proxy=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),new THREE.MeshBasicMaterial({visible:false}));proxy.position.copy(box.getCenter(new THREE.Vector3()));e.scene.add(proxy);e.obstacles.push({box,mesh:proxy,hp:Infinity});}return g;};
 // Pavement modules retain their authored bevels, panel seams, and material slots.
 for(let x=-32;x<=32;x+=8)for(let z=-32;z<=32;z+=8){const tile=add('FloorTile_Basic',x,z,.15,-.15);tile.updateMatrixWorld(true);const s=new THREE.Box3().setFromObject(tile).getSize(new THREE.Vector3());tile.scale.set(8/s.x,1,8/s.z);}
 for(let i=0;i<8;i++){const road=add('Street_Straight',0,-28+i*8,.12,-.01);const s=new THREE.Box3().setFromObject(road).getSize(new THREE.Vector3());road.scale.set(7/s.x,1,8/s.z);}
 const towers=['4Story_Mat','6Story_Stack_Mat','3Story_Balcony_Mat','2Story_Stairs_Mat'];
 for(let i=0;i<4;i++){const x=i%2?-25:25,z=i<2?-22:8,h=[17,23,14,10][i];const g=add(towers[i],x,z,h,0,i%2?Math.PI/2:-Math.PI/2);const s=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());g.scale.x*=12/s.x;g.scale.z*=13/s.z;g.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g);const proxy=new THREE.Mesh(new THREE.BoxGeometry(12,h,13),new THREE.MeshBasicMaterial({visible:false}));proxy.position.set(x,h/2,z);e.scene.add(proxy);e.obstacles.push({box,mesh:proxy,hp:Infinity});add('AC',x,z,h*.08,h);add('Antenna_1',x+3,z,4,h);add(i%2?'Sign_1':'Sign_2',x>0?18.3:-18.3,z,2.8,5,Math.PI/2);}
 for(let i=0;i<12;i++){const x=-64+i*12;add(towers[i%4],x,-52-(i%3)*10,22+(i%4)*9);}
 const covers=[[-7,14],[7,14],[-8,-2],[8,-2],[-6,-18],[6,-18],[-27,23],[27,23]];
 covers.forEach(([x,z],i)=>add(i%3?'Props_Crate':'Props_ContainerFull',x,z,i%3?1.35:1.8,0,i%2*Math.PI/2,true));
 for(const x of [-16,16])for(const z of [-29,19]){add('Light_Street_1',x,z,6);const l=new THREE.PointLight(x<0?0x43e5ef:0xff6e3a,30,18);l.position.set(x,4,z);e.scene.add(l);}
 // Open-sided checkpoint interior. Separate wall collisions leave the entrance traversable.
 for(const x of [-8,-4,0,4,8])add('Wall_1',x,-34,4,0,0,true);
 for(const x of [-10,10])for(const z of [-31,-27])add('Window_Wall_SideA',x,z,4,0,Math.PI/2,true);
 add('Props_Computer',7,-31,1.5);add('Computer',-7,-31,1.4);add('Tank',-8,-29,2);add('Pipe_1',0,-33,2.5,1);
 add('Staircase',30,25,2,0,Math.PI,true);add('Cable_Long',0,-33,1,5);add('Lootbox',-31,-29,.7);
 const ship=add('Dispatcher',0,-5,3.4,18);staticRoots.splice(staticRoots.indexOf(ship),1);ship.userData.patrol=true;e.traffic=ship;
 const positions=[[-14,-10],[14,-10],[0,-26],[23,18],[-23,18]];
 if(['capture','stealth','sabotage'].includes(e.config.rule))positions.slice(0,e.config.target).forEach(([x,z])=>e.makeTarget(x,z));
 e.makeBeacon(0,4);if(e.config.rule==='escort'){e.beacon.clear();e.beacon.add(assets.model('Dispatcher',1.4));e.beacon.position.set(0,.25,21);}
 const ring=new THREE.Mesh(new THREE.RingGeometry(2.7,3,48),new THREE.MeshBasicMaterial({color:0x67ffda,side:THREE.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.02,25);e.scene.add(ring);
 batchStatic(e.scene,staticRoots);
 e.sign('NOVA // SIGNAL DISTRICT',0,5,-33.9);e.sign('07 / TRANSIT CONTROL',-14,3,29);
 // Real weapon pickups: E swaps the equipped primary, with a fresh finite magazine.
 for(const [i,id] of ['tactical','heavy','breach'].entries()){const g=assets.model(({tactical:'AR_2',heavy:'Grenade_1',breach:'Shotgun_1'})[id as 'tactical'],.3);g.position.set(-3+i*3,.8,22);e.scene.add(g);e.pickups.push({group:g,id});}
}
