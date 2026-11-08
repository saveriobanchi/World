/* =====================================================================
   AUDIO · a generative soundtrack, started only by the viewer
   ===================================================================== */
const Sound={ctx:null,master:null,verb:null,on:false,timer:0,
  start(){
    if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;this.ctx=new C();
      const c=this.ctx;this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
      // a simple feedback delay stands in for a hall
      const d=c.createDelay(1.5);d.delayTime.value=.43;const fb=c.createGain();fb.gain.value=.42;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
      d.connect(lp);lp.connect(fb);fb.connect(d);this.verb=c.createGain();this.verb.gain.value=.5;this.verb.connect(d);d.connect(this.master);
      // drone
      const dg=c.createGain();dg.gain.value=.05;const df=c.createBiquadFilter();df.type='lowpass';df.frequency.value=380;dg.connect(df);df.connect(this.master);
      for(const[f,det]of[[55,0],[82.4,4],[110,-5]]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;o.connect(dg);o.start()}
      const lfo=c.createOscillator();lfo.frequency.value=.05;const lg=c.createGain();lg.gain.value=160;lfo.connect(lg);lg.connect(df.frequency);lfo.start();
    }
    this.ctx.resume();this.on=true;this.master.gain.setTargetAtTime(.55,this.ctx.currentTime,1.2);this.timer=this.ctx.currentTime+.5;return true;
  },
  stop(){if(!this.ctx)return;this.on=false;this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.4)},
  tone(f,dur,type,vol,when){const c=this.ctx,t=when||c.currentTime;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.master);g.connect(this.verb);o.start(t);o.stop(t+dur+.05)},
  tick(){
    if(!this.on||!this.ctx)return;const c=this.ctx;
    if(c.currentTime>this.timer){const scale=[220,246.9,277.2,329.6,370,440,493.9,554.4,659.3];const f=scale[(Math.random()*scale.length)|0];
      this.tone(f,2.6,'triangle',.07);if(Math.random()<.35)this.tone(f*1.5,2.2,'sine',.035,c.currentTime+.18);
      this.timer=c.currentTime+1.4+Math.random()*3.2}
  },
  cue(cat){
    if(!this.on||!this.ctx)return;const c=this.ctx,t=c.currentTime;
    if(cat==='war'||cat==='battle'||cat==='siege'){for(let k=0;k<3;k++){this.tone(62,.5,'sine',.32,t+k*.22);this.noise(.12,.12,t+k*.22)}}
    else if(cat==='crown'||cat==='rise'||cat==='golden'||cat==='wonder'||cat==='slay'){for(const[f,v]of[[523.3,.12],[784,.07],[1046.5,.05],[1318.5,.03]])this.tone(f,3.2,'sine',v,t)}
    else if(cat==='fall'||cat==='death'||cat==='plague'||cat==='blight'){this.tone(98,2.6,'triangle',.16,t);this.tone(116.5,2.6,'triangle',.1,t+.08)}
    else if(cat==='dragon'||cat==='serpent'||cat==='giant'||cat==='lich'){this.tone(46,2.2,'sawtooth',.12,t);this.noise(.8,.08,t)}
    else if(cat==='era'){for(const[f,d]of[[392,0],[523.3,.25],[659.3,.5],[784,.75]])this.tone(f,2.8,'triangle',.08,t+d)}
  },
  noise(dur,vol,t){const c=this.ctx,b=c.createBuffer(1,c.sampleRate*dur,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
    const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.value=vol;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=900;s.connect(f);f.connect(g);g.connect(this.master);s.start(t)},
};
