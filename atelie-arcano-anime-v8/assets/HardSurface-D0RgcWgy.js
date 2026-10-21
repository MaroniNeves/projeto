import{G as e,R as t,Tn as n,Vr as r,Y as i,_t as a,ct as o,di as s,it as c,nt as l,st as u,ui as d,vt as f,xt as p}from"./settings-DdywqLlV.js";import{n as m,t as h}from"./shaderPatch-DNdzBjlE.js";var g=Math.PI*2,_=Math.PI/180,v=new s,y=new s,b=new s,x=new s,S=new p,C=Object.freeze({Y:0,X:1,Z:2}),w=Object.freeze({GEAR:0,PISTON:1,SAWBLADE:2,PLATE:3,BOLT:4,ANVIL:5});Object.freeze([`GEAR`,`PISTON`,`SAWBLADE`,`PLATE`,`BOLT`,`ANVIL`]);function T(e){return{teeth:14,pressureAngle:20,addendum:1,dedendum:1.25,backlash:.04,rootFillet:.45,flankSteps:6,tipSteps:2,rootSteps:2,thickness:.22,chamfer:.018,bore:.3,boreSegments:28,boreChamfer:.014,lightenHoles:0,lightenRadius:.14,lightenRing:.58,lightenSegments:16,creaseAngle:30,axis:C.Y,...e}}function E(e){return{length:2.4,segments:24,baseRadius:.46,baseHeight:.16,baseChamfer:.05,rodRadius:.17,collarAt:.46,collarRadius:.3,collarHeight:.13,collarChamfer:.045,headAt:.7,headRadius:.5,headChamfer:.07,rings:2,ringDepth:.035,ringHeight:.05,faceRecess:.05,creaseAngle:26,axis:C.Y,...e}}function D(e){return{teeth:22,rake:14,clearance:26,gullet:.16,gulletSteps:4,flankSteps:3,tipLand:.35,thickness:.05,chamfer:.012,arbor:.16,arborSegments:20,slots:4,slotDepth:.3,slotWidth:.035,slotSteps:3,creaseAngle:30,axis:C.X,...e}}function O(e){return{width:1,depth:.7,thickness:.12,corner:.1,cornerSteps:4,bevel:.03,bolts:4,boltRadius:.055,boltInset:.16,boltSegments:14,counterSink:.03,counterDepth:.035,creaseAngle:34,axis:C.Y,...e}}function k(e){return{length:2.2,headHeight:.62,headChamfer:.09,washer:.06,washerRadius:.62,shankRadius:.29,shankSegments:18,threadTurns:9,threadDepth:.035,threadFrom:.28,threadSteps:6,tipTaper:.1,creaseAngle:28,axis:C.Y,...e}}function A(e){return{height:.66,faceWidth:.5,faceDepth:.42,faceHeight:.14,waistWidth:.24,waistDepth:.22,waistHeight:.28,baseWidth:.52,baseDepth:.44,baseHeight:.12,corner:.11,cornerSteps:3,fillet:.62,filletPasses:4,sections:26,horn:.46,hornRadius:.3,hornDroop:.06,hornSections:10,hornSteps:12,creaseAngle:34,axis:C.Y,...e}}var j=class{constructor(){this.pos=[],this.tri=[],this.hint=[]}vertex(e,t,n,r=0){return this.pos.push(e,t,n),this.hint.push(r),this.hint.length-1}face(e,t,n){this.tri.push(e,t,n)}quad(e,t,n,r){this.tri.push(e,t,n,e,n,r)}get vertexCount(){return this.hint.length}},M=.22;function N(e,t={}){let{creaseAngle:n=30,axis:r=C.Y}=t,i=Math.cos(l(n,1,179)*_),s=e.pos,c=e.tri,d=e.vertexCount,p=0,m=0,h=0;for(let e=0;e<d;e++)p+=s[e*3],m+=s[e*3+1],h+=s[e*3+2];d>0&&(p/=d,m/=d,h/=d);let g=Array(d);for(let e=0;e<d;e++)g[e]=[];let v=[],y=[];for(let e=0;e<c.length;e+=3){let t=c[e],n=c[e+1],r=c[e+2],a=s[t*3],o=s[t*3+1],l=s[t*3+2],u=s[n*3]-a,d=s[n*3+1]-o,f=s[n*3+2]-l,p=s[r*3]-a,m=s[r*3+1]-o,h=s[r*3+2]-l,_=d*h-f*m,b=f*p-u*h,x=u*m-d*p,S=Math.hypot(_,b,x);if(!(S>1e-12))continue;let C=1/S,w=_*C,T=b*C,E=x*C;v.push(t,n,r);for(let e of[t,n,r]){let t=g[e],n=-1;for(let e=0;e<t.length;e++){let r=t[e],a=Math.hypot(r[0],r[1],r[2]);if(!(a<=1e-12)&&(r[0]*w+r[1]*T+r[2]*E)/a>=i){n=e;break}}n<0&&(n=t.length,t.push([0,0,0]));let r=t[n];r[0]+=_,r[1]+=b,r[2]+=x,y.push(n)}}let b=[],x=[],S=[],w=Array(d);for(let t=0;t<d;t++){let n=g[t];w[t]=S.length;let r=s[t*3],i=s[t*3+1],a=s[t*3+2];for(let s=0;s<n.length;s++){let c=n[s],l=Math.hypot(c[0],c[1],c[2])||1,d=c[0]/l,f=c[1]/l,g=c[2]/l;b.push(r,i,a),x.push(d,f,g);let _=e.hint[t];if(n.length>1){let e=r-p,t=i-m,n=a-h,s=Math.hypot(e,t,n)||1,c=(d*e+f*t+g*n)/s;_=Math.max(_,M*o(-.25,.35,c))}S.push(u(_))}}let T=Array(v.length);for(let e=0;e<v.length;e++)T[e]=w[v[e]]+y[e];ee(b,x,r);let E=new f;return E.setAttribute(`position`,new a(Float32Array.from(b),3)),E.setAttribute(`normal`,new a(Float32Array.from(x),3)),E.setAttribute(`aEdge`,new a(Float32Array.from(S),1)),E.setIndex(S.length>65535?new a(Uint32Array.from(T),1):new a(Uint16Array.from(T),1)),E.computeBoundingSphere(),E}function ee(e,t,n){let r=e.length/3;if(!r)return;for(let i=0;i<r;i++){let r=e[i*3],a=e[i*3+1],o=e[i*3+2],s=t[i*3],c=t[i*3+1],l=t[i*3+2];n===C.Y?(e[i*3+1]=o,e[i*3+2]=-a,t[i*3+1]=l,t[i*3+2]=-c):n===C.X&&(e[i*3]=o,e[i*3+2]=-r,t[i*3]=l,t[i*3+2]=-s)}let i=1/0,a=-1/0,o=1/0,s=-1/0,c=1/0,l=-1/0;for(let t=0;t<r;t++){let n=e[t*3],r=e[t*3+1],u=e[t*3+2];n<i&&(i=n),n>a&&(a=n),r<o&&(o=r),r>s&&(s=r),u<c&&(c=u),u>l&&(l=u)}let u=(i+a)*.5,d=(c+l)*.5,f=0;for(let t=0;t<r;t++){let n=e[t*3]-u,r=e[t*3+2]-d,i=Math.hypot(n,r);i>f&&(f=i)}let p=1/Math.max(f*2,s-o,1e-4);for(let t=0;t<r;t++)e[t*3]=(e[t*3]-u)*p,e[t*3+1]=(e[t*3+1]-o)*p,e[t*3+2]=(e[t*3+2]-d)*p}var te=.34;function ne(e,t){let n=e.length,r=Array(n);for(let i=0;i<n;i++){let a=e[i],o=e[(i-1+n)%n],s=e[(i+1)%n],c=a.x-o.x,l=a.y-o.y,u=Math.hypot(c,l)||1;c/=u,l/=u;let f=s.x-a.x,p=s.y-a.y,m=Math.hypot(f,p)||1;f/=m,p/=m;let h=-l,g=c,_=-p,v=f,y=h+_,b=g+v,x=Math.hypot(y,b);x<1e-6?(y=_,b=v):(y/=x,b/=x);let S=t/Math.max(y*_+b*v,te);r[i]=new d(a.x+y*S,a.y+b*S)}return r}function P(e,t,n,r,i=1){let a=[],o=Math.max(3,Math.round(r));for(let r=0;r<o;r++){let s=i*r*g/o;a.push(new d(e+Math.cos(s)*n,t+Math.sin(s)*n))}return a}function F(e,t){let{outline:n,holes:r=[],z0:i=0,z1:a=1,chamfer:o=0,chamferDepth:s=null,holeChamfer:c=0,holeChamferDepth:l=null,hint:d=0}=t,f=a-i,p=Math.min(s??o,f*.45),m=Math.min(l??c,f*.45),h=[i,i+p,i+m,a-m,a-p,a].sort((e,t)=>e-t).filter((e,t,n)=>t===0||e-n[t-1]>1e-7),g=(e,t,n)=>{if(t<=1e-7)return 0;let r=n>1e-7?u((e-i)/n):1,o=n>1e-7?u((a-e)/n):1;return t*(1-Math.min(r,o))},_=h.map(e=>({z:e,oi:g(e,o,p),hi:g(e,c,m)})),v=[n,...r],y=[];for(let t of _){let n=[];for(let r=0;r<v.length;r++){let i=r===0?t.oi:t.hi,a=r===0?o:c,s=i>1e-7?ne(v[r],i):v[r],l=Array(s.length),u=a>1e-7?Math.max(d,i/a):d;for(let n=0;n<s.length;n++)l[n]=e.vertex(s[n].x,s[n].y,t.z,u);n.push({ids:l,pts:s})}y.push(n)}for(let t=0;t<y.length-1;t++)for(let n=0;n<v.length;n++){let r=y[t][n].ids,i=y[t+1][n].ids,a=r.length;for(let t=0;t<a;t++){let n=(t+1)%a;e.quad(r[t],r[n],i[n],i[t])}}I(e,y[0],!1),I(e,y[y.length-1],!0)}function I(e,t,n){let i=t[0],a=t.slice(1),o=r.triangulateShape(i.pts,a.map(e=>e.pts)),s=[...i.ids];for(let e of a)s.push(...e.ids);for(let t of o){let r=s[t[0]],i=s[t[1]],a=s[t[2]];r===void 0||i===void 0||a===void 0||(n?e.face(r,i,a):e.face(r,a,i))}}function L(e,t){let{stations:n,segments:r=24,radial:i=null,capBottom:a=!0,capTop:o=!0,hint:s=0}=t,c=Math.max(3,Math.round(r)),l=[];for(let t of n){let n=Math.max(t.r,0),r=t.hint??s;if(n<1e-5){l.push({pole:!0,ids:[e.vertex(0,0,t.z,r)]});continue}let a=Array(c);for(let o=0;o<c;o++){let s=o*g/c,l=i?i(t.z,s,n):n;a[o]=e.vertex(Math.cos(s)*l,Math.sin(s)*l,t.z,r)}l.push({pole:!1,ids:a})}for(let t=0;t<l.length-1;t++){let n=l[t],r=l[t+1];if(!(n.pole&&r.pole))if(n.pole)for(let t=0;t<c;t++)e.face(n.ids[0],r.ids[t],r.ids[(t+1)%c]);else if(r.pole)for(let t=0;t<c;t++)e.face(r.ids[0],n.ids[(t+1)%c],n.ids[t]);else for(let t=0;t<c;t++){let i=(t+1)%c;e.quad(n.ids[t],n.ids[i],r.ids[i],r.ids[t])}}let u=l[0],d=l[l.length-1];if(a&&!u.pole){let t=e.vertex(0,0,n[0].z,s);for(let n=0;n<c;n++)e.face(t,u.ids[(n+1)%c],u.ids[n])}if(o&&!d.pole){let t=e.vertex(0,0,n[n.length-1].z,s);for(let n=0;n<c;n++)e.face(t,d.ids[n],d.ids[(n+1)%c])}}function R(e,t,n={}){let{capFirst:r=!0,capLast:i=!0,hint:a=0,hints:o=null}=n,s=t.map((t,n)=>{let r=Array(t.length),i=o?.[n]??a;for(let n=0;n<t.length;n++){let a=t[n];r[n]=e.vertex(a.x,a.y,a.z,i)}return r});for(let t=0;t<s.length-1;t++){let n=s[t],r=s[t+1],i=n.length;for(let t=0;t<i;t++){let a=(t+1)%i;e.quad(n[t],n[a],r[a],r[t])}}let c=(t,n,r)=>{let i=0,o=0,s=0;for(let e of n)i+=e.x,o+=e.y,s+=e.z;let c=1/Math.max(1,n.length),l=e.vertex(i*c,o*c,s*c,a),u=t.length;for(let n=0;n<u;n++){let i=(n+1)%u;r?e.face(l,t[n],t[i]):e.face(l,t[i],t[n])}};r&&c(s[0],t[0],!1),i&&c(s[s.length-1],t[t.length-1],!0)}function z(e,t,n,r,i){let a=Math.min(n,e*.99,t*.99),o=Math.max(e-a,0),c=Math.max(t-a,0),l=Math.max(1,Math.round(r)),u=[],d=(e,t,n)=>{for(let r=0;r<=l;r++){let o=n+r/l*(Math.PI/2);u.push(new s(e+Math.cos(o)*a,t+Math.sin(o)*a,i))}};return d(o,c,0),d(-o,c,Math.PI/2),d(-o,-c,Math.PI),d(o,-c,Math.PI*1.5),u}function re(e,t,n,r){let i=Math.max(3,Math.round(t)),a=[],o=e[0].z,s=e[e.length-1].z;for(let t=0;t<i;t++){let n=o+(s-o)*t/(i-1),r=0;for(;r<e.length-2&&e[r+1].z<n;)r++;let c=e[r],u=e[r+1],d=u.z-c.z>1e-9?l((n-c.z)/(u.z-c.z),0,1):0;a.push({z:n,w:c.w+(u.w-c.w)*d,d:c.d+(u.d-c.d)*d})}let c=u(n);for(let e=0;e<Math.max(0,Math.round(r));e++){let e=a.map(e=>({...e}));for(let t=1;t<a.length-1;t++)a[t].w=e[t].w+((e[t-1].w+e[t+1].w)*.5-e[t].w)*c,a[t].d=e[t].d+((e[t-1].d+e[t+1].d)*.5-e[t].d)*c,a[t].z=e[t].z+((e[t-1].z+e[t+1].z)*.5-e[t].z)*c}return a}function B(e){return Math.tan(e)-e}function V(e,t,n,r){let i=l(t/Math.max(e,1e-6),-1,1),a=Math.acos(i);return n+r-B(a)}function H(e){let t=Math.max(4,Math.round(e.teeth)),n=Math.max(e.addendum,.05),r=Math.max(e.dedendum,n*.2),i=1/(t+2*n),a=i*t/2,o=l(e.pressureAngle,5,35)*_,s=a*Math.cos(o),c=a+n*i,u=Math.max(a-r*i,i*.15),d=Math.PI/(2*t)*(1-l(e.backlash,0,.5)),f=B(o),p=Math.PI/t*.92,m=Math.max(s,u)+1e-5;if(V(m,s,d,f)>p){let e=m,t=c;for(let n=0;n<28;n++){let n=(e+t)*.5;V(n,s,d,f)>p?e=n:t=n}m=t}let h=c;if(V(c,s,d,f)<=1e-4){let e=m,t=c;for(let n=0;n<28;n++){let n=(e+t)*.5;V(n,s,d,f)>1e-4?e=n:t=n}h=Math.max(e,m*1.02)}return{teeth:t,module:i,alpha:o,pitch:a,base:s,tip:c,outer:h,root:u,psiPitch:d,invAlpha:f,capAngle:p,flankStart:m,halfAtStart:l(V(m,s,d,f),1e-4,p),halfAtTip:Math.max(V(h,s,d,f),0),pointed:h<c-1e-6}}function ie(e){let t=H(T(e));return t.pitch/t.outer}function ae(e){let{teeth:t,base:n,root:r,psiPitch:i,invAlpha:a,flankStart:o,halfAtStart:s,halfAtTip:c,outer:u,pointed:f}=H(e),p=Math.max(2,Math.round(e.flankSteps)),m=Math.max(1,Math.round(e.tipSteps)),h=Math.max(1,Math.round(e.rootSteps)),_=Math.PI/t-s,v=l(e.rootFillet,0,1)*Math.max(_,0)*.8,y=[],b=(e,t)=>y.push(new d(Math.cos(t)*e,Math.sin(t)*e));for(let e=0;e<t;e++){let l=e*g/t,_=l-Math.PI/t+v,x=l-s-v;for(let e=0;e<h;e++)b(r,_+(x-_)*e/h);let S=Math.cos(x)*r,C=Math.sin(x)*r,w=Math.cos(l-s)*r,T=Math.sin(l-s)*r,E=Math.cos(l-s)*o,D=Math.sin(l-s)*o;for(let e=0;e<3;e++){let t=e/3,n=1-t;y.push(new d(n*n*S+2*n*t*w+t*t*E,n*n*C+2*n*t*T+t*t*D))}for(let e=0;e<p;e++){let t=o+(u-o)*e/p;b(t,l-Math.max(V(t,n,i,a),c))}if(f)b(u,l);else for(let e=0;e<=m;e++)b(u,l-c+2*c*e/m);for(let e=p-1;e>=0;e--){let t=o+(u-o)*e/p;b(t,l+Math.max(V(t,n,i,a),c))}let O=Math.cos(l+s)*o,k=Math.sin(l+s)*o,A=Math.cos(l+s)*r,j=Math.sin(l+s)*r,M=Math.cos(l+s+v)*r,N=Math.sin(l+s+v)*r;for(let e=1;e<=3;e++){let t=e/3,n=1-t;y.push(new d(n*n*O+2*n*t*A+t*t*M,n*n*k+2*n*t*j+t*t*N))}}return U(y)}function U(e,t=1e-6){let n=[];for(let r of e){let e=n[n.length-1];e&&Math.abs(e.x-r.x)<t&&Math.abs(e.y-r.y)<t||n.push(r)}for(;n.length>3;){let e=n[0],r=n[n.length-1];if(Math.abs(e.x-r.x)<t&&Math.abs(e.y-r.y)<t)n.pop();else break}return n}function W(e=T()){let t=T(e),n=H(t),r=new j,i=[],a=l(t.bore,0,.85)*n.outer;a>.001&&i.push(P(0,0,a,t.boreSegments,-1));let o=Math.max(0,Math.round(t.lightenHoles));if(o>0){let e=l(t.lightenRing,0,.92)*n.outer,r=Math.max(l(t.lightenRadius,0,.4)*n.outer,.001);for(let n=0;n<o;n++){let a=n*g/o;i.push(P(Math.cos(a)*e,Math.sin(a)*e,r,t.lightenSegments,-1))}}let s=Math.max(t.thickness,.01);return F(r,{outline:ae(t),holes:i,z0:0,z1:s,chamfer:Math.min(t.chamfer,s*.4),holeChamfer:Math.min(t.boreChamfer,s*.4)}),N(r,{creaseAngle:t.creaseAngle,axis:t.axis})}function G(e){let t=Math.max(3,Math.round(e.teeth)),n=.5,r=Math.max(n*(1-l(e.gullet,.02,.6)),n*.2),i=g/t,a=l(e.tipLand,.02,.7)*i*.5,o=Math.log(n/r),s=Math.tan(l(e.rake,-35,45)*_),c=Math.tan(l(e.clearance,0,60)*_),u=(s+c)*o,f=(i-2*a)*.82,p=-2*a*.82,m=1;u>f&&u>1e-9?m=f/u:u<p&&u<-1e-9&&(m=p/u),s*=m,c*=m;let h=Math.max(1,Math.round(e.flankSteps)),v=Math.max(1,Math.round(e.gulletSteps)),y=[],b=(e,t)=>y.push(new d(Math.cos(t)*e,Math.sin(t)*e));for(let e=0;e<t;e++){let t=e*i;for(let e=0;e<=h;e++){let i=r+(n-r)*e/h;b(i,t-a-c*Math.log(n/i))}b(n,t+a);for(let e=1;e<=h;e++){let i=n-(n-r)*e/h;b(i,t+a+s*Math.log(n/i))}let l=t+a+s*o,u=t+i-a-c*o;for(let e=1;e<v;e++)b(r,l+(u-l)*e/v)}return U(y)}function K(e,t,n,r,i){let a=[],o=Math.cos(e),s=Math.sin(e),c=-s,l=o,u=Math.max(1,Math.round(i)),f=(e,t)=>{for(let n=0;n<=u;n++){let i=Math.PI*n/u,f=Math.cos(i)*r*t,p=Math.sin(i)*r*t;a.push(new d(o*(e+p)+c*f,s*(e+p)+l*f))}};return f(n,1),f(t,-1),a.reverse(),U(a)}function q(e=D()){let t=D(e),n=new j,r=.5,i=[],a=l(t.arbor,0,.6)*r;a>.001&&i.push(P(0,0,a,t.arborSegments,-1));let o=Math.max(0,Math.round(t.slots));if(o>0){let e=r*(1-l(t.gullet,.02,.6))-r*.03,n=Math.max(e-l(t.slotDepth,.02,.7)*r,a+r*.06),s=Math.max(l(t.slotWidth,.005,.2)*r,.001);if(e-n>s*2.2)for(let r=0;r<o;r++)i.push(K(r*g/o+Math.PI/o,n,e,s,t.slotSteps))}let s=Math.max(t.thickness,.006);return F(n,{outline:G(t),holes:i,z0:0,z1:s,chamfer:Math.min(t.chamfer,s*.4),holeChamfer:Math.min(t.chamfer*.6,s*.3)}),N(n,{creaseAngle:t.creaseAngle,axis:t.axis})}function J(e=O()){let t=O(e),n=new j,r=Math.max(t.width,.05)*.5,i=Math.max(t.depth,.05)*.5,a=Math.min(r,i)*2,o=z(r,i,l(t.corner,0,.5)*a,t.cornerSteps,0).map(e=>new d(e.x,e.y)),s=Math.max(0,Math.round(t.bolts)),c=[];if(s>0){let e=l(t.boltInset,.05,.45)*a,n=Math.max(l(t.boltRadius,.005,.25)*a,.001),o=Math.max(r-e,0),u=Math.max(i-e,0),d=[[o,u],[-o,u],[-o,-u],[o,-u],[0,u],[0,-u],[o,0],[-o,0]];for(let e=0;e<Math.min(s,d.length);e++)c.push(P(d[e][0],d[e][1],n,t.boltSegments,-1))}let u=Math.max(t.thickness,.01);return F(n,{outline:o,holes:c,z0:0,z1:u,chamfer:Math.min(t.bevel,u*.4),holeChamfer:l(t.counterSink,0,.3)*a,holeChamferDepth:Math.min(t.counterDepth,u*.45)}),N(n,{creaseAngle:t.creaseAngle,axis:t.axis})}function oe(e=E()){let t=E(e),n=new j,r=Math.max(t.length,.2),i=[],a=(e,t,n=0)=>i.push({r:Math.max(e,0),z:t,hint:n}),o=Math.max(t.baseRadius,.02),s=l(t.rodRadius,.01,o),c=Math.max(t.baseHeight,.01)*r*.25,u=Math.min(t.baseChamfer,c*.45,o*.45);a(0,0),a(o-u,0,1),a(o,u),a(o,c-u),a(o-u,c,1),a(s,c+u*.4);let d=l(t.collarAt,.05,.95)*r,f=l(t.collarRadius,s,o*1.2),p=Math.max(t.collarHeight,.01)*r*.5,m=Math.min(t.collarChamfer,p*.45,(f-s)*.9+1e-4);a(s,Math.max(d-p*.5-m,c+u)),a(f-m,d-p*.5,1),a(f,d-p*.5+m),a(f,d+p*.5-m),a(f-m,d+p*.5,1),a(s,d+p*.5+m);let h=l(t.headAt,.2,.98)*r,g=Math.max(t.headRadius,f),_=Math.min(t.headChamfer,g*.4,(r-h)*.4);a(s,Math.max(h-_,d+p*.5+m*1.5)),a(g-_,h,1),a(g,h+_);let v=Math.max(0,Math.round(t.rings)),y=r,b=y-_-(h+_);if(v>0&&b>0){let e=Math.min(t.ringDepth,g*.5),n=Math.min(t.ringHeight*r*.4,b/(v*2.4));for(let t=0;t<v;t++){let r=h+_+b*(t+.7)/(v+.4);a(g,r-n,1),a(g-e,r-n*.35),a(g-e,r+n*.35),a(g,r+n,1)}}a(g,y-_);let x=l(t.faceRecess,0,.4);a(g-_,y,1),x>1e-4?(a(g*.72,y,1),a(g*.6,y-x*g*.5),a(0,y-x*g*.55)):a(0,y);for(let e=1;e<i.length;e++)i[e].z<i[e-1].z&&(i[e].z=i[e-1].z);return L(n,{stations:i,segments:t.segments,capBottom:i[0].r>1e-5,capTop:i[i.length-1].r>1e-5}),N(n,{creaseAngle:t.creaseAngle,axis:t.axis})}function se(e=k()){let t=k(e),n=new j,r=Math.max(t.length,.3),i=Math.max(t.headHeight,.05),a=.5,o=a/Math.cos(Math.PI/6),s=[];for(let e=0;e<6;e++){let t=e*g/6+Math.PI/6;s.push(new d(Math.cos(t)*o,Math.sin(t)*o))}F(n,{outline:s,z0:r-i,z1:r,chamfer:Math.min(t.headChamfer,i*.4,a*.4)});let c=l(t.shankRadius,.02,a*.95),u=Math.max(t.washer,0),f=Math.max(t.washerRadius*.5,c),p=r-i,m=[],h=(e,t,n=0)=>m.push({r:Math.max(e,0),z:t,hint:n}),_=l(t.tipTaper,0,.5)*r;h(0,0),h(c*.45,0,1),_>.001?h(c,_):h(c,0);let v=l(t.threadFrom,0,.9)*p,y=Math.max(v,p-u*1.2),b=Math.max(0,Math.round(t.threadTurns)),x=l(t.threadDepth,0,c*.6),S=b>0&&x>1e-4&&y-v>.001;if(S){let e=Math.max(3,Math.round(t.threadSteps))*b;for(let t=0;t<=e;t++)h(c,v+(y-v)*t/e)}else h(c,y);u>1e-4?(h(c,p-u),h(f,p-u,1),h(f,p,1)):h(c,p),h(0,p);for(let e=1;e<m.length;e++)m[e].z<m[e-1].z&&(m[e].z=m[e-1].z);let C=S?(y-v)/b:1;return L(n,{stations:m,segments:t.shankSegments,capBottom:!1,capTop:!1,radial:S?(e,t,n)=>{if(e<v-1e-6||e>y+1e-6||n<c-1e-6)return n;let r=(e-v)/C-t/g,i=r-Math.floor(r);return n-x*(1-Math.abs(i*2-1))}:null}),N(n,{creaseAngle:t.creaseAngle,axis:t.axis})}function ce(e=A()){let t=A(e),n=new j,r=Math.max(t.height,.15),i=Math.max(t.baseHeight,.02)*r,a=Math.max(t.waistHeight,.02)*r,o=Math.max(t.faceHeight,.02)*r,c=i+a+o,u=c>1e-4?r/c:1,d=i*u,f=d+a*u,p=f+o*u,m=re([{z:0,w:t.baseWidth*.5,d:t.baseDepth*.5},{z:d*.55,w:t.baseWidth*.5,d:t.baseDepth*.5},{z:d,w:t.waistWidth*.62,d:t.waistDepth*.62},{z:d+(f-d)*.45,w:t.waistWidth*.5,d:t.waistDepth*.5},{z:f,w:t.waistWidth*.62,d:t.waistDepth*.62},{z:f+(p-f)*.42,w:t.faceWidth*.5,d:t.faceDepth*.5},{z:p,w:t.faceWidth*.5,d:t.faceDepth*.5}],t.sections,t.fillet,t.filletPasses).map(e=>{let n=Math.min(e.w,e.d);return z(Math.max(e.w,.001),Math.max(e.d,.001),l(t.corner,0,.9)*n,t.cornerSteps,e.z)});R(n,m,{capFirst:!0,capLast:!0,hints:m.map((e,t)=>t===m.length-1?1:t===m.length-2?.45:0)});let h=Math.max(t.horn,0)*1;if(h>.001){let e=Math.max(t.faceWidth,.05)*.5-.001,r=Math.max(l(t.hornRadius,.05,1)*t.faceDepth*.5,.001),i=p-Math.min(r,o*u*.9),a=Math.max(3,Math.round(t.hornSteps)),c=Math.max(3,Math.round(t.hornSections)),d=[];for(let n=0;n<=c;n++){let o=n/c,l=e+h*o,u=Math.max(r*(1-o*o*(3-2*o))*(1-o*.15)+r*.06*(1-o),.001),f=t.hornDroop*o*o,p=[];for(let e=0;e<a;e++){let t=e*g/a;p.push(new s(l,Math.cos(t)*u,i-f+Math.sin(t)*u))}d.push(p)}R(n,d,{capFirst:!1,capLast:!0})}return N(n,{creaseAngle:t.creaseAngle,axis:t.axis})}var le=[W,oe,q,J,se,ce];function ue(e,t){let n=le[e];if(!n)throw Error(`HardSurface: unknown shape kind ${e}`);return n(t)}var de=class{constructor(e={}){let{capacity:t=8}=e;this.capacity=Math.max(1,Math.round(t)),this._slots=new Map,this.changed=!1}get size(){return this._slots.size}get(e,t,n){let r=this._slots.get(e);if(!r){if(this._slots.size>=this.capacity)throw Error(`HardSurface: ShapeCache is full at ${this.capacity} slots — raise capacity`);r={kind:-1,keys:null,values:null,geometry:null},this._slots.set(e,r)}let i=r.keys??Object.keys(n),a=r.geometry===null||r.kind!==t||r.keys===null;if(!a){for(let e=0;e<i.length;e++)if(+n[i[e]]!==r.values[e]){a=!0;break}}if(this.changed=a,!a)return r.geometry;r.keys===null&&(r.keys=i,r.values=new Float64Array(i.length));for(let e=0;e<i.length;e++)r.values[e]=+n[i[e]];return r.kind=t,r.geometry?.dispose(),r.geometry=ue(t,n),r.geometry}dispose(){for(let e of this._slots.values())e.geometry?.dispose();this._slots.clear()}};function fe(){return{origin:null,direction:null,side:null,module:.16,addendum:1,teeth:null,spin:1.6,time:0,phase:0,bearingSpread:.13,bearingBias:0,lift:.02,reverse:!1}}var pe=[10,14,18],me=class{constructor(e={}){let{capacity:t=12}=e;this.capacity=Math.max(1,Math.round(t)),this._nodes=[];for(let e=0;e<this.capacity;e++)this._nodes.push({teethRoll:0,bearingRoll:0});this._count=0,this._teeth=new Int32Array(this.capacity),this._pitch=new Float64Array(this.capacity),this._tip=new Float64Array(this.capacity),this._angle=new Float64Array(this.capacity),this._rate=new Float64Array(this.capacity),this._u=new Float64Array(this.capacity),this._v=new Float64Array(this.capacity),this._bearing=new Float64Array(this.capacity),this._handed=-1,this._lift=0}get count(){return this._count}plant(e,t=Math.random()*100){this._count=l(Math.round(e),0,this.capacity);for(let e=0;e<this._count;e++){let n=this._nodes[e];n.teethRoll=c(t*7.13+e*3.77),n.bearingRoll=c(t*2.91+e*9.41)*2-1}return this._count}clear(){this._count=0}solve(e){let t=Array.isArray(e.teeth)&&e.teeth.length?e.teeth:pe,n=Math.max(e.module??.16,1e-4),r=e.addendum??1,i=(e.bearingSpread??.13)*g,a=(e.bearingBias??0)*g,o=(e.spin??1.6)*(e.reverse?-1:1),s=e.time??0;this._lift=e.lift??0;let c=e.direction,u=e.side;this._handed=c&&u&&Math.sign(c.z*u.x-c.x*u.z)||-1;let d=0;for(let c=0;c<this._count;c++){let u=this._nodes[c],f=l(Math.floor(u.teethRoll*t.length),0,t.length-1),p=Math.max(4,Math.round(t[f]));if(this._teeth[c]=p,this._pitch[c]=n*p/2,this._tip[c]=this._pitch[c]+r*n,c===0){this._u[0]=0,this._v[0]=0,this._bearing[0]=0,this._angle[0]=(e.phase??0)*g+o*s,this._rate[0]=o;continue}d+=a+u.bearingRoll*i,this._bearing[c]=d;let m=this._pitch[c-1]+this._pitch[c];this._u[c]=this._u[c-1]+Math.cos(d)*m,this._v[c]=this._v[c-1]+Math.sin(d)*m;let h=this._teeth[c-1]/p;this._angle[c]=d+Math.PI+h*(d-this._angle[c-1])-Math.PI/p,this._rate[c]=-h*this._rate[c-1]}}teethOf(e){return this._teeth[e]}pitchRadiusOf(e){return this._pitch[e]}tipRadiusOf(e){return this._tip[e]}scaleOf(e,t=0){return t>1e-6?this._pitch[e]*2/t:this._tip[e]*2}angleOf(e){return this._angle[e]}rateOf(e){return this._rate[e]}yawOf(e){return this._handed*this._angle[e]}positionOf(e,t,n){return n.set(0,0,0),t.origin&&n.copy(t.origin),t.direction&&n.addScaledVector(t.direction,this._u[e]),t.side&&n.addScaledVector(t.side,this._v[e]),n.y+=this._lift,n}contactOf(e,t,n){if(e<=0)return this.positionOf(0,t,n);let r=this._pitch[e-1],i=this._pitch[e],a=r+i>1e-9?r/(r+i):.5;return this.positionOf(e-1,t,n),this.positionOf(e,t,v),n.lerp(v,a)}},Y=Object.freeze({LINEAR:0,CIRCUMFERENTIAL:1,RADIAL:2});Object.freeze([`LINEAR`,`CIRCUMFERENTIAL`,`RADIAL`]);function he(){return{colorMetal:`#9aa1a9`,colorDeep:`#3d4248`,colorScale:`#2b2723`,colorPolish:`#e6edf5`,colorSpec:`#fff3e2`,roughness:.36,metalness:.94,envIntensity:1,brush:Y.CIRCUMFERENTIAL,brushAxisX:0,brushAxisY:1,brushAxisZ:0,anisotropy:.78,specular:1.5,grain:.55,grainScale:90,grainStretch:24,scale:.3,scaleScale:6.5,scaleSharp:.55,pit:.35,pitScale:55,wear:.6,wearGrain:.4,heat:0,heatCold:300,heatHot:2e3,heatRef:1250,heatExponent:4,heatGlow:2.4,heatTint:.8,heatEdge:.22,glow:1,shaderIntensity:1,noiseFrequency:1}}var X=`
uniform float uBrushMode;
uniform vec3  uBrushAxis;

vec3 hardBrushDir(vec3 localPos) {
  vec3 axis = uBrushAxis;
  float len = length(axis);
  axis = len > 1e-5 ? axis / len : vec3(0.0, 1.0, 0.0);
  vec3 t;
  if (uBrushMode < 0.5) {
    t = axis;
  } else if (uBrushMode < 1.5) {
    t = cross(axis, localPos);
  } else {
    t = localPos - axis * dot(localPos, axis);
  }
  // On the axis itself both of the derived modes collapse. Any consistent
  // direction will do there, because there is no surface there either.
  float tl = length(t);
  return tl > 1e-5 ? t / tl : normalize(cross(axis, vec3(0.371, 0.629, 0.812)));
}
`,Z=`
vec3 hardBlackbody(float kelvin) {
  float t = clamp(kelvin, 700.0, 25000.0);
  float i1 = 1.0 / t;
  float i2 = i1 * i1;
  float i3 = i2 * i1;

  float x;
  if (t < 1667.0) {
    // Below Kim's range: the low-temperature locus, fitted in 1000/T.
    float u = 1000.0 * i1;
    x = 0.32933 + 0.495206 * u - 0.171736 * u * u;
  } else if (t < 4000.0) {
    x = -0.2661239e9 * i3 - 0.2343589e6 * i2 + 0.8776956e3 * i1 + 0.179910;
  } else {
    x = -3.0258469e9 * i3 + 2.1070379e6 * i2 + 0.2226347e3 * i1 + 0.240390;
  }

  float x2 = x * x;
  float x3 = x2 * x;
  float y;
  // Kim's y is a fit in x, not in T, and it holds well past the end of the
  // x fit it was published with — which is why the low branch above only had
  // to replace x.
  if (t < 2222.0) {
    y = -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683;
  } else if (t < 4000.0) {
    y = -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867;
  } else {
    y = 3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483;
  }

  y = max(y, 1e-3);
  float bigY = 1.0;
  float bigX = (x / y) * bigY;
  float bigZ = ((1.0 - x - y) / y) * bigY;

  vec3 rgb = vec3(
     3.2404542 * bigX - 1.5371385 * bigY - 0.4985314 * bigZ,
    -0.9692660 * bigX + 1.8760108 * bigY + 0.0415560 * bigZ,
     0.0556434 * bigX - 0.2040259 * bigY + 1.0572252 * bigZ
  );
  rgb = max(rgb, vec3(0.0));
  // Normalise the hue; the brightness is the T^4 term's job, not the locus's.
  return rgb / max(max(rgb.r, max(rgb.g, rgb.b)), 1e-4);
}
`;function ge(e,t=S){let n=l(e,700,25e3),r=1/n,i=r*r,a=i*r,o;if(n<1667){let e=1e3*r;o=.32933+.495206*e-.171736*e*e}else o=n<4e3?-266123900*a-234358.9*i+877.6956*r+.17991:-3025846900*a+2107037.9*i+222.6347*r+.24039;let s=o*o,c=s*o,u;u=n<2222?-1.1063814*c-1.3481102*s+2.18555832*o-.20219683:n<4e3?-.9549476*c-1.37418593*s+2.09137015*o-.16748867:3.081758*c-5.8733867*s+3.75112997*o-.37001483,u=Math.max(u,.001);let d=o/u,f=(1-o-u)/u,p=3.2404542*d-1.5371385-.4985314*f,m=-.969266*d+1.8760108+.041556*f,h=.0556434*d-.2040259+1.0572252*f;p=Math.max(p,0),m=Math.max(m,0),h=Math.max(h,0);let g=Math.max(p,m,h,1e-4);return t.setRGB(p/g,m/g,h/g),t}function _e(e,t){let n=t?.heatCold??300;return n+((t?.heatHot??2e3)-n)*u(e)}function ve(t={}){let{environment:r=null,flatShading:a=!1}=t,o=new n({color:16777215,roughness:.36,metalness:.94,flatShading:a}),c={uTime:e.uTime,uLightDir:e.uLightDir,uColorMetal:{value:new p(`#9aa1a9`)},uColorDeep:{value:new p(`#3d4248`)},uColorScale:{value:new p(`#2b2723`)},uColorPolish:{value:new p(`#e6edf5`)},uColorSpec:{value:new p(`#fff3e2`)},uBrushMode:{value:Y.CIRCUMFERENTIAL},uBrushAxis:{value:new s(0,1,0)},uAniso:{value:.78},uSpecular:{value:1.5},uGrain:{value:.55},uGrainScale:{value:90},uGrainStretch:{value:24},uScale:{value:.3},uScaleScale:{value:6.5},uScaleSharp:{value:.55},uPit:{value:.35},uPitScale:{value:55},uWear:{value:.6},uWearGrain:{value:.4},uHeat:{value:0},uHeatCold:{value:300},uHeatHot:{value:2e3},uHeatRef:{value:1250},uHeatExponent:{value:4},uHeatGlow:{value:2.4},uHeatTint:{value:.8},uHeatEdge:{value:.22}},l=e=>{Object.assign(e.uniforms,c),e.vertexShader=m(e.vertexShader,`#include <common>`,`#include <common>
       attribute float aEdge;
       attribute float aHeat;
       varying vec3  vHardLocal;
       varying vec3  vHardTangent;
       varying float vHardEdge;
       varying float vHardHeat;
       ${X}`),e.vertexShader=m(e.vertexShader,`#include <begin_vertex>`,`#include <begin_vertex>
       vHardLocal = transformed;
       vHardEdge  = aEdge;
       vHardHeat  = aHeat;
       {
         vec3 hardT = hardBrushDir(transformed);
         #ifdef USE_INSTANCING
           hardT = mat3(instanceMatrix) * hardT;
         #endif
         // modelViewMatrix, NOT normalMatrix — see the header.
         vHardTangent = mat3(modelViewMatrix) * hardT;
       }`),e.fragmentShader=m(e.fragmentShader,`#include <common>`,`#include <common>
       uniform vec3  uColorMetal;
       uniform vec3  uColorDeep;
       uniform vec3  uColorScale;
       uniform vec3  uColorPolish;
       uniform vec3  uColorSpec;
       uniform vec3  uLightDir;
       uniform float uAniso;
       uniform float uSpecular;
       uniform float uGrain;
       uniform float uGrainScale;
       uniform float uGrainStretch;
       uniform float uScale;
       uniform float uScaleScale;
       uniform float uScaleSharp;
       uniform float uPit;
       uniform float uPitScale;
       uniform float uWear;
       uniform float uWearGrain;
       uniform float uHeat;
       uniform float uHeatCold;
       uniform float uHeatHot;
       uniform float uHeatRef;
       uniform float uHeatExponent;
       uniform float uHeatGlow;
       uniform float uHeatTint;
       uniform float uHeatEdge;
       varying vec3  vHardLocal;
       varying vec3  vHardTangent;
       varying float vHardEdge;
       varying float vHardHeat;
       ${i}
       ${X}
       ${Z}

       /* Filled once per fragment by hardResolve(), read by three chunks.
          Globals rather than a struct returned three times over: the grain is
          four octaves of noise and paying for it in <roughnessmap_fragment>,
          again in <metalnessmap_fragment> and again after
          <emissivemap_fragment> was measurably the most expensive line in the
          material. */
       float hardGrainV;
       float hardPitV;
       float hardScaleV;
       float hardWearV;

       void hardResolve() {
         vec3 t = hardBrushDir(vHardLocal);
         vec3 q = vHardLocal * uGrainScale;
         // Squash the sample along the brush so the noise draws streaks that
         // run WITH the grain. The first version scaled the whole coordinate
         // and produced a uniform sandblast: correct roughness statistics,
         // no direction, and therefore no read at all.
         float stretch = max(uGrainStretch, 1.0);
         q += t * dot(q, t) * (1.0 / stretch - 1.0);
         hardGrainV = fbm3(q);

         hardPitV = smoothstep(0.42, 0.95, ridged(vHardLocal * uPitScale, 4));

         float flake = fbm3(vHardLocal * uScaleScale + 17.3) * 0.5 + 0.5;
         float edgeW = mix(0.34, 0.03, clamp(uScaleSharp, 0.0, 1.0));
         hardScaleV = smoothstep(0.5 - edgeW, 0.5 + edgeW, flake);

         // The grain breaks the wear up so a chamfer is a broken glint rather
         // than a drawn line, which is the tell of a bevel modifier.
         hardWearV = clamp(vHardEdge * (1.0 - clamp(uWearGrain, 0.0, 1.0) * (hardGrainV * 0.5 + 0.5)), 0.0, 1.0);
       }`),e.fragmentShader=m(e.fragmentShader,`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>
       hardResolve();
       roughnessFactor = clamp(
         roughnessFactor
           + hardGrainV * uGrain * 0.22
           + hardPitV * uPit * 0.4
           + hardScaleV * uScale * 0.4
           - hardWearV * uWear * 0.28,
         0.035, 1.0);`),e.fragmentShader=m(e.fragmentShader,`#include <metalnessmap_fragment>`,`#include <metalnessmap_fragment>
       metalnessFactor = clamp(metalnessFactor - hardScaleV * uScale * 0.6, 0.0, 1.0);`),e.fragmentShader=m(e.fragmentShader,`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
       {
         vec3 body = uColorMetal;
         body = mix(body, uColorDeep, hardPitV * clamp(uPit, 0.0, 1.0));
         body = mix(body, uColorScale, hardScaleV * clamp(uScale, 0.0, 1.0));
         body = mix(body, uColorPolish, hardWearV * clamp(uWear, 0.0, 1.0) * 0.7);

         /* --- anisotropic specular, Ward, one key light --- */
         vec3 N = normalize(normal);
         vec3 V = normalize(vViewPosition);
         vec3 L = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
         vec3 X = vHardTangent - N * dot(vHardTangent, N);
         float xl = length(X);
         X = xl > 1e-4 ? X / xl : normalize(cross(N, vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
         vec3 B = cross(N, X);

         float ndl = dot(N, L);
         float ward = 0.0;
         if (ndl > 0.0) {
           vec3 H = normalize(L + V);
           float ndv = max(dot(N, V), 1e-3);
           float ndh = max(dot(N, H), 1e-3);
           float rough = clamp(roughnessFactor, 0.03, 1.0);
           float alpha = rough * rough;
           float aspect = sqrt(1.0 - 0.9 * clamp(uAniso, 0.0, 1.0));
           float ax = max(alpha / max(aspect, 1e-3), 2e-3);
           float ay = max(alpha * aspect, 2e-3);
           float hx = dot(H, X) / ax;
           float hy = dot(H, B) / ay;
           ward = exp(-(hx * hx + hy * hy) / (ndh * ndh)) /
                  (4.0 * PI * ax * ay * sqrt(max(ndl * ndv, 1e-4)));
           // Ward has no shadowing term and goes to infinity at grazing.
           ward = min(ward, 24.0) * ndl;
         }
         ward *= (1.0 - hardScaleV * clamp(uScale, 0.0, 1.0) * 0.85);
         ward *= 1.0 + hardWearV * clamp(uWear, 0.0, 1.0) * 0.6;

         /* --- blackbody --- */
         // Edges run cooler: a chamfer has more surface per unit of steel
         // behind it, so it is the first thing to go black in a quench and the
         // last thing to come up in a fire.
         float heat = clamp(uHeat + vHardHeat - vHardEdge * uHeatEdge, 0.0, 1.0);
         float kelvin = mix(uHeatCold, uHeatHot, heat);
         vec3 hot = hardBlackbody(kelvin);
         float emit = pow(max(kelvin, 1.0) / max(uHeatRef, 1.0), max(uHeatExponent, 0.1));

         body = mix(body, hot, clamp(emit * uHeatTint, 0.0, 1.0));
         diffuseColor.rgb *= body;

         vec3 glow = hot * emit * uHeatGlow;
         glow += uColorSpec * ward * uSpecular;
         // Reinhard ceiling, as in IceMaterial: forging heat and a specular
         // hit land on the same pixel constantly and the sum runs past 30.
         glow /= 1.0 + glow * 0.2;

         totalEmissiveRadiance += glow;
       }`)};return r?r.registerShadowCasterWithPatch(o,l):h(o,l),o.userData.uniforms=c,o.userData.sync=e=>$(o,e),o}function Q(e,n,r,i){i[r]!==n&&(i[r]=n,e.value.copy(t(n)))}function $(e,t={}){let n=e.userData.uniforms;if(!n)return e;let r=e.userData.colorCache??={},i=t.glow??1,a=t.shaderIntensity??1,o=t.noiseFrequency??1;return Q(n.uColorMetal,t.colorMetal??`#9aa1a9`,`metal`,r),Q(n.uColorDeep,t.colorDeep??`#3d4248`,`deep`,r),Q(n.uColorScale,t.colorScale??`#2b2723`,`scale`,r),Q(n.uColorPolish,t.colorPolish??`#e6edf5`,`polish`,r),Q(n.uColorSpec,t.colorSpec??`#fff3e2`,`spec`,r),n.uBrushMode.value=t.brush??Y.CIRCUMFERENTIAL,n.uBrushAxis.value.set(t.brushAxisX??0,t.brushAxisY??1,t.brushAxisZ??0),n.uAniso.value=u(t.anisotropy??.78),n.uSpecular.value=(t.specular??1.5)*a,n.uGrain.value=(t.grain??.55)*a,n.uGrainScale.value=(t.grainScale??90)*o,n.uGrainStretch.value=Math.max(t.grainStretch??24,1),n.uScale.value=u(t.scale??.3),n.uScaleScale.value=(t.scaleScale??6.5)*o,n.uScaleSharp.value=u(t.scaleSharp??.55),n.uPit.value=u(t.pit??.35),n.uPitScale.value=(t.pitScale??55)*o,n.uWear.value=u(t.wear??.6),n.uWearGrain.value=u(t.wearGrain??.4),n.uHeat.value=u(t.heat??0),n.uHeatCold.value=Math.max(t.heatCold??300,1),n.uHeatHot.value=Math.max(t.heatHot??2e3,n.uHeatCold.value+1),n.uHeatRef.value=Math.max(t.heatRef??1250,1),n.uHeatExponent.value=Math.max(t.heatExponent??4,.1),n.uHeatGlow.value=(t.heatGlow??2.4)*i,n.uHeatTint.value=u(t.heatTint??.8),n.uHeatEdge.value=u(t.heatEdge??.22),e.roughness=l(t.roughness??.36,.02,1),e.metalness=u(t.metalness??.94),e.envMapIntensity=t.envIntensity??1,e}function ye(){return{lift:.05,bounce:.55,rise:.3,speedGain:.55,speedFloor:1.2,speedCeiling:26,fan:.6,swing:.22,graze:.04,jets:5,spread:.1,speedVariance:.5,drift:.12}}var be=class{constructor(){this.origin=new s,this.direction=new s,this.normal=new s(0,1,0),this.binormal=new s(1,0,0),this.rimSpeed=0,this.speed=0,this.jets=1,this._inherit=new s,this._jet=new s,this._spread=.1,this._variance=.5,this._fan=.6,this._swing=.22,this._graze=.04}static rimVelocity(e,t,n,r,i){return v.copy(t).normalize().multiplyScalar(n),y.copy(r).sub(i),e.copy(v).cross(y)}solve(e,t,n,r={}){let i=r.lift??.05,a=u(r.bounce??.55),o=u(r.rise??.3);this.normal.copy(t),this.normal.lengthSq()<1e-8&&this.normal.set(0,1,0),this.normal.normalize(),this.rimSpeed=n.length(),this.origin.copy(e).addScaledVector(this.normal,i),b.copy(n);let s=b.dot(this.normal);s<0&&b.addScaledVector(this.normal,-(1+a)*s),b.lengthSq()<1e-10&&b.copy(this.normal),b.normalize(),b.addScaledVector(this.normal,o).normalize(),this.direction.copy(b),x.copy(this.normal).cross(this.direction),x.lengthSq()<1e-10&&x.set(this.normal.y,this.normal.z,this.normal.x).cross(this.normal),this.binormal.copy(x).normalize();let c=r.speedGain??.55,d=r.speedFloor??1.2,f=r.speedCeiling??26;return this.speed=l(this.rimSpeed*c,d,Math.max(f,d)),this._inherit.copy(n).multiplyScalar(r.drift??.12),this.jets=Math.max(1,Math.round(r.jets??5)),this._fan=r.fan??.6,this._swing=r.swing??.22,this._graze=Math.max(r.graze??.04,0),this._spread=r.spread??.1,this._variance=r.speedVariance??.5,this}jet(e,t){let n=(this.jets>1?e/(this.jets-1)-.5:0)*this._fan,r=(c(e*12.9898+4.1)*2-1)*this._swing;this._jet.copy(this.direction).applyAxisAngle(this.binormal,n),this._jet.applyAxisAngle(this.normal,r).normalize();let i=this._graze-this._jet.dot(this.normal);return i>0&&this._jet.addScaledVector(this.normal,i).normalize(),t.position=this.origin,t.direction=this._jet,t.speed=this.speed,t.spread=this._spread,t.speedVariance=this._variance,t.inherit=this._inherit,t}};export{_e as _,w as a,D as b,ge as c,J as d,ie as f,he as g,ye as h,C as i,k as l,fe as m,me as n,de as o,T as p,be as r,A as s,Y as t,ve as u,E as v,$ as x,O as y};
//# sourceMappingURL=HardSurface-D0RgcWgy.js.map