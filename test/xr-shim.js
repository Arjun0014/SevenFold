// xr-shim.js — minimal fake navigator.xr for Playwright (docs/07 C). Injected with page.addInitScript.
// Fakes: isSessionSupported, requestSession → session with requestReferenceSpace, requestAnimationFrame (XRFrame with
// getViewerPose → two views, getPose for two tracked-pointer input sources), updateRenderState/renderState.baseLayer,
// inputSources, events, end; a global XRWebGLLayer whose framebuffer is null (Three renders to the default framebuffer)
// with per-eye viewports; gl.makeXRCompatible. Test API: window.__xr.{frames, press, release, sigil, end, state}.
(()=>{
  const st={head:[0,1.6,0],L:[-.25,1.2,-.4],R:[.25,1.2,-.4],frames:0,session:null,anim:null};
  const mat=p=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,p[0],p[1],p[2],1]);
  const persp=a=>{const n=.05,f=300,t=n*Math.tan(.7),r=t*a;return new Float32Array([n/r,0,0,0,0,n/t,0,0,0,0,-(f+n)/(f-n),-1,0,0,-2*f*n/(f-n),0])};
  const mkSrc=h=>({handedness:h,targetRayMode:'tracked-pointer',targetRaySpace:{h},gripSpace:{h},profiles:['generic-trigger-squeeze'],gamepad:undefined,hand:undefined});
  const srcs=[mkSrc('left'),mkSrc('right')];
  class Frame{constructor(s){this.session=s}
    getViewerPose(){const a=(innerWidth/2)/innerHeight,h=st.head;return{transform:{matrix:mat(h)},views:['left','right'].map((eye,i)=>({eye,projectionMatrix:persp(a),transform:{matrix:mat([h[0]+(i?.032:-.032),h[1],h[2]])}}))}}
    getPose(space){return{transform:{matrix:mat(space.h=='left'?st.L:st.R)}}}}
  class Sess{constructor(){this.l={};this.inputSources=srcs;this.renderState={baseLayer:null,layers:undefined,depthNear:.1,depthFar:1000};this.visibilityState='visible';this.environmentBlendMode='opaque';this.enabledFeatures=['local-floor'];this.ended=false;this.announced=false}
    addEventListener(k,f){(this.l[k]=this.l[k]||[]).push(f)}removeEventListener(k,f){this.l[k]=(this.l[k]||[]).filter(x=>x!==f)}
    dispatch(k,e){for(const f of(this.l[k]||[]).slice())f(Object.assign({type:k,session:this},e))}
    updateRenderState(s){Object.assign(this.renderState,s)}updateTargetFrameRate(){}
    async requestReferenceSpace(type){if(type!='local-floor'&&type!='local'&&type!='viewer')throw new Error('unsupported reference space');return{type}}
    requestAnimationFrame(cb){return requestAnimationFrame(t=>{if(this.ended)return;if(!this.announced){this.announced=true;this.dispatch('inputsourceschange',{added:srcs,removed:[]})}
      if(st.anim){const u=Math.min(1,(performance.now()-st.anim.t0)/st.anim.dur);st.anim.fn(u);if(u>=1){st.anim.done&&st.anim.done();st.anim=null}}
      st.frames++;cb(t,new Frame(this))})}
    cancelAnimationFrame(id){cancelAnimationFrame(id)}
    async end(){this.ended=true;this.dispatch('inputsourceschange',{added:[],removed:srcs});this.dispatch('end',{})}}
  window.XRWebGLLayer=class{constructor(s,gl){this.framebuffer=null;this.framebufferWidth=gl.drawingBufferWidth;this.framebufferHeight=gl.drawingBufferHeight;this.ignoreDepthValues=false;this.fixedFoveation=1}
    getViewport(v){const w=this.framebufferWidth/2;return{x:v.eye=='right'?w:0,y:0,width:w,height:this.framebufferHeight}}};
  for(const C of[window.WebGL2RenderingContext,window.WebGLRenderingContext])if(C)C.prototype.makeXRCompatible=async function(){};
  Object.defineProperty(navigator,'xr',{value:{isSessionSupported:async()=>true,requestSession:async()=>st.session=new Sess,addEventListener(){},removeEventListener(){}},configurable:true});
  const src=h=>srcs[h=='left'?0:1];
  window.__xr={
    state:()=>({frames:st.frames,on:!!(st.session&&!st.session.ended)}),
    frames:n=>new Promise(r=>{const t=st.frames+n;const f=()=>st.frames>=t?r(st.frames):requestAnimationFrame(f);f()}),
    press:(h,k)=>st.session.dispatch(k+'start',{inputSource:src(h)}),
    release:(h,k)=>{st.session.dispatch(k+'end',{inputSource:src(h)});st.session.dispatch(k,{inputSource:src(h)})},
    move:(h,p)=>{st[h=='left'?'L':'R']=p},
    // both squeezes held while the grips move through a sigil (world space: head at origin facing -z), then released
    sigil:(name,dur=500)=>new Promise(res=>{const Y=1.2,Z=-.4,g={
        lance:u=>{const d=.05+1.25*u;return[[-d/2,Y,Z],[d/2,Y,Z]]},
        shards:u=>{const x=-.15+.5*u;return[[x,Y,Z],[-x,Y,Z]]},
        maul:u=>{const y=Y+(u<.5?u*2:2-u*2)*.6;return[[-.1,y,Z],[.1,y,Z]]},
        halo:u=>{const t=u*6.6,x=Math.sin(t)*.22,y=Y+(1-Math.cos(t))*.22;return[[x-.1,y,Z],[x+.1,y,Z]]},
        prism:u=>{const t=u*3.49,c=Math.cos(t)*.15,s=Math.sin(t)*.15;return[[-c,Y-s,Z],[c,Y+s,Z]]}}[name];
      __xr.press('left','squeeze');__xr.press('right','squeeze');
      st.anim={t0:performance.now(),dur,fn:u=>{const[l,r]=g(u);st.L=l;st.R=r},done:()=>{setTimeout(()=>{__xr.release('left','squeeze');__xr.release('right','squeeze');setTimeout(res,400)},60)}}}),
    end:()=>st.session.end()};
})();
