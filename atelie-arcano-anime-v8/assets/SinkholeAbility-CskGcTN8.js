import{Br as e,G as t,K as n,R as r,Tn as i,V as a,X as o,Y as s,_t as c,di as l,o as u,st as d,tt as f,vt as p,xt as m,y as h,yn as g}from"./settings-DdywqLlV.js";import{t as _}from"./ParticleSystem-BZTczMT8.js";import{n as v}from"./ParticleEngine-DLxipNH0.js";import{n as y}from"./GroundDecals-kYmr8HKl.js";import{n as b,t as x}from"./Ability-CYesB5Ur.js";import{n as S,r as C,t as w}from"./GroundField-aLIZg3d3.js";import{i as T,n as E,r as D,t as O}from"./Projectile-DQ3a3PJ-.js";var k=Math.PI*2,A=48,j={},M=new l,N=new l,P=new l;function F(e,t){let n=e+1,r=new Float32Array((t+1)*n*3),i=0;for(let n=0;n<=t;n++){let a=n/t;for(let t=0;t<=e;t++)r[i++]=t/e,r[i++]=a,r[i++]=0}let a=new Uint16Array(t*e*6),o=0;for(let r=0;r<t;r++)for(let t=0;t<e;t++){let e=r*n+t,i=e+1,s=e+n,c=s+1;a[o++]=e,a[o++]=s,a[o++]=c,a[o++]=e,a[o++]=c,a[o++]=i}let s=new p;return s.setAttribute(`position`,new c(r,3)),s.setIndex(new c(a,1)),s}var I=`
  #define TAU 6.283185307179586

  uniform vec3  uCentre;
  uniform float uRadius;
  uniform float uApron;
  uniform float uDepth;
  uniform float uDrop;
  uniform float uWallCurve;
  uniform float uLip;
  uniform float uRough;
  uniform float uRoughScale;
  uniform float uCalve;
  uniform float uCalveCells;
  uniform float uCalveDrop;
  uniform float uSpokes;
  uniform float uRings;
  uniform float uSeed;

  varying vec3  vWorld;
  varying vec3  vNrm;
  varying float vRadial;
  varying float vDrop;

  float holeHeight(float r, float ang) {
    float x = r / max(uRadius, 0.05);

    // The bowl. One exponent takes it from a saucer to a bell-mouthed shaft.
    float bowl = pow(max(0.0, 1.0 - min(x, 1.0)), max(uWallCurve, 0.05));
    float h = -uDepth * bowl;

    // Wedges. The rim does not break on a circle: it breaks into blocks, and
    // each block waits for its own threshold before it goes.
    float wedge = floor(ang / TAU * max(uCalveCells, 1.0) + uSeed * 7.0);
    float roll = hash11(wedge * 1.37 + uSeed);

    // Spoil heaped just outside the rim, in the same blocks.
    float apronBand = smoothstep(1.0, 1.1, x) * (1.0 - smoothstep(1.1, 1.55, x));
    h += uLip * apronBand * (0.45 + 1.1 * roll);

    float band = smoothstep(1.12, 0.86, x) * smoothstep(0.5, 0.82, x);
    h -= uCalveDrop * band * (0.4 + 0.9 * roll) *
         smoothstep(roll * 0.7, roll * 0.7 + 0.3, uCalve);

    // Scree grain, sampled in the plane and not on the bearing: an angular
    // lookup hands every radius along a bearing the same value and draws
    // dead-straight gullies from the rim to the throat, which is a firework
    // rather than a landslide.
    vec2 q = vec2(cos(ang), sin(ang)) * r;
    h += snoise(vec3(q * uRoughScale, uSeed * 3.1)) * uRough * uDepth * 0.075 *
         (1.0 - min(x, 1.0));

    return h * uDrop;
  }

  vec3 holePoint(float u, float angFrac) {
    float ang = angFrac * TAU;
    float r = uRadius * uApron * clamp(u, 0.0, 1.0);
    return vec3(cos(ang) * r, holeHeight(r, ang), sin(ang) * r);
  }

  void main() {
    float u = position.y;
    float a = position.x;

    vec3 p = holePoint(u, a);

    float du = 1.2 / max(uRings, 2.0);
    float da = 1.2 / max(uSpokes, 3.0);
    float uu = max(u, du);
    vec3 p0 = holePoint(uu, a);
    vec3 pa = holePoint(uu, a + da);
    vec3 pu = holePoint(uu + du, a);
    // cross(tangential, radial-outward) is +Y on flat ground, which is the
    // orientation the fragment stage assumes for the lip catch.
    vec3 n = cross(pa - p0, pu - p0);
    vNrm = vec3(0.0, 1.0, 0.0);
    if (dot(n, n) > 1e-10) vNrm = normalize(n);

    vec4 world = modelMatrix * vec4(p + uCentre, 1.0);
    vWorld = world.xyz;
    vRadial = length(p.xz) / max(uRadius, 0.05);
    vDrop = -p.y;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`,L=`
  #define TAU 6.283185307179586

  uniform vec3  uLightDir;
  uniform vec3  uColorGround;
  uniform vec3  uColorWall;
  uniform vec3  uColorDeep;
  uniform vec3  uColorVoid;
  uniform vec3  uColorLip;
  uniform float uAmbient;
  uniform float uWrap;
  uniform float uSpecular;
  uniform float uGloss;
  uniform float uDepthTint;
  uniform float uStrata;
  uniform float uStrataScale;
  uniform float uGrit;
  uniform float uGritScale;
  uniform float uThroat;
  uniform float uRimLight;
  uniform float uOpacity;
  uniform float uFade;
  uniform float uApron;
  uniform float uApronFade;
  uniform float uDepth;
  uniform float uSeed;

  varying vec3  vWorld;
  varying vec3  vNrm;
  varying float vRadial;
  varying float vDrop;

  void main() {
    vec3 N = normalize(vNrm);
    vec3 L = normalize(uLightDir);

    // Wrapped diffuse. A hole is mostly surfaces facing away from the key, and
    // an unwrapped lambert puts three quarters of the interior at pure ambient,
    // which flattens the one thing the mesh exists to show.
    float ndl = dot(N, L);
    float shade = uAmbient + (1.0 - uAmbient) *
                  clamp((ndl + uWrap) / (1.0 + uWrap), 0.0, 1.0);

    vec3 V = normalize(cameraPosition - vWorld);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), max(uGloss, 1.0)) * uSpecular * step(0.0, ndl);

    float deep = clamp(vDrop / max(uDepth, 0.05), 0.0, 1.0);

    // Bedding runs level, because these walls are a cut through ground that is
    // level, so the bands belong in WORLD y and nowhere else. The first version
    // sampled them on the wall's own parameter; they followed the profile and
    // the hole looked turned on a lathe.
    float bed = 0.5 + 0.5 * sin(vWorld.y * uStrataScale * TAU +
                                snoise(vec3(vWorld.xz * 0.35, uSeed)) * 1.6);
    float scree = snoise01(vec3(vWorld.xz * uGritScale, vWorld.y * uGritScale * 0.5 + uSeed));

    vec3 body = mix(uColorGround, uColorWall, smoothstep(0.0, 0.18, deep));
    body = mix(body, uColorDeep, pow(deep, max(uDepthTint, 0.05)));
    body *= mix(1.0, 0.72 + 0.56 * bed, clamp(uStrata, 0.0, 1.0));
    body *= mix(1.0, 0.7 + 0.6 * scree, clamp(uGrit, 0.0, 2.0));

    vec3 col = body * shade + uColorLip * spec;

    // The broken lip is the only bright thing in the frame: stone standing
    // proud of the floor with the key running along its edge.
    float lipBand = smoothstep(1.14, 0.94, vRadial) * smoothstep(0.7, 0.95, vRadial);
    col += uColorLip * uRimLight * lipBand * clamp(N.y, 0.0, 1.0);

    // The throat. Not shaded, not lit, not grained. The point is that there is
    // nothing down there to measure a distance against, and every term above
    // would give the eye one.
    col = mix(col, uColorVoid, smoothstep(uThroat * 1.8, uThroat * 0.25, vRadial));

    float alpha = uOpacity * uFade *
                  (1.0 - smoothstep(uApronFade, max(uApron, uApronFade + 0.01), vRadial));
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`,R=class extends x{constructor(e){super(`sinkhole`,e)}createShaders(){this.funnelUniforms=n({uCentre:{value:new l},uRadius:{value:5},uApron:{value:1.45},uApronFade:{value:1.08},uDepth:{value:6.5},uDrop:{value:0},uWallCurve:{value:2.4},uLip:{value:.3},uRough:{value:.75},uRoughScale:{value:1.1},uCalve:{value:0},uCalveCells:{value:14},uCalveDrop:{value:.95},uSpokes:{value:56},uRings:{value:36},uSeed:{value:0},uColorGround:{value:new m},uColorWall:{value:new m},uColorDeep:{value:new m},uColorVoid:{value:new m},uColorLip:{value:new m},uAmbient:{value:.28},uWrap:{value:.42},uSpecular:{value:.25},uGloss:{value:18},uDepthTint:{value:1.4},uStrata:{value:.5},uStrataScale:{value:1.4},uGrit:{value:.5},uGritScale:{value:9},uThroat:{value:.16},uRimLight:{value:.6},uOpacity:{value:1},uFade:{value:0}}),this.funnelMaterial=new e({transparent:!0,depthTest:!0,depthFunc:1,depthWrite:!0,side:2,toneMapped:!1,uniforms:this.funnelUniforms,vertexShader:`${s}\n${I}`,fragmentShader:`${s}\n${L}`}),this._spokes=0,this._rings=0,this.funnelGeometry=F(56,36),this._spokes=56,this._rings=36,this.funnel=new g(this.funnelGeometry,this.funnelMaterial),this.funnel.name=`SinkholeFunnel`,this.funnel.frustumCulled=!1,this.funnel.matrixAutoUpdate=!1,this.funnel.layers.set(a.VFX),this.funnel.renderOrder=9,this.funnel.visible=!1,this.group.add(this.funnel),this.apron=new w(this.group,{mode:S.FUNNEL,additive:!1,name:`SinkholeApron`}),this._apronParams=C(),this._apronParams.centre=P,this.chunkMaterial=new i({color:16777215,roughness:.95,metalness:0,flatShading:!0,transparent:!0,depthWrite:!0}),this.chunks=new E(this.group,{geometry:o({seed:12.7,detail:1,lumpiness:.34,noiseScale:1.8,roughness:.22,cuts:8,cutDepth:.3,craters:3,craterDepth:.14,craterSize:.45}),material:this.chunkMaterial,capacity:A,trail:!1,layer:a.VFX,renderOrder:12,castShadow:!1}),this._chunkParams=T(),this._chunkParams.mode=O.FALL,this._chunkParams.stagger=D.HASH,this._seed=0,this._blown=!1}createParticles(){let e=this.ctx.particles;this.dust=e.get(`sinkhole.dust`,{capacity:3e3,shape:_.SMOKE,additive:!1,curl:!0,softFade:1.3}),this.dust.uniforms.uDrag.value=2,this.dust.uniforms.uEndSize.value=4,this.dust.uniforms.uSizeIn.value=.1,this.dust.uniforms.uFadeIn.value=.12,this.dust.uniforms.uFadeOut.value=.34,this.pebbles=e.get(`sinkhole.pebbles`,{capacity:1400,shape:_.CHIP,additive:!1,lit:!0,softFade:.2}),this.pebbles.uniforms.uDrag.value=.2,this.pebbles.uniforms.uEndSize.value=.7,this.pebbles.uniforms.uFadeOut.value=.55,this.dustEmitter=new v,this.pebbleEmitter=new v}get instanceCount(){return this.chunks.count}get impactDuration(){let e=u.sinkhole;return Math.max(.2,(e.crackTime+e.dropTime+e.lifetime)*u.global.lifetime)}get fadeDuration(){return Math.max(.2,u.sinkhole.sinkTime)}lightShimmer(){return .9+.1*Math.sin(this.age*2.7)}_centrePoint(e){return this.pointAt(1,e).setY(0)}_syncMesh(){let e=u.sinkhole,t=Math.max(12,Math.min(96,Math.round(e.spokes))),n=Math.max(8,Math.min(64,Math.round(e.rings)));if(t===this._spokes&&n===this._rings)return;let r=this.funnelGeometry;this.funnelGeometry=F(t,n),this.funnel.geometry=this.funnelGeometry,r.dispose(),this._spokes=t,this._rings=n}_syncUniforms(e,t,n){let i=u.sinkhole,a=u.global,o=this.funnelUniforms;this._syncMesh(),this._centrePoint(P),o.uCentre.value.copy(P),o.uRadius.value=Math.max(.2,i.zoneRadius),o.uApron.value=i.apron,o.uApronFade.value=i.apronFade,o.uDepth.value=i.depth,o.uDrop.value=e,o.uWallCurve.value=i.wallCurve,o.uLip.value=i.lip,o.uRough.value=i.rough*a.shaderIntensity,o.uRoughScale.value=i.roughScale*a.noiseFrequency,o.uCalve.value=t,o.uCalveCells.value=Math.max(3,Math.round(i.calveCells)),o.uCalveDrop.value=i.calveDrop,o.uSpokes.value=this._spokes,o.uRings.value=this._rings,o.uSeed.value=this._seed,o.uColorGround.value.copy(r(i.colorGround)),o.uColorWall.value.copy(r(i.colorWall)),o.uColorDeep.value.copy(r(i.colorDeep)),o.uColorVoid.value.copy(r(i.colorVoid)),o.uColorLip.value.copy(r(i.colorLip)),o.uAmbient.value=i.ambient,o.uWrap.value=i.wrap,o.uSpecular.value=i.specular,o.uGloss.value=i.gloss,o.uDepthTint.value=i.depthTint,o.uStrata.value=i.strata*a.shaderIntensity,o.uStrataScale.value=i.strataScale*a.noiseFrequency,o.uGrit.value=i.grit*a.shaderIntensity,o.uGritScale.value=i.gritScale*a.noiseFrequency,o.uThroat.value=i.throat,o.uRimLight.value=i.rimLight*a.glow,o.uOpacity.value=i.opacity*a.opacity,o.uFade.value=n,this.funnel.visible=n>.003,this.dust.setGradient(r(i.colorDustA),r(i.colorDustB),r(i.colorDustC),r(i.colorDustD)),this.dust.uniforms.uGravity.value.set(0,i.dustRise,0),this.dust.uniforms.uSizeScale.value=i.dustSize*a.particleSize,this.dust.uniforms.uLifeScale.value=i.dustLifetime*.5*a.particleLifetime,this.dust.uniforms.uSpeedScale.value=i.dustSpeed*a.particleSpeed,this.dust.uniforms.uOpacity.value=i.dustOpacity*a.opacity,this.dust.uniforms.uTurbulence.value=i.dustTurbulence*a.turbulence,this.pebbles.setGradient(r(i.colorPebbleA),r(i.colorPebbleB),r(i.colorPebbleC),r(i.colorPebbleD)),this.pebbles.uniforms.uGravity.value.set(0,i.pebbleGravity,0),this.pebbles.uniforms.uSizeScale.value=i.pebbleSize*a.particleSize*7,this.pebbles.uniforms.uLifeScale.value=i.pebbleLifetime*.5*a.particleLifetime,this.pebbles.uniforms.uSpeedScale.value=i.pebbleSpeed*a.particleSpeed,this.pebbles.uniforms.uOpacity.value=a.opacity,this.chunkMaterial.color.copy(r(i.colorDebris)),this.chunkMaterial.roughness=i.debrisRoughness}_syncApron(e,t){let n=u.sinkhole,r=u.global,i=this._apronParams;this._centrePoint(P),i.centre=P,i.yaw=Math.atan2(this.direction.x,this.direction.z),i.height=.02,i.radius=Math.max(.2,n.zoneRadius),i.grow=e,i.fade=t,i.seed=this._seed,i.edge=n.fieldEdge,i.ragged=n.fieldRagged,i.raggedScale=n.fieldRaggedScale,i.warp=n.fieldWarp,i.relief=n.fieldRelief,i.cell=n.fieldCell,i.cellJitter=n.fieldCellJitter,i.seam=n.fieldSeam,i.thickness=n.fieldThickness,i.lift=n.fieldLift,i.depth=n.fieldDepth,i.sharp=n.fieldSharp,i.detail=n.fieldDetail,i.parallax=n.fieldParallax,i.opacity=n.fieldOpacity,i.colorBase=n.colorFieldBase,i.colorEdge=n.colorFieldEdge,i.colorGlow=n.colorFieldGlow,i.colorDeep=n.colorFieldDeep,i.noiseStrength=r.noiseStrength,i.noiseFrequency=r.noiseFrequency,i.noiseSpeed=r.noiseSpeed,i.opacityScale=r.opacity,this.apron.update(i)}_syncChunks(){let e=u.sinkhole,t=u.global,n=this._chunkParams;this.chunks.setBasis(this.origin,this.direction,this.side,this.length),n.mode=O.FALL,n.stagger=D.HASH,n.count=Math.min(A,Math.round(e.debrisCount*t.particleCount)),n.radius=e.debrisRadius,n.sizeJitter=e.debrisSizeJitter,n.spin=e.debrisSpin,n.align=0,n.stretch=1,n.flash=e.debrisFlash,n.skyBack=e.debrisBack-this.length,n.skyHeight=e.debrisLaunchHeight,n.skyScatter=e.debrisSpread*e.zoneRadius,n.zoneRadius=e.debrisSinkSpread*e.zoneRadius,n.zoneBias=.5,n.landHeight=-e.debrisSinkDepth,n.landInZone=!0,n.pathCurve=e.debrisPathCurve,n.apex=0,n.weaveSide=0,n.weaveUp=0,n.flightTime=e.debrisFlightTime,n.speedJitter=e.debrisSpeedJitter,n.lead=e.debrisLead,n.window=e.debrisWindow,n.fillBias=e.debrisFillBias,n.fillScatter=e.debrisFillScatter,n.hashCell=e.debrisHashCell,n.linger=0,n.sink=0,this.chunks.update(this.age,n)}onSpawn(){this.dustEmitter.reset(),this.pebbleEmitter.reset(),this._blown=!1,this._seed=Math.random()*100,this.chunks.roll(this._seed),this.chunks.reset(),this.apron.setVisible(!0),this._syncUniforms(0,0,0),this._syncApron(0,1)}_blast(){let e=u.sinkhole,n=u.global,i=t.uTime.value;this._centrePoint(M),M.y=.35,this.ctx.bursts.spawn(h.EARTH,M,{radius:e.burstSize*.3,endRadius:e.burstSize*n.explosionIntensity,life:1.2,intensity:e.burstIntensity,opacity:.85,fresnel:1,displace:.75,squash:.45,colorA:r(e.colorBurstA),colorB:r(e.colorBurstB),colorC:r(e.colorBurstC)}),this._centrePoint(M),this.ctx.decals.spawn(y.SHOCKWAVE,M,{radius:e.shockRadius*n.explosionIntensity,life:.8,width:.06,intensity:.8,colorA:r(e.colorShockA),colorB:r(e.colorShockB)}),M.y=.25,j.position=M,j.radius=e.zoneRadius*.95,j.direction=N.set(0,d(e.blastLift),0),j.speed=e.blastSpeed,j.speedVariance=.7,j.spread=1,j.inherit=null,j.anchor=null,j.size=1.5,j.sizeVariance=.6,j.life=e.dustLifetime*1.4,j.lifeVariance=.45,j.spin=.5,j.tint=null,j.time=i,this.dust.emit(Math.round(e.blastDust*n.particleCount),j),this.ctx.shake.add(e.impactShake*n.explosionIntensity*n.cameraShake,1/Math.max(.1,e.shakeDuration),12),this.ctx.flash.trigger(r(e.colorFlash),e.impactFlash*n.explosionIntensity),this.lightBoost=e.lightIntensity*1.6*n.explosionIntensity}_settleFx(e,n,r){let i=u.sinkhole,a=u.global,o=t.uTime.value;if(r<.05)return;this._centrePoint(P);let s=Math.round(this.dustEmitter.tick(e,i.dustRate*n)*a.particleCount);s>0&&(M.copy(P),M.y=.2,j.position=M,j.radius=i.zoneRadius*.8,j.direction=N.set(0,1,0),j.speed=i.dustSpeed,j.speedVariance=.75,j.spread=.9,j.inherit=null,j.anchor=null,j.size=1.1,j.sizeVariance=.5,j.life=i.dustLifetime,j.lifeVariance=.4,j.spin=.35,j.tint=null,j.time=o,this.dust.emit(s,j));let c=Math.round(this.pebbleEmitter.tick(e,i.pebbleRate*n)*a.particleCount);if(c>0){let e=1-d(i.pebbleBand)*Math.random(),t=Math.random()*k,n=i.zoneRadius*e;M.set(P.x+Math.cos(t)*n,0,P.z+Math.sin(t)*n),M.y=-i.depth*Math.max(0,1-e)**+Math.max(.05,i.wallCurve)*r,j.position=M,j.radius=i.zoneRadius*.06,j.direction=N.set(P.x-M.x,0,P.z-M.z).normalize().multiplyScalar(.45).setY(-1).normalize(),j.speed=i.pebbleSpeed,j.speedVariance=.7,j.spread=.4,j.size=.09,j.sizeVariance=.7,j.life=i.pebbleLifetime,j.lifeVariance=.5,j.spin=9,j.time=o,this.pebbles.emit(c,j)}}onTravel(e){let t=u.sinkhole;this._syncUniforms(0,0,0),this._syncApron(this.u*.75,1),this._syncChunks(),this.ctx.shake.rumble(t.rumble*u.global.cameraShake,e),this._centrePoint(this.position)}onImpact(){this._centrePoint(this.position)}onFade(e,t){let n=u.sinkhole,r=Math.max(.02,n.crackTime),i=Math.max(.02,n.dropTime),a=this.phase===b.IMPACT?this.impactTime:this.impactDuration,o=d(a/r),s=f.inOutCubic(d((a-r)/i)),c=d(n.calve)*d((a-r*.55)/(i*1.5)),l=1,p=s;if(this.phase===b.FADE){let e=d(this.fadeTime/Math.max(.05,n.sinkTime));p=s*(1-f.inCubic(e)),l=1-f.inQuad(d((e-.55)/.45))}this._syncUniforms(p,c,l),this._syncApron(1,l),this._syncChunks(),!this._blown&&s>.06&&(this._blown=!0,this._blast());let m=this.phase===b.IMPACT?n.settleShake:n.settleShake*(2-t);this.ctx.shake.rumble(m*(.4+.6*o)*p*u.global.cameraShake,e),this._settleFx(e,l*(t<=1?1:.35),p),this._centrePoint(this.position)}onDestroy(){this.chunks.reset(),this.apron.setVisible(!1),this.funnel.visible=!1,this.funnelUniforms.uFade.value=0,this._blown=!1}dispose(){this.funnelGeometry.dispose(),this.funnelMaterial.dispose(),this.apron.dispose(),this.chunks.dispose(),this.chunkMaterial.dispose(),super.dispose()}};export{R as SinkholeAbility};
//# sourceMappingURL=SinkholeAbility-CskGcTN8.js.map