// xr.js — hand-written WebXR bootstrap. No XRButton, no addons.
export const xrS={on:0,sup:0,ht:0,h:[]}; // h: per controller {g: grip Object3D, hand, on, t (select), q (squeeze), src}
export async function xrInit(renderer,btn,onStart,onEnd){
  xrS.sup=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>0);
  btn.textContent=xrS.sup?'ENTER VR':'PLAY ON DESKTOP';
  for(let i=0;i<2;i++){const c=renderer.xr.getController(i),h={g:renderer.xr.getControllerGrip(i),hand:'none',on:0,t:0,q:0,src:0};xrS.h.push(h);
    const on=(k,f)=>c.addEventListener(k,f);
    on('connected',e=>{h.on=1;h.src=e.data;h.hand=e.data.handedness;if(e.data.hand)xrS.ht=1});
    on('disconnected',()=>{h.on=0});   // pose freezes at its last value (input.js)
    on('selectstart',()=>h.t=1);on('selectend',()=>h.t=0);on('squeezestart',()=>h.q=1);on('squeezeend',()=>h.q=0)}
  btn.onclick=async()=>{btn.hidden=true;onStart();if(!xrS.sup)return;
    try{const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','hand-tracking']});
      renderer.xr.enabled=true;renderer.xr.setFoveation(1);renderer.xr.setReferenceSpaceType('local-floor');await renderer.xr.setSession(s);
      xrS.on=1;s.addEventListener('end',()=>{xrS.on=0;renderer.xr.enabled=false;btn.hidden=false;onEnd()})}
    catch(e){renderer.xr.enabled=false;btn.hidden=false}};
}
export const xrPulse=(a,ms)=>{for(const h of xrS.h)try{h.src.gamepad.hapticActuators[0].pulse(a,ms)}catch(e){}};
