import{$t as e,Br as t,Gr as n,Jt as r,K as i,Qt as a,R as o,Rt as s,V as c,Y as l,_t as u,at as d,di as f,en as p,jn as m,q as h,st as g,xt as _,yn as v,zn as y}from"./settings-DdywqLlV.js";var b=Math.PI*2,x=.004,S=Object.freeze({LINE:`line`,ARC:`arc`,ROLL:`roll`,FALL:`fall`,HOMING:`homing`,LISSAJOUS:`lissajous`,VOLLEY:`volley`}),C=Object.freeze({AUTO:`auto`,NONE:`none`,RIPPLE:`ripple`,HASH:`hash`});function w(e,t,n,r){let i=Math.max(.01,n),a=Math.floor(e/i),o=Math.floor(t/i),s=Math.sin(a*127.1+o*311.7+r*74.7)*43758.5453123,c=Math.sin(a*269.5+o*183.3-r*41.3)*24634.6345345,l=(s-Math.floor(s))*.65+(c-Math.floor(c))*.35;return l-Math.floor(l)}var T=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform float uClock;        // seconds since the cast began
  uniform vec3  uSideAxis;     // the cast's lateral unit vector
  uniform float uPathCurve;    // easing exponent on the launch → land parameter
  uniform float uApex;         // ballistic loft, metres
  uniform float uApexCurve;    // >1 flattens the top of the lob
  uniform float uWeaveSide;    // lateral weave amplitude at launch, metres
  uniform float uWeaveUp;      // vertical weave amplitude at launch, metres
  uniform float uWeaveTurns;   // lateral cycles over the whole flight
  uniform float uWeaveTurnsUp; // vertical cycles over the whole flight
  uniform float uWeavePhase;   // radians the vertical weave leads the lateral
  uniform float uWeaveDecay;   // >0 pulls the weave to zero at the target

  uniform float uTrailSpan;    // how far back the tail reaches, seconds
  uniform float uTrailBurn;    // seconds the trail takes to eat itself after landing
  uniform float uTrailWidth;   // width at the head, metres
  uniform float uTrailTaper;   // >1 sharpens the tail to a point
  uniform float uTrailLift;    // metres the tail floats above the flown path

  attribute vec3  aLaunch;
  attribute vec3  aLand;
  attribute vec2  aTiming;     // x = launch delay (s), y = flight time (s)
  attribute vec4  aDice;       // seed, phase, weave sign, spin — all unitless

  varying float vAlong;        // 0 tail → 1 head
  varying float vSide;         // -1 .. 1 across the ribbon
  varying float vSeed;
  varying float vBurn;
  varying vec3  vWorld;
  varying float vViewZ;

  /**
   * The flight. Mirror of _pathPoint() in Projectile.js — if you change one,
   * change the other, or the body and its own trail will part company.
   */
  vec3 pathAt(float tau) {
    float t = clamp(tau, 0.0, 1.0);
    float s = pow(t, max(uPathCurve, 0.01));
    vec3 p = mix(aLaunch, aLand, s);

    p.y += uApex * pow(max(sin(PI * t), 0.0), max(uApexCurve, 0.05));

    float decay = pow(1.0 - t, max(uWeaveDecay, 0.0));
    float phase = aDice.y * TAU;
    p += uSideAxis * (uWeaveSide * aDice.z * decay * sin(TAU * uWeaveTurns * t + phase));
    p.y += uWeaveUp * aDice.z * decay * sin(TAU * uWeaveTurnsUp * t + phase + uWeavePhase);
    return p;
  }

  void main() {
    float flight = max(aTiming.y, 1e-3);
    float raw = (uClock - aTiming.x) / flight;

    // Before the body leaves the hand there is nothing to trail. Collapse the
    // whole instance outside the clip volume rather than drawing a dot at the
    // launch point.
    if (raw < 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    float head = min(raw, 1.0);
    float over = max(0.0, raw - 1.0) * flight;              // seconds since landing
    float burn = clamp(over / max(uTrailBurn, 1e-3), 0.0, 1.0);
    // The tail catches the head up rather than the whole ribbon fading: a trail
    // that dims uniformly reads as a light going out, one that shortens reads as
    // something that stopped being made.
    float span = (uTrailSpan / flight) * (1.0 - burn);
    float tail = max(0.0, head - span);

    float v = position.x;
    float tau = mix(tail, head, v);

    vec3 centre = pathAt(tau);
    vec3 ahead = pathAt(tau + ${x.toFixed(4)});
    vec3 tangent = ahead - centre;
    if (dot(tangent, tangent) < 1e-10) tangent = vec3(0.0, 0.0, 1.0);
    tangent = normalize(tangent);

    vec3 view = cameraPosition - centre;
    vec3 side = cross(tangent, view);
    if (dot(side, side) < 1e-10) side = vec3(1.0, 0.0, 0.0);
    side = normalize(side);

    float profile = pow(clamp(v, 0.0, 1.0), max(uTrailTaper, 0.01));
    vec3 world = centre
      + side * (position.y * 0.5 * uTrailWidth * profile)
      + vec3(0.0, uTrailLift * (1.0 - v), 0.0);

    vAlong = v;
    vSide = position.y;
    vSeed = aDice.x;
    vBurn = burn;
    vWorld = world;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,E=`
  uniform float uTime;
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform float uGlobalGlow;

  uniform vec3  uColorA;       // at the head
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorD;       // at the tail
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uCore;         // how tightly light crowds the centre line
  uniform float uHeadBias;     // >0 keeps the brightness near the body
  uniform float uNoise;        // how hard the grain eats into the ribbon
  uniform float uNoiseScale;   // features per metre
  uniform float uNoiseSpeed;
  uniform float uSoftFade;     // metres of depth feather against solid geometry

  varying float vAlong;
  varying float vSide;
  varying float vSeed;
  varying float vBurn;
  varying vec3  vWorld;
  varying float vViewZ;

  ${l}
  ${h}

  void main() {
    // Across the ribbon: a hot filament in a soft sheath. The exponent is what
    // stops a wide trail reading as a flat strip of colour.
    float across = 1.0 - abs(vSide);
    float body = pow(clamp(across, 0.0, 1.0), max(uCore, 0.05));

    // Along it: the grain is sampled in *world* space so it stays pinned to the
    // air the body flew through instead of sliding along the ribbon's own uv,
    // which is the tell that gives a scrolling texture away.
    float grain = fbm3(vWorld * uNoiseScale + vec3(0.0, uTime * uNoiseSpeed, vSeed * 31.0));
    body *= 1.0 - uNoise * (0.5 - 0.5 * grain);

    float head = mix(1.0, pow(clamp(vAlong, 0.0, 1.0), 1.6), clamp(uHeadBias, 0.0, 1.0));
    float alpha = body * head * uOpacity * (1.0 - vBurn);
    if (alpha < 0.004) discard;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    vec3 colour = gradient4(uColorA, uColorB, uColorC, uColorD, 1.0 - vAlong);
    colour *= uGlow * uGlobalGlow;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`,D=new f,O=new f,k=new f,A=new f,j=new f,M=new m,N=new y,P=new y,F=new f(0,1,0),I=class{constructor(e,{capacity:t=48,geometry:n,shapeKey:i=null,material:o,trail:l=!0,trailNodes:u=28,trailAdditive:d=!0,layer:m=c.WORLD,renderOrder:h=2,castShadow:g=!1}){this.capacity=Math.max(1,Math.round(t)),this.group=new r,this.group.name=`Projectile`,this.group.matrixAutoUpdate=!1,e?.add(this.group),this._geometryFactory=typeof n==`function`?n:null,this._shapeKey=i,this._shapeHash=``,this.seeds=new a(new Float32Array(this.capacity),1),this.flights=new a(new Float32Array(this.capacity),1),this.flashes=new a(new Float32Array(this.capacity),1),this.seeds.setUsage(s),this.flights.setUsage(s),this.flashes.setUsage(s),this.geometry=this._geometryFactory?this._geometryFactory():n,this._dressGeometry(this.geometry),this.material=o,this.mesh=new p(this.geometry,this.material,this.capacity),this.mesh.frustumCulled=!1,this.mesh.castShadow=g,this.mesh.receiveShadow=g,this.mesh.count=0,this.mesh.layers.set(m),this.mesh.renderOrder=h,this.group.add(this.mesh),this.trailMesh=null,this.trailMaterial=null,this.trailGeometry=null,l&&this._buildTrail(Math.max(2,Math.round(u)),d),this.dice=[];for(let e=0;e<this.capacity;e++)this.dice.push({seed:0,angle:0,radial:0,lateral:0,depth:0,speed:0,size:0,phase:0,weave:0,spin:0,axis:new f(0,1,0)});this._launchPoints=[],this._landPoints=[],this._slotPoints=[];for(let e=0;e<this.capacity;e++)this._launchPoints.push(new f),this._landPoints.push(new f),this._slotPoints.push(new f);this._landedFlags=new Uint8Array(this.capacity),this.arrivals=new Int32Array(this.capacity),this.arrivalCount=0,this.contact=new f,this.contactLoad=0,this.liveBodies=0,this.liveTrails=0,this.seed=0,this._origin=new f,this._direction=new f(0,0,1),this._side=new f(1,0,0),this._length=1,this._p=L()}_dressGeometry(e){e.setAttribute(`aSeed`,this.seeds),e.setAttribute(`aFlight`,this.flights),e.setAttribute(`aFlash`,this.flashes)}_buildTrail(r,o){let l=new Float32Array(r*2*3);for(let e=0;e<r;e++){let t=e/(r-1),n=e*6;l[n+0]=t,l[n+1]=-1,l[n+3]=t,l[n+4]=1}let d=new Uint16Array((r-1)*6);for(let e=0;e<r-1;e++){let t=e*2,n=e*6;d[n+0]=t,d[n+1]=t+1,d[n+2]=t+2,d[n+3]=t+1,d[n+4]=t+3,d[n+5]=t+2}this.trailLaunch=new a(new Float32Array(this.capacity*3),3),this.trailLand=new a(new Float32Array(this.capacity*3),3),this.trailTiming=new a(new Float32Array(this.capacity*2),2),this.trailDice=new a(new Float32Array(this.capacity*4),4);for(let e of[this.trailLaunch,this.trailLand,this.trailTiming,this.trailDice])e.setUsage(s);let p=new e;p.setAttribute(`position`,new u(l,3)),p.setAttribute(`aLaunch`,this.trailLaunch),p.setAttribute(`aLand`,this.trailLand),p.setAttribute(`aTiming`,this.trailTiming),p.setAttribute(`aDice`,this.trailDice),p.setIndex(new u(d,1)),p.instanceCount=0,p.boundingSphere=new n(new f,1e4),this.trailGeometry=p,this.trailMaterial=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:o?2:1,side:2,toneMapped:!1,uniforms:i({uClock:{value:0},uSideAxis:{value:new f(1,0,0)},uPathCurve:{value:1},uApex:{value:0},uApexCurve:{value:1},uWeaveSide:{value:0},uWeaveUp:{value:0},uWeaveTurns:{value:1},uWeaveTurnsUp:{value:1},uWeavePhase:{value:Math.PI*.5},uWeaveDecay:{value:1.6},uTrailSpan:{value:.35},uTrailBurn:{value:.25},uTrailWidth:{value:.18},uTrailTaper:{value:1.4},uTrailLift:{value:0},uColorA:{value:new _(`#ffffff`)},uColorB:{value:new _(`#ffc27a`)},uColorC:{value:new _(`#a03a12`)},uColorD:{value:new _(`#100806`)},uOpacity:{value:1},uGlow:{value:1.4},uCore:{value:2.2},uHeadBias:{value:.45},uNoise:{value:.5},uNoiseScale:{value:1.6},uNoiseSpeed:{value:.6},uSoftFade:{value:.4}}),vertexShader:T,fragmentShader:E}),this.trailMesh=new v(p,this.trailMaterial),this.trailMesh.frustumCulled=!1,this.trailMesh.matrixAutoUpdate=!1,this.trailMesh.layers.set(c.VFX),this.trailMesh.renderOrder=11,this.group.add(this.trailMesh)}get count(){return this.liveBodies}get drawCalls(){return this.trailMesh?2:1}get trailUniforms(){return this.trailMaterial?this.trailMaterial.uniforms:null}setTrailColors(e,t,n,r){if(!this.trailMaterial)return;let i=this.trailMaterial.uniforms;i.uColorA.value.copy(typeof e==`string`?o(e):e),i.uColorB.value.copy(typeof t==`string`?o(t):t),i.uColorC.value.copy(typeof n==`string`?o(n):n);let a=r??n;i.uColorD.value.copy(typeof a==`string`?o(a):a)}syncGeometry(){if(!this._geometryFactory||!this._shapeKey)return;let e=String(this._shapeKey());if(e===this._shapeHash)return;this._shapeHash=e;let t=this.geometry;this.geometry=this._geometryFactory(),this._dressGeometry(this.geometry),this.mesh.geometry=this.geometry,t.dispose()}setBasis(e,t,n,r){return this._origin.copy(e),this._direction.copy(t),this._side.copy(n),this._length=Math.max(.01,r),this}roll(e=Math.random()*100){this.seed=e;for(let e=0;e<this.capacity;e++){let t=this.dice[e];t.seed=Math.random(),t.angle=Math.random(),t.radial=Math.random(),t.lateral=Math.random()*2-1,t.depth=Math.random()*2-1,t.speed=Math.random()*2-1,t.size=Math.random()*2-1,t.phase=Math.random(),t.weave=Math.random()*2-1,t.spin=Math.random()*2-1;let n=Math.acos(Math.random()*2-1),r=Math.random()*b,i=Math.sin(n);t.axis.set(i*Math.cos(r),Math.cos(n),i*Math.sin(r))}return this._landedFlags.fill(0),this.arrivalCount=0,this}reset(){this.liveBodies=0,this.liveTrails=0,this.arrivalCount=0,this.contactLoad=0,this.mesh.count=0,this.trailGeometry&&(this.trailGeometry.instanceCount=0),this._landedFlags.fill(0)}_resolve(e){let t=this._p;for(let n in R){let r=e[n];t[n]=r===void 0?R[n]:r}return t}_bodyCount(e){return Math.max(0,Math.min(this.capacity,Math.round(e.count)))}_resolveLaunch(e,t){let n=this.dice[e],r=this._launchPoints[e];if(t.mode===S.FALL)return r.copy(this._origin).addScaledVector(this._direction,-t.skyBack+n.depth*t.skyScatter).addScaledVector(this._side,n.lateral*t.skyScatter),r.y=t.skyHeight,r;if(r.copy(this._origin).addScaledVector(this._direction,t.handForward).addScaledVector(this._side,t.handSide),t.mode===S.VOLLEY){let n=this._bodyCount(t),i=n>1?e/(n-1)*2-1:0;r.addScaledVector(this._side,i*t.fanWidth)}return r.y=t.mode===S.ROLL?this._radius(e,t):t.handHeight,r}_resolveLand(e,t){let n=this.dice[e],r=this._landPoints[e];if(t.mode===S.FALL||t.landInZone){let e=t.zoneRadius*g(n.radial)**+Math.max(.05,t.zoneBias),i=n.angle*b;r.copy(this._origin).addScaledVector(this._direction,this._length+e*Math.sin(i)).addScaledVector(this._side,e*Math.cos(i))}else r.copy(this._origin).addScaledVector(this._direction,this._length+n.depth*t.spreadForward).addScaledVector(this._side,n.lateral*t.spreadSide);return r.y=t.mode===S.ROLL?this._radius(e,t):t.landHeight,r}_radius(e,t){return Math.max(.005,t.radius*(1+t.sizeJitter*this.dice[e].size))}_launchDelay(e,t){let n=t.stagger;n===C.AUTO&&(n=t.mode===S.FALL?C.HASH:t.mode===S.VOLLEY?C.RIPPLE:C.NONE);let r=0;if(n===C.RIPPLE){let n=this._bodyCount(t);r=n>1?e/(n-1):0}else if(n===C.HASH){let n=this._landPoints[e],i=g(g(this.dice[e].radial)**+Math.max(.05,t.zoneBias));r=g(d(g(.5+t.fillBias*(i-.5)),w(n.x,n.z,t.hashCell,this.seed),g(t.fillScatter)))}return t.lead+t.window*r}_flightTime(e,t){return Math.max(.02,t.flightTime*(1+t.speedJitter*this.dice[e].speed))}_pathPoint(e,t,n,r=this._p){let i=this.dice[e],a=g(t),o=a**+Math.max(.01,r.pathCurve);n.copy(this._launchPoints[e]).lerp(this._landPoints[e],o),n.y+=r.apex*Math.sin(Math.PI*a)**+Math.max(.05,r.apexCurve);let s=(1-a)**Math.max(0,r.weaveDecay),c=i.phase*b;return n.addScaledVector(this._side,r.weaveSide*i.weave*s*Math.sin(b*r.weaveTurns*a+c)),n.y+=r.weaveUp*i.weave*s*Math.sin(b*r.weaveTurnsUp*a+c+r.weavePhase),n}_headingAt(e,t,n,r=this._p){return this._pathPoint(e,t+x,O,r),this._pathPoint(e,t-x,k,r),n.subVectors(O,k),n.lengthSq()<1e-10?n.copy(this._direction):n.normalize()}update(e,t){let n=this._resolve(t??R);this.syncGeometry();let r=this._bodyCount(n),i=Math.max(0,n.linger),a=Math.max(.001,n.trailBurn),o=n.spin,s=g(n.align),c=0,l=0;this.arrivalCount=0,this.contactLoad=0;for(let t=0;t<r;t++){let r=this.dice[t];this._resolveLaunch(t,n),this._resolveLand(t,n);let u=this._launchDelay(t,n),d=this._flightTime(t,n),f=e-u,p=f/d;if(p>=1?this._landedFlags[t]||(this._landedFlags[t]=1,this.arrivals[this.arrivalCount++]=t):this._landedFlags[t]&&(this._landedFlags[t]=0),p<0)continue;let m=(p-1)*d;if(this.trailGeometry&&(p<=1||m<=a)){let e=l*3,n=this._launchPoints[t],i=this._landPoints[t];this.trailLaunch.array[e+0]=n.x,this.trailLaunch.array[e+1]=n.y,this.trailLaunch.array[e+2]=n.z,this.trailLand.array[e+0]=i.x,this.trailLand.array[e+1]=i.y,this.trailLand.array[e+2]=i.z,this.trailTiming.array[l*2+0]=u,this.trailTiming.array[l*2+1]=d;let a=l*4;this.trailDice.array[a+0]=r.seed,this.trailDice.array[a+1]=r.phase,this.trailDice.array[a+2]=r.weave,this.trailDice.array[a+3]=r.spin,l++}if(p>1&&m>i)continue;let h=Math.min(p,1);this._pathPoint(t,h,D,n);let _=this._radius(t,n);if(m>0&&n.sink>0&&(D.y-=m/Math.max(.001,i)*n.sink*_),M.position.copy(D),this._slotPoints[c].copy(D),n.mode===S.ROLL){let e=this._launchPoints[t].distanceTo(D);j.copy(this._side),N.setFromAxisAngle(j,-e/Math.max(.01,_)),this.contact.copy(D),this.contact.y=0,this.contactLoad=p<=1?g(n.load):0}else j.copy(r.axis),N.setFromAxisAngle(j,o*r.spin*Math.max(0,f));s>0&&(this._headingAt(t,h,A,n),P.setFromUnitVectors(F,A),N.slerp(P,s)),M.quaternion.copy(N),M.scale.set(_,_*Math.max(.01,n.stretch),_),M.updateMatrix(),this.mesh.setMatrixAt(c,M.matrix),this.seeds.array[c]=r.seed,this.flights.array[c]=p,this.flashes.array[c]=g(1-f/Math.max(.001,n.flash)),c++}this.liveBodies=c,this.liveTrails=l,this.mesh.count=c,this.mesh.instanceMatrix.needsUpdate=!0,this.seeds.needsUpdate=!0,this.flights.needsUpdate=!0,this.flashes.needsUpdate=!0,this.trailGeometry&&(this.trailGeometry.instanceCount=l,this.trailMesh.visible=l>0&&n.trailWidth>0&&n.trailOpacity>0,this.trailLaunch.needsUpdate=!0,this.trailLand.needsUpdate=!0,this.trailTiming.needsUpdate=!0,this.trailDice.needsUpdate=!0,this._syncTrailUniforms(e,n))}_syncTrailUniforms(e,t){let n=this.trailMaterial.uniforms;n.uClock.value=e,n.uSideAxis.value.copy(this._side),n.uPathCurve.value=t.pathCurve,n.uApex.value=t.apex,n.uApexCurve.value=t.apexCurve,n.uWeaveSide.value=t.weaveSide,n.uWeaveUp.value=t.weaveUp,n.uWeaveTurns.value=t.weaveTurns,n.uWeaveTurnsUp.value=t.weaveTurnsUp,n.uWeavePhase.value=t.weavePhase,n.uWeaveDecay.value=t.weaveDecay,n.uTrailSpan.value=t.trailSpan,n.uTrailBurn.value=t.trailBurn,n.uTrailWidth.value=t.trailWidth,n.uTrailTaper.value=t.trailTaper,n.uTrailLift.value=t.trailLift,n.uOpacity.value=t.trailOpacity,n.uGlow.value=t.trailGlow,n.uCore.value=t.trailCore,n.uHeadBias.value=t.trailHeadBias,n.uNoise.value=t.trailNoise,n.uNoiseScale.value=t.trailNoiseScale,n.uNoiseSpeed.value=t.trailNoiseSpeed,n.uSoftFade.value=t.trailSoftFade}slotPosition(e,t){return t.copy(this._slotPoints[Math.max(0,Math.min(this.liveBodies-1,e))])}landPoint(e,t){return t.copy(this._landPoints[Math.max(0,Math.min(this.capacity-1,e))])}pointAt(e,t,n){return this._pathPoint(Math.max(0,Math.min(this.capacity-1,e)),t,n)}headingAt(e,t,n){return this._headingAt(Math.max(0,Math.min(this.capacity-1,e)),t,n)}dispose(){this.geometry.dispose(),this.trailGeometry&&this.trailGeometry.dispose(),this.trailMaterial&&this.trailMaterial.dispose(),this.mesh.dispose(),this.group.parent?.remove(this.group)}};function L(){return{mode:S.ARC,stagger:C.AUTO,count:1,radius:.35,sizeJitter:.25,stretch:1,align:0,spin:4,flash:.12,handForward:.55,handSide:.34,handHeight:1.35,fanWidth:.5,landHeight:0,spreadSide:0,spreadForward:0,landInZone:!1,zoneRadius:4,zoneBias:.5,pathCurve:1,apex:1.6,apexCurve:1,weaveSide:0,weaveUp:0,weaveTurns:1.5,weaveTurnsUp:2.5,weavePhase:Math.PI*.5,weaveDecay:1.6,skyBack:9,skyHeight:26,skyScatter:.4,flightTime:.7,speedJitter:.15,lead:0,window:.9,fillBias:-1,fillScatter:.55,hashCell:1.1,linger:0,sink:1.2,load:1,trailSpan:.3,trailBurn:.22,trailWidth:.16,trailTaper:1.4,trailLift:0,trailOpacity:1,trailGlow:1.4,trailCore:2.2,trailHeadBias:.45,trailNoise:.5,trailNoiseScale:1.6,trailNoiseSpeed:.6,trailSoftFade:.4}}var R=L();export{L as i,I as n,C as r,S as t};
//# sourceMappingURL=Projectile-DQ3a3PJ-.js.map