export class GameAudio {
 buffers=new Map<string,AudioBuffer>();
 sample(name:string,gain=.45){const c=this.context,b=this.buffers.get(name);if(!c||!b)return false;const source=c.createBufferSource(),volume=c.createGain();source.buffer=b;volume.gain.value=gain*this.volume;source.connect(volume);volume.connect(c.destination);source.start();return true;}
 async loadSamples(){const c=this.context;if(!c)return;await Promise.all(['shot','step','reload'].map(async name=>{try{const res=await fetch(`./assets/${name}.ogg`);this.buffers.set(name,await c.decodeAudioData(await res.arrayBuffer()));}catch{ /* Synth fallback if decoding is unavailable. */ }}));}
 context:AudioContext|null=null;volume=0.4;
 start(volume:number){this.volume=volume/100;try{this.context=new AudioContext();void this.context.resume();void this.loadSamples();}catch{}}
 tone(frequency:number,duration:number,type:OscillatorType='sine',gain=0.1,slide=0){
  const c=this.context;if(!c||this.volume===0)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,c.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),c.currentTime+duration);g.gain.setValueAtTime(gain*this.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);
 }
 shoot(){if(this.sample('shot',.6))return;this.tone(120,.12,'sawtooth',.19,32);this.tone(1800,.04,'square',.025,200);}
 hit(){this.tone(900,.07,'sine',.16,1600);}
 step(){if(this.sample('step',.4))return;this.tone(75,.04,'triangle',.12,30);}
 reload(){if(this.sample('reload',.7))return;this.tone(360,.1,'square',.05,130);}
 explosion(){this.tone(65,.8,'sawtooth',.4,20);}
 ui(){this.tone(650,.1,'sine',.1,1000);}
 music(intensity:number){this.tone(55,.7,'sine',.07);if(intensity>0)this.tone(110,.13,'triangle',.08);}
 dispose(){if(this.context)void this.context.close();}
}
