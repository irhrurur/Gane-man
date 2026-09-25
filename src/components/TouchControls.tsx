'use client';
import { useEffect, useRef, useState, type RefObject, type PointerEvent } from 'react';
import type { Engine } from '@/game/engine';
const movement=['KeyW','KeyS','KeyA','KeyD','ShiftLeft'];
export default function TouchControls({engine}:{engine:RefObject<Engine|null>}){
 const stick=useRef<{id:number;x:number;y:number}|null>(null),look=useRef<{id:number;x:number;y:number}|null>(null);
 const [knob,setKnob]=useState({x:0,y:0}),[aim,setAim]=useState(false),[crouch,setCrouch]=useState(false);
 const clear=()=>{const e=engine.current;if(e){movement.forEach(k=>e.keys.delete(k));e.keys.delete('KeyE');e.keys.delete('KeyC');e.firing=false;e.ads=false;}stick.current=null;look.current=null;};
 useEffect(()=>{const reset=()=>{clear();setKnob({x:0,y:0});setAim(false);setCrouch(false);};window.addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);return()=>{clear();window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',reset);};},[engine]);
 function stickMove(ev:PointerEvent<HTMLDivElement>){const s=stick.current,e=engine.current;if(!s||s.id!==ev.pointerId||!e)return;const dx=ev.clientX-s.x,dy=ev.clientY-s.y,len=Math.hypot(dx,dy),scale=Math.min(1,42/(len||1));setKnob({x:dx*scale,y:dy*scale});movement.forEach(k=>e.keys.delete(k));if(dy<-10)e.keys.add('KeyW');if(dy>10)e.keys.add('KeyS');if(dx<-10)e.keys.add('KeyA');if(dx>10)e.keys.add('KeyD');if(dy<-38)e.keys.add('ShiftLeft');}
 function stickStop(ev:PointerEvent<HTMLDivElement>){if(stick.current?.id!==ev.pointerId)return;stick.current=null;setKnob({x:0,y:0});movement.forEach(k=>engine.current?.keys.delete(k));}
 function holdDown(ev:PointerEvent<HTMLButtonElement>,action:'fire'|'use'){ev.preventDefault();ev.currentTarget.setPointerCapture(ev.pointerId);const e=engine.current;if(!e||e.paused)return;if(action==='fire')e.firing=true;else e.keys.add('KeyE');}
 function holdUp(action:'fire'|'use'){const e=engine.current;if(!e)return;if(action==='fire')e.firing=false;else e.keys.delete('KeyE');}
 return <div className="touch-overlay" aria-label="Phone controls">
  <div className="touch-look" aria-label="Drag to look" onPointerDown={ev=>{if(look.current)return;ev.preventDefault();ev.currentTarget.setPointerCapture(ev.pointerId);look.current={id:ev.pointerId,x:ev.clientX,y:ev.clientY};}} onPointerMove={ev=>{const l=look.current,e=engine.current;if(!l||l.id!==ev.pointerId||!e||e.paused)return;const scale=.004*(e.ads?.5:1);e.yaw-=(ev.clientX-l.x)*scale;e.pitch=Math.max(-1.45,Math.min(1.45,e.pitch-(ev.clientY-l.y)*scale));l.x=ev.clientX;l.y=ev.clientY;}} onPointerUp={()=>{look.current=null;}} onPointerCancel={()=>{look.current=null;}} onLostPointerCapture={()=>{look.current=null;}}><span>DRAG TO LOOK</span></div>
  <div className="touch-stick" aria-label="Movement joystick" onPointerDown={ev=>{if(stick.current)return;ev.preventDefault();ev.currentTarget.setPointerCapture(ev.pointerId);const r=ev.currentTarget.getBoundingClientRect();stick.current={id:ev.pointerId,x:r.left+r.width/2,y:r.top+r.height/2};stickMove(ev);}} onPointerMove={stickMove} onPointerUp={stickStop} onPointerCancel={stickStop} onLostPointerCapture={stickStop}><span style={{transform:`translate(${knob.x}px,${knob.y}px)`}}/><small>MOVE / PUSH TO SPRINT</small></div>
  <div className="touch-actions">
   <button aria-label="Hold to fire" className="touch-fire" onPointerDown={ev=>holdDown(ev,'fire')} onPointerUp={()=>holdUp('fire')} onPointerCancel={()=>holdUp('fire')} onLostPointerCapture={()=>holdUp('fire')}>FIRE</button>
   <button aria-label="Toggle aim" aria-pressed={aim} onClick={()=>{const e=engine.current;if(e){e.ads=!e.ads;setAim(e.ads);}}}>AIM</button>
   <button aria-label="Reload weapon" onClick={()=>engine.current?.reload()}>RELOAD</button>
   <button aria-label="Jump" onClick={()=>engine.current?.keyDown({code:'Space',repeat:false,preventDefault(){}} as KeyboardEvent)}>JUMP</button>
   <button aria-label="Hold to interact" onPointerDown={ev=>holdDown(ev,'use')} onPointerUp={()=>holdUp('use')} onPointerCancel={()=>holdUp('use')} onLostPointerCapture={()=>holdUp('use')}>USE</button>
   <button aria-label="Switch weapon" onClick={()=>engine.current?.switchWeapon()}>SWITCH</button>
   <button aria-label="Toggle crouch" aria-pressed={crouch} onClick={()=>{const e=engine.current;if(e){if(e.keys.has('KeyC'))e.keys.delete('KeyC');else e.keys.add('KeyC');setCrouch(e.keys.has('KeyC'));}}}>CROUCH</button>
   <button aria-label="Use ability" onClick={()=>engine.current?.ability()}>ABILITY</button>
   <button aria-label="Throw grenade" onClick={()=>engine.current?.grenade()}>FRAG</button>
  </div>
  <button className="touch-pause" aria-label="Pause touch game" onClick={()=>engine.current?.pause()}>Ⅱ PAUSE</button>
 </div>;
}
