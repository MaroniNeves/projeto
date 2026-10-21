import{$t as e,Br as t,G as n,Gr as r,K as i,Qt as a,R as o,Rt as s,Ut as c,V as l,Y as u,_t as d,di as f,it as p,o as m,q as h,st as g,tt as _,vt as v,y,yn as b}from"./settings-DdywqLlV.js";import{t as x}from"./ParticleSystem-BZTczMT8.js";import{t as S}from"./Ability-CYesB5Ur.js";import{n as C,r as w,t as T}from"./GroundField-aLIZg3d3.js";import{i as E,n as D,r as O,t as k}from"./Projectile-DQ3a3PJ-.js";var A=16,j=28,M=3,N=12,P={},F=new f,I=new f,L=new f,R=new f,z=new f,B=new f,V=E(),H=w();function U(){let e=M,t=[[-1,0],[-.62,.55],[.34,1],[1,0]],n=[];for(let t=0;t<e;t++)n.push(t/e*Math.PI*2);let r=t.map(([e,t])=>n.map(n=>[Math.cos(n)*t,e,Math.sin(n)*t])),i=[],a=e=>i.push(e[0],e[1],e[2]);for(let t=0;t<r.length-1;t++){let n=r[t],i=r[t+1];for(let t=0;t<e;t++){let r=(t+1)%e;a(n[t]),a(n[r]),a(i[t]),a(n[r]),a(i[r]),a(i[t])}}let o=new v;return o.setAttribute(`position`,new c(i,3)),o.computeVertexNormals(),o}var W=`
  attribute float aSeed;
  attribute float aFlight;
  attribute float aFlash;

  varying float vSeed;
  varying float vFlight;
  varying float vFlash;
  varying float vAlong;
  varying vec3  vNormalW;
  varying vec3  vViewDir;

  void main() {
    vSeed = aSeed;
    vFlight = aFlight;
    vFlash = aFlash;
    // 0 at the tail, 1 at the point. The lance is scaled twenty to one, so this
    // is the only coordinate on it worth shading against.
    vAlong = position.y * 0.5 + 0.5;

    mat4 im = mat4(1.0);
    #ifdef USE_INSTANCING
      im = instanceMatrix;
    #endif

    // Anisotropic instance scale — see the same note in StarfallAbility. At
    // twenty to one the error is not subtle: every normal ends up pointing at
    // the tip and the lance lights like a bar of soap.
    mat3 rot = mat3(im);
    vec3 sq = vec3(dot(rot[0], rot[0]), dot(rot[1], rot[1]), dot(rot[2], rot[2]));
    vec3 objectNormal = rot * (normal / max(sq, vec3(1e-6)));

    vec4 world = modelMatrix * im * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    vViewDir = cameraPosition - world.xyz;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`,G=`
  uniform vec3  uColorCore;
  uniform vec3  uColorEdge;
  uniform vec3  uColorDeep;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uRim;
  uniform float uTip;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;

  varying float vSeed;
  varying float vFlight;
  varying float vFlash;
  varying float vAlong;
  varying vec3  vNormalW;
  varying vec3  vViewDir;

  ${h}

  void main() {
    // A needle is three centimetres across at twenty metres. There is no room
    // for surface detail and no point looking for any: the whole read is the
    // silhouette, so the rim term does all the work and the body is a flat
    // gradient behind it. Noise on this would be invisible and would cost a
    // fragment program that has to be compiled.
    float fres = fresnelTerm(vViewDir, vNormalW, uRim, 1.0);
    float tip = uTip * pow(clamp(vAlong, 0.0, 1.0), 3.0);
    float flash = vFlash * 1.5;

    vec3 body = mix(uColorDeep, uColorEdge, clamp(fres * 0.9 + 0.25, 0.0, 1.0));
    vec3 color = mix(body, uColorCore, clamp(tip * 0.4 + flash, 0.0, 1.0));
    color *= uGlow * uGlobalGlow * uShaderIntensity * (1.0 + tip * 0.35 + flash);

    float alpha = clamp(uOpacity * (0.6 + 0.4 * fres), 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;function K(){return new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:1,side:2,toneMapped:!1,uniforms:i({uColorCore:{value:o(`#ff8a92`).clone()},uColorEdge:{value:o(`#c01a28`).clone()},uColorDeep:{value:o(`#3a0509`).clone()},uGlow:{value:1.5},uOpacity:{value:1},uRim:{value:3},uTip:{value:2.2}}),vertexShader:W,fragmentShader:G})}var q=`
  uniform float uClock;        // the ability's age, seconds
  uniform float uPathCurve;    // mirrors the projectile's, exactly
  uniform float uLife;         // seconds a point of mist survives
  uniform float uWidth;        // metres, half-width where it is laid
  uniform float uSpread;       // metres it swells by at full age
  uniform float uDrift;        // metres/second it rises
  uniform float uWander;       // metres of lateral wander at full age
  uniform float uWanderScale;  // wander features per metre
  uniform float uWanderSpeed;

  attribute vec3 aLaunch;
  attribute vec3 aLand;
  attribute vec2 aTiming;      // x = launch delay, y = flight time (seconds)
  attribute vec2 aDice;        // x = seed, y = handedness

  varying float vAge;          // 0 just laid, 1 gone
  varying float vSide;
  varying float vSeed;
  varying float vViewZ;

  ${u}

  void main() {
    float v = position.x;             // 0 at the tail of the thread, 1 at the head
    float side = position.y;          // -1 / +1 across the ribbon
    float delay = aTiming.x;
    float flight = max(aTiming.y, 1e-4);
    float curve = max(uPathCurve, 0.05);

    // Where the needle is now, as a fraction of its own path.
    float tauHead = clamp((uClock - delay) / flight, 0.0, 1.0);
    float sHead = pow(tauHead, curve);

    // This vertex, and the moment the needle was standing on it.
    float s = v * sHead;
    float passedAt = delay + flight * pow(max(s, 0.0), 1.0 / curve);
    float age = max(uClock - passedAt, 0.0);
    vAge = clamp(age / max(uLife, 1e-3), 0.0, 1.0);
    vSide = side;
    vSeed = aDice.x;

    vec3 p = mix(aLaunch, aLand, s);

    // Dispersal. All three terms are driven by the age, not by the clock, so a
    // thread laid a second ago is further gone than one laid this frame — which
    // is what makes a ripple of twelve read as twelve and not as a fan.
    p.y += uDrift * age;
    float wob = uWander * vAge;
    float ws = uWanderScale;
    float wt = uClock * uWanderSpeed;
    p.x += snoise(vec3(s * ws, aDice.x * 19.0, wt)) * wob;
    p.y += snoise(vec3(s * ws + 13.0, aDice.x * 19.0, wt)) * wob * 0.6;
    p.z += snoise(vec3(s * ws + 27.0, aDice.x * 19.0, wt)) * wob;

    // Camera-facing ribbon about the thread's own axis. The axis is the
    // launch → land line and nothing else, so it is well defined even at s = 0
    // where a tangent would be.
    vec3 axis = aLand - aLaunch;
    float axisLen = length(axis);
    axis = axisLen > 1e-4 ? axis / axisLen : vec3(0.0, 0.0, 1.0);
    vec3 toCam = normalize(cameraPosition - p);
    vec3 across = cross(axis, toCam);
    float acrossLen = length(across);
    // Dead-on: the thread is pointing at the camera and has no width to give.
    across = acrossLen > 1e-4 ? across / acrossLen : vec3(1.0, 0.0, 0.0);

    float halfWidth = (uWidth + uSpread * vAge) * aDice.y;
    p += across * side * halfWidth;

    vec4 mv = viewMatrix * vec4(p, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,J=`
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorD;
  uniform float uOpacity;
  uniform float uCore;
  uniform float uFalloff;
  uniform float uSoftFade;

  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uShaderIntensity;

  varying float vAge;
  varying float vSide;
  varying float vSeed;
  varying float vViewZ;

  ${h}

  void main() {
    float across = abs(vSide);

    // Two profiles across the ribbon, crossfaded by age. Fresh, the thread is
    // all centre line — a hairline, which is what a needle leaves. Old, it is a
    // soft lump with nothing sharp in it at all. Crossfading the *profile*
    // rather than only the width is what stops an old thread reading as a
    // wide wire.
    float hair = pow(max(1.0 - across, 0.0), max(uCore, 0.05));
    float lump = (1.0 - across * across) * 0.55;
    float profile = mix(hair, lump, vAge);

    float alive = pow(max(1.0 - vAge, 0.0), max(uFalloff, 0.05));
    // A little per-thread variation, so twelve ribbons laid a few hundredths of a
    // second apart are not twelve identical objects.
    float alpha = uOpacity * profile * alive * (0.82 + 0.36 * vSeed);
    if (alpha < 0.002) discard;

    vec3 color = gradient4(uColorA, uColorB, uColorC, uColorD, vAge) * uShaderIntensity;

    float soft = softFade(
      uSceneDepth, gl_FragCoord.xy / uResolution, vViewZ, uCameraNear, uCameraFar, uSoftFade
    );

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * soft);
  }
`,Y=class{constructor(n,{capacity:c=A,nodes:u=j}={}){this.capacity=Math.max(1,Math.round(c));let p=new Float32Array(u*2*3);for(let e=0;e<u;e++){let t=e/(u-1),n=e*6;p[n+0]=t,p[n+1]=-1,p[n+3]=t,p[n+4]=1}let m=new Uint16Array((u-1)*6);for(let e=0;e<u-1;e++){let t=e*2,n=e*6;m[n+0]=t,m[n+1]=t+1,m[n+2]=t+2,m[n+3]=t+1,m[n+4]=t+3,m[n+5]=t+2}this.launch=new a(new Float32Array(this.capacity*3),3),this.land=new a(new Float32Array(this.capacity*3),3),this.timing=new a(new Float32Array(this.capacity*2),2),this.dice=new a(new Float32Array(this.capacity*2),2);for(let e of[this.launch,this.land,this.timing,this.dice])e.setUsage(s);let h=new e;h.setAttribute(`position`,new d(p,3)),h.setAttribute(`aLaunch`,this.launch),h.setAttribute(`aLand`,this.land),h.setAttribute(`aTiming`,this.timing),h.setAttribute(`aDice`,this.dice),h.setIndex(new d(m,1)),h.instanceCount=0,h.boundingSphere=new r(new f,1e4),this.geometry=h,this.material=new t({transparent:!0,depthWrite:!1,depthTest:!0,blending:1,side:2,toneMapped:!1,uniforms:i({uClock:{value:0},uPathCurve:{value:1},uLife:{value:.85},uWidth:{value:.022},uSpread:{value:.17},uDrift:{value:.34},uWander:{value:.15},uWanderScale:{value:1.3},uWanderSpeed:{value:.35},uColorA:{value:o(`#ff5a66`).clone()},uColorB:{value:o(`#c01a28`).clone()},uColorC:{value:o(`#6e0d16`).clone()},uColorD:{value:o(`#2a0508`).clone()},uOpacity:{value:.9},uCore:{value:3.4},uFalloff:{value:1.7},uSoftFade:{value:.35}}),vertexShader:q,fragmentShader:J}),this.mesh=new b(h,this.material),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(l.VFX),this.mesh.renderOrder=11,this.mesh.name=`Hemolance:mist`,n?.add(this.mesh),this._live=0}get drawCalls(){return 1}get count(){return this._live}setThread(e,t,n,r,i,a,o){if(e>=this.capacity)return;let s=e*3;this.launch.array[s+0]=t.x,this.launch.array[s+1]=t.y,this.launch.array[s+2]=t.z,this.land.array[s+0]=n.x,this.land.array[s+1]=n.y,this.land.array[s+2]=n.z,this.timing.array[e*2+0]=r,this.timing.array[e*2+1]=i,this.dice.array[e*2+0]=a,this.dice.array[e*2+1]=o}commit(e){this._live=Math.max(0,Math.min(this.capacity,e)),this.geometry.instanceCount=this._live,this.launch.needsUpdate=!0,this.land.needsUpdate=!0,this.timing.needsUpdate=!0,this.dice.needsUpdate=!0}reset(){this._live=0,this.geometry.instanceCount=0}dispose(){this.geometry.dispose(),this.material.dispose(),this.mesh.parent?.remove(this.mesh)}},X=class extends S{constructor(e){super(`hemolance`,e)}createShaders(){this.needleMaterial=K(),this.needles=new D(this.group,{geometry:U,material:this.needleMaterial,capacity:A,trail:!1,layer:l.VFX,renderOrder:12}),this.mist=new Y(this.group,{capacity:A,nodes:j}),this.floor=new T(this.group,{mode:C.POCK,marks:N,additive:!1,depthTest:!0,name:`Hemolance:pools`}),H.centre=z,this._seed=0,this._closed=!1,this._live=0}createParticles(){let e=this.ctx.particles;this.droplets=e.get(`hemolance.droplets`,{capacity:900,shape:x.SOFT,additive:!1,lit:!0,softFade:.3}),this.droplets.uniforms.uDrag.value=.5,this.droplets.uniforms.uEndSize.value=.7,this.droplets.uniforms.uSizeIn.value=.04,this.droplets.uniforms.uFadeIn.value=.05,this.droplets.uniforms.uFadeOut.value=.6,this.spray=e.get(`hemolance.spray`,{capacity:1e3,shape:x.STREAK,additive:!1,stretch:!0,softFade:.25}),this.spray.uniforms.uDrag.value=1.8,this.spray.uniforms.uEndSize.value=.25,this.spray.uniforms.uSizeIn.value=.02,this.spray.uniforms.uFadeIn.value=.03,this.spray.uniforms.uFadeOut.value=.4,this.haze=e.get(`hemolance.haze`,{capacity:700,shape:x.SMOKE,additive:!1,curl:!0,softFade:1}),this.haze.uniforms.uDrag.value=2.1,this.haze.uniforms.uEndSize.value=2.4,this.haze.uniforms.uSizeIn.value=.14,this.haze.uniforms.uFadeIn.value=.2,this.haze.uniforms.uFadeOut.value=.35}get instanceCount(){return this._live+this.mist.count}get volleyDuration(){let e=m.hemolance,t=Math.max(0,Math.min(A,Math.round(e.needles))-1);return this._needleDelay(t)+this._needleFlight()}get impactDuration(){let e=m.hemolance,t=this.volleyDuration+Math.max(0,e.mistLife)*.5;return Math.max(.05,Math.max(e.lifetime,t)*m.global.lifetime)}get fadeDuration(){return Math.max(.05,m.hemolance.fadeTime)}lightShimmer(){let e=m.hemolance,t=this.age*Math.max(.05,e.lightPulseSpeed),n=Math.sin(t*Math.PI)**2*(.65+.35*Math.sin(t*Math.PI*.5));return 1-g(e.lightPulse)*(1-n)}_handPoint(e){let t=m.hemolance;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_yaw(){return Math.atan2(this.direction.x,this.direction.z)}_needleDelay(e){let t=m.hemolance;return(Math.max(0,t.volleyLead)+Math.max(0,t.ripplePhase)*e)/this._clock()}_needleFlight(){return Math.max(.02,m.hemolance.needleTime)/this._clock()}_clock(){return Math.max(.05,m.global.speed)}onSpawn(){this.floor.clearMarks(),this.mist.reset(),this._closed=!1,this._live=0,this._seed=Math.random()*100,this.needles.roll(this._seed),this._sync(1),this._muzzleFx()}_fillFlight(){let e=m.hemolance,t=V,n=this._clock(),r=Math.max(0,Math.min(A,Math.round(e.needles)));return t.mode=k.VOLLEY,t.stagger=O.RIPPLE,t.count=r,t.radius=e.needleRadius,t.sizeJitter=0,t.stretch=e.needleLength,t.align=e.needleAlign,t.spin=e.needleSpin,t.flash=e.needleFlash,t.handForward=e.handForward,t.handSide=e.handSide,t.handHeight=e.handHeight,t.fanWidth=e.fanWidth,t.skyBack=0,t.skyHeight=0,t.skyScatter=0,t.landHeight=e.landHeight,t.spreadSide=e.spreadSide,t.spreadForward=e.spreadForward,t.landInZone=!1,t.zoneRadius=1,t.zoneBias=.5,t.pathCurve=e.pathCurve,t.apex=0,t.apexCurve=1,t.weaveSide=0,t.weaveUp=0,t.weaveTurns=1,t.weaveTurnsUp=1,t.weavePhase=0,t.weaveDecay=1,t.flightTime=this._needleFlight(),t.speedJitter=0,t.lead=this._needleDelay(0),t.window=Math.max(0,e.ripplePhase)*Math.max(0,r-1)/n,t.fillBias=0,t.fillScatter=0,t.hashCell=1,t.linger=0,t.sink=0,t.load=0,t.trailWidth=0,t.trailOpacity=0,t}_fillGround(e){let t=m.hemolance,n=m.global,r=H;return r.centre=z,r.yaw=this._yaw(),r.height=t.fieldHeight,r.radius=t.fieldRadius,r.length=t.fieldRadius*2,r.grow=1,r.recede=0,r.progress=1,r.inscribe=1,r.ignite=0,r.fade=e,r.seed=this._seed,r.edge=t.fieldEdge,r.ragged=t.fieldRagged,r.raggedScale=t.fieldRaggedScale,r.warp=t.fieldWarp,r.relief=t.fieldRelief,r.normalStep=.04,r.ambient=.26,r.wrap=.4,r.specular=t.fieldSpecular,r.gloss=t.fieldGloss,r.parallax=.12,r.cell=.5,r.cellJitter=.8,r.seam=.05,r.thickness=t.poolThickness,r.lift=t.poolRim,r.depth=t.poolDepth,r.width=.5,r.sharp=.5,r.detail=t.poolDetail,r.swirl=0,r.arms=5,r.speed=t.poolSpread,r.flow=0,r.windAngle=0,r.markLife=t.poolLife,r.markRadius=t.poolRadius,r.additive=!1,r.emissive=t.fieldEmissive*n.glow,r.opacity=t.fieldOpacity,r.depthFade=.35,r.colorBase=t.colorPoolBase,r.colorEdge=t.colorPoolEdge,r.colorGlow=t.colorPoolGlow,r.colorDeep=t.colorPoolDeep,r.noiseStrength=n.noiseStrength,r.noiseFrequency=n.noiseFrequency,r.noiseSpeed=n.noiseSpeed,r.opacityScale=n.opacity,r}_layThreads(e){let t=this._needleFlight();for(let n=0;n<e;n++){this.needles.pointAt(n,0,L),this.needles.landPoint(n,R);let e=p(this._seed+n*4.13)<.5?-1:1;this.mist.setThread(n,L,R,this._needleDelay(n),t,p(this._seed+n*9.7),e)}this.mist.commit(e)}_syncMist(e){let t=m.hemolance,n=m.global,r=this.mist.material.uniforms;r.uClock.value=this.age,r.uPathCurve.value=Math.max(.05,t.pathCurve),r.uLife.value=Math.max(.02,t.mistLife*n.lifetime),r.uWidth.value=t.mistWidth,r.uSpread.value=t.mistSpread,r.uDrift.value=t.mistDrift,r.uWander.value=t.mistWander*n.turbulence,r.uWanderScale.value=t.mistWanderScale*n.noiseFrequency,r.uWanderSpeed.value=t.mistWanderSpeed*n.noiseSpeed,r.uColorA.value.copy(o(t.colorMistA)),r.uColorB.value.copy(o(t.colorMistB)),r.uColorC.value.copy(o(t.colorMistC)),r.uColorD.value.copy(o(t.colorMistD)),r.uOpacity.value=t.mistOpacity*e*n.opacity,r.uCore.value=t.mistCore,r.uFalloff.value=t.mistFalloff,r.uSoftFade.value=t.mistSoftFade}_syncLook(e){let t=m.hemolance,n=m.global,r=this.needleMaterial.uniforms;r.uColorCore.value.copy(o(t.colorNeedleCore)),r.uColorEdge.value.copy(o(t.colorNeedleEdge)),r.uColorDeep.value.copy(o(t.colorNeedleDeep)),r.uGlow.value=t.needleGlow*n.glow,r.uOpacity.value=t.needleOpacity*e*n.opacity,r.uRim.value=Math.max(.05,t.needleRim),r.uTip.value=t.needleTip,this.droplets.setGradient(o(t.colorDropletA),o(t.colorDropletB),o(t.colorDropletC),o(t.colorDropletD)),this.droplets.uniforms.uGravity.value.set(0,t.dropletGravity,0),this.droplets.uniforms.uSizeScale.value=t.dropletSize*n.particleSize*7,this.droplets.uniforms.uLifeScale.value=t.dropletLifetime*.5*n.particleLifetime,this.droplets.uniforms.uSpeedScale.value=n.particleSpeed,this.droplets.uniforms.uOpacity.value=n.opacity,this.droplets.uniforms.uTurbulence.value=.2*n.turbulence,this.spray.setGradient(o(t.colorSprayA),o(t.colorSprayB),o(t.colorSprayC),o(t.colorSprayD)),this.spray.uniforms.uGravity.value.set(0,t.sprayGravity,0),this.spray.uniforms.uSizeScale.value=t.spraySize*n.particleSize*7,this.spray.uniforms.uLifeScale.value=t.sprayLifetime*.5*n.particleLifetime,this.spray.uniforms.uSpeedScale.value=n.particleSpeed,this.spray.uniforms.uOpacity.value=n.opacity,this.spray.uniforms.uStretch.value=t.sprayStretch,this.spray.uniforms.uTurbulence.value=.25*n.turbulence,this.haze.setGradient(o(t.colorHazeA),o(t.colorHazeB),o(t.colorHazeC),o(t.colorHazeD)),this.haze.uniforms.uGravity.value.set(0,t.hazeRise,0),this.haze.uniforms.uSizeScale.value=t.hazeSize*n.particleSize,this.haze.uniforms.uLifeScale.value=t.hazeLifetime*.5*n.particleLifetime,this.haze.uniforms.uSpeedScale.value=t.hazeSpeed*n.particleSpeed,this.haze.uniforms.uOpacity.value=t.hazeOpacity*n.opacity,this.haze.uniforms.uTurbulence.value=.35*n.turbulence}_sync(e){this.pointAt(1,z),this._syncLook(e);let t=this._fillFlight();this.needles.setBasis(this.origin,this.direction,this.side,this.length),this.needles.update(this.age,t),this._live=this.needles.count;for(let e=0;e<this.needles.arrivalCount;e++)this._needleImpact(this.needles.arrivals[e]);this._layThreads(Math.max(0,Math.min(A,Math.round(m.hemolance.needles)))),this._syncMist(e),this.floor.update(this._fillGround(e))}_muzzleFx(){let e=m.hemolance,t=m.global;this._handPoint(B),this.ctx.bursts.spawn(y.WATER,B,{radius:e.muzzleSize*.25,endRadius:e.muzzleSize*t.explosionIntensity,life:.35,intensity:e.muzzleIntensity,opacity:.85,fresnel:1.5,displace:.4,colorA:o(e.colorMuzzleA),colorB:o(e.colorMuzzleB),colorC:o(e.colorMuzzleC)}),P.position=B,P.radius=.14,P.direction=I.copy(this.direction).multiplyScalar(.7).setY(.4).normalize(),P.speed=e.spraySpeed*.6,P.speedVariance=.8,P.spread=.7,P.inherit=null,P.anchor=null,P.size=.1,P.sizeVariance=.6,P.life=e.sprayLifetime,P.lifeVariance=.5,P.spin=0,P.tint=null,P.time=n.uTime.value,this.spray.emit(Math.round(18*t.particleCount),P),this.ctx.flash.trigger(o(e.colorCastFlash),e.castFlash*t.explosionIntensity)}_needleImpact(e){let t=m.hemolance,r=m.global,i=n.uTime.value;this.needles.landPoint(e,F);let a=this._yaw(),s=Math.cos(a),c=Math.sin(a),l=F.x-z.x,u=F.z-z.z,d=Math.max(.05,t.fieldRadius),f=.6+.4*p(this._seed+e*5.31);this.floor.mark((s*l-c*u)/d,(c*l+s*u)/d,i,f),this.ctx.bursts.spawn(y.WATER,F,{radius:t.shellSize*.2,endRadius:t.shellSize*r.explosionIntensity,life:Math.max(.05,t.shellLife),intensity:t.shellIntensity,opacity:.8,fresnel:1.6,displace:.5,squash:.85,colorA:o(t.colorShellA),colorB:o(t.colorShellB),colorC:o(t.colorShellC)}),P.position=F,P.radius=.08,P.direction=I.copy(this.direction).multiplyScalar(-.75).setY(.5).normalize(),P.speed=t.spraySpeed,P.speedVariance=.85,P.spread=.8,P.inherit=null,P.anchor=null,P.size=.12,P.sizeVariance=.7,P.life=t.sprayLifetime,P.lifeVariance=.55,P.spin=0,P.tint=null,P.time=i,this.spray.emit(Math.round(t.sprayBurst*r.particleCount),P),P.radius=.16,P.direction=I.set(0,1,0),P.speed=t.dropletSpeed,P.speedVariance=.8,P.spread=.95,P.size=.14,P.life=t.dropletLifetime,P.spin=0,this.droplets.emit(Math.round(t.dropletBurst*r.particleCount),P),P.radius=.3,P.speed=t.hazeSpeed,P.spread=1,P.size=.7,P.life=t.hazeLifetime,P.spin=.3,this.haze.emit(Math.round(t.hazeBurst*r.particleCount),P),this.position.copy(F),this.lightBoost=Math.min(50,this.lightBoost+t.lightPunch*r.explosionIntensity),this.ctx.shake.add(t.impactShake*r.explosionIntensity*r.cameraShake,1/Math.max(.05,t.shakeDuration),28);let h=Math.max(0,Math.min(A,Math.round(t.needles))-1);!this._closed&&e>=h&&(this._closed=!0,this.ctx.flash.trigger(o(t.colorFlash),t.impactFlash*r.explosionIntensity))}onTravel(e){this._sync(1),this._live>0&&this.needles.slotPosition(0,this.position),this.ctx.shake.rumble(m.hemolance.rumble*m.global.cameraShake,e)}onImpact(){}onFade(e,t){let n=t<=1?1:1-_.inCubic(g(t-1));this._sync(n),t<=1&&this._live>0&&(this.needles.slotPosition(0,this.position),this.ctx.shake.rumble(m.hemolance.rumble*m.global.cameraShake,e))}onDestroy(){this.needles.reset(),this.mist.reset(),this.floor.clearMarks(),this._live=0,this._closed=!1}dispose(){this.needles.dispose(),this.mist.dispose(),this.floor.dispose(),this.needleMaterial.dispose(),super.dispose()}};export{X as HemolanceAbility};
//# sourceMappingURL=HemolanceAbility-B8d1Ppo2.js.map