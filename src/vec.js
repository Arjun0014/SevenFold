// vec.js — tiny vec3/quat helpers on plain arrays. No Three dependency.
export const {sin,cos,abs,min,max,hypot,sqrt,PI,atan2,floor,round}=Math;
export const V=(x=0,y=0,z=0)=>[x,y,z];
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const len=a=>hypot(a[0],a[1],a[2]);
export const dist=(a,b)=>len(sub(a,b));
export const norm=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l]};
export const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
export const clamp=(x,a,b)=>x<a?a:x>b?b:x;
// rotate vector v by quaternion q=[x,y,z,w]
export const qrot=(q,v)=>{const[x,y,z,w]=q,[a,b,c]=v,tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx]};
// yaw of a quaternion: forward = q*(0,0,-1); yaw measured so that yaw 0 => forward +z (arena convention)
export const yawOf=q=>{const f=qrot(q,[0,0,-1]);return atan2(f[0],f[2])};
export const qyaw=y=>[0,sin(y/2),0,cos(y/2)]; // quaternion rotating about y by angle y
// closest distance from point p to segment a-b; returns [distance, t]
export const segd=(p,a,b)=>{const d=sub(b,a),l2=dot(d,d)||1e-9,t=clamp(dot(sub(p,a),d)/l2,0,1);return [dist(p,add(a,mul(d,t))),t]};
