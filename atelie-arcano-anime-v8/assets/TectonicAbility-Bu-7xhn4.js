import{Br as e,G as t,Gr as n,K as r,R as i,Rt as a,Tn as o,V as s,X as c,Y as l,_ as u,_t as d,at as f,di as p,en as m,g as h,h as g,jn as _,nt as v,o as y,ot as b,st as x,tt as S,vt as C,xt as w,y as T,yn as E}from"./settings-DdywqLlV.js";import{t as D}from"./ParticleSystem-BZTczMT8.js";import{n as O}from"./ParticleEngine-DLxipNH0.js";import{n as k}from"./GroundDecals-kYmr8HKl.js";import{t as A}from"./Ability-CYesB5Ur.js";var j=Object.freeze({GASH:0,UNDERGLOW:1}),M=Math.PI*2,N=`
  #define PI  3.141592653589793
  #define TAU 6.283185307179586

  uniform vec3  uCentre;
  uniform float uRadius;
  uniform float uAge;
  uniform float uSpin;
  uniform float uArms;
  uniform float uArmJitter;
  uniform float uWander;
  uniform float uSpeedMin;
  uniform float uSpeedMax;
  uniform float uWidth;
  uniform float uWidthScale;
  uniform float uOpenLag;
  uniform float uForkFrac;
  uniform float uForkLength;

  /* position = (baseReach, along, lateral) — unit fractions of the footprint,
     never metres. See the class comment on TectonicAbility. */
  attribute vec4 aShape; // (wander, wanderRate, propagation, widthJitter)
  attribute vec4 aRole;  // (arm index, bearing jitter, fork progress, speed dice)
  attribute vec2 aEdge;  // (across the ribbon, fork rank)

  varying float vBehind;
  varying float vSince;
  varying float vAcross;
  varying float vTaper;
  varying float vProp;
  varying float vLive;

  void main() {
    float baseReach = position.x;
    float along = position.y;
    float lateral = position.z;

    float wander = aShape.x;
    float rate = aShape.y;
    float prop = aShape.z;
    float widthJit = aShape.w;

    float arm = aRole.x;
    float bearJit = aRole.y;
    float fork = aRole.z;
    float speed01 = aRole.w;

    float across = aEdge.x;
    float rank = aEdge.y;

    // An arm past the live count is culled, and so is a fork whose rank sits
    // above the density fraction. Main arms are rank 0 and survive everything.
    float live = step(arm, uArms - 0.5) * step(rank, uForkFrac);

    float bearing = uSpin + (arm + 0.5) / max(uArms, 1.0) * TAU + bearJit * uArmJitter;
    float theta = bearing + wander * uWander;
    float dTheta = rate * uWander;

    vec2 dir = vec2(cos(theta), sin(theta));
    vec2 tangent = normalize(vec2(dir.x - baseReach * dTheta * dir.y,
                                  dir.y + baseReach * dTheta * dir.x));
    vec2 sideDir = vec2(-tangent.y, tangent.x);

    vec2 unitPoint = dir * baseReach + tangent * along + sideDir * lateral;

    // A fork is pinched to a point wherever the length slider currently ends.
    float forkTaper = pow(clamp(1.0 - fork / max(uForkLength, 1e-3), 0.0, 1.0), 0.7);
    float taper = mix(1.0, forkTaper, step(1e-4, fork));

    float speed = max(mix(uSpeedMin, uSpeedMax, speed01), 0.01);
    float behind = uAge * speed - prop * uRadius;   // metres of reach behind the tip

    // The crack is a hairline at the tip and opens out behind it: it unzips
    // rather than appearing at full width, which is most of what sells the
    // motion. The first cut opened instantly and read as a decal being wiped on.
    float openWidth = smoothstep(0.0, max(uOpenLag, 0.01), behind);
    float halfWidth = uWidth * 0.5 * uWidthScale * widthJit * taper * openWidth * live;

    vec3 world = uCentre + vec3(unitPoint.x * uRadius + sideDir.x * across * halfWidth,
                                0.0,
                                unitPoint.y * uRadius + sideDir.y * across * halfWidth);

    vBehind = behind;
    vSince = behind / speed;    // seconds this point has been open — the ember clock
    vAcross = across;
    vTaper = taper;
    vProp = prop;
    vLive = live;

    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`,P=`
  uniform float uTime;
  uniform float uRadius;
  uniform float uFade;
  uniform float uSeed;
  uniform float uTipFeather;
  uniform float uHeat;
  uniform float uCool;
  uniform float uPulse;
  uniform float uFlicker;
  uniform float uTipFlash;
  uniform float uGrain;
  uniform float uPassOpacity;
  uniform float uGlobalGlow;
  uniform float uShaderIntensity;
  uniform vec3  uColorSeam;
  uniform vec3  uColorRed;
  uniform vec3  uColorEmber;
  uniform vec3  uColorHot;

  varying float vBehind;
  varying float vSince;
  varying float vAcross;
  varying float vTaper;
  varying float vProp;
  varying float vLive;

  ${l}

  void main() {
    if (vLive < 0.5) discard;

    // Nothing exists in front of the tip.
    float open = smoothstep(0.0, max(uTipFeather, 0.005), vBehind);
    if (open < 0.002) discard;

    /*
     * The cooling is the point of the ability, so it is a real exponential on
     * the *local* clock rather than one fade over the whole network: a point
     * one metre out has been open for far longer than a point on the rim, so
     * by the time the boundary is still tearing white the middle is already
     * dull basalt. Fading the lot together looked like a light being switched
     * off, which is the one thing cooling stone does not do.
     */
    float cool = exp(-max(vSince, 0.0) / max(uCool, 0.02));

    float grain = snoise01(vec3(vProp * uRadius * 2.7, vAcross * 1.6, uSeed));
    float pulse = sin(vProp * uRadius * 3.1 - uTime * uPulse) * 0.22 + 0.78;
    float flick = mix(1.0, snoise01(vec3(vProp * 7.3, uTime * 2.6, uSeed + 4.1)), uFlicker);

    float across = abs(vAcross);
    float centreness = 1.0 - smoothstep(0.1, 1.0, across);
    float lip = 1.0 - smoothstep(0.78, 1.0, across);
    // A white flash rides the tearing tip itself.
    float flash = (1.0 - smoothstep(0.0, max(uTipFeather * 2.5, 0.01), abs(vBehind))) * uTipFlash;

    float heat = uHeat * cool * centreness * pulse * flick * (vTaper * 0.4 + 0.6) + flash;

    #if TECTONIC_PASS == 0                                    /* THE GASH */
      vec3 color = mix(uColorSeam, uColorRed, smoothstep(0.0, 0.5, heat));
      color = mix(color, uColorEmber, smoothstep(0.5, 1.1, heat));
      color = mix(color, uColorHot, smoothstep(1.1, 2.0, heat));
      // Only the hot part of the gash answers to the global glow. Multiplying
      // the cold seam by it as well made a dead crack brighten when the bloom
      // was turned up, which is backwards.
      color *= mix(1.0, uGlobalGlow, smoothstep(0.2, 1.2, heat));
      float alpha = open * lip * uFade * uPassOpacity * mix(1.0, grain, uGrain);

    #else                                                     /* THE UNDERGLOW */
      float falloff = pow(max(1.0 - across, 0.0), 1.7);
      float strength = falloff * heat * 0.4;
      vec3 color = (uColorEmber * strength + uColorHot * flash * 0.5) * uGlobalGlow;
      float alpha = open * uFade * uPassOpacity * clamp(strength * 2.0, 0.0, 1.0);
    #endif

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(clamp(color * mix(0.7, 1.0, uShaderIntensity), 0.0, 64.0),
                        clamp(alpha, 0.0, 1.0));
  }
`;function F(t=j.GASH){let n=t===j.UNDERGLOW,a=new e({defines:{TECTONIC_PASS:t},transparent:!0,depthWrite:!1,depthTest:!0,blending:n?2:1,side:2,toneMapped:!1,uniforms:r({uCentre:{value:new p},uRadius:{value:7},uAge:{value:0},uFade:{value:1},uSeed:{value:0},uSpin:{value:0},uArms:{value:5},uArmJitter:{value:.22},uWander:{value:1.1},uSpeedMin:{value:9},uSpeedMax:{value:17},uWidth:{value:.5},uWidthScale:{value:n?3.4:1},uOpenLag:{value:.9},uTipFeather:{value:.3},uForkFrac:{value:.7},uForkLength:{value:.8},uHeat:{value:1.6},uCool:{value:1.1},uPulse:{value:3.2},uFlicker:{value:.35},uTipFlash:{value:1.6},uGrain:{value:.45},uPassOpacity:{value:n?.5:1},uColorSeam:{value:new w(.05,.04,.03)},uColorRed:{value:new w(.5,.13,.03)},uColorEmber:{value:new w(1,.48,.16)},uColorHot:{value:new w(1,.85,.63)}}),vertexShader:N,fragmentShader:P});return a.name=n?`TectonicUnderglow`:`TectonicGash`,a.userData.sync=e=>{let t=y.tectonic,r=y.global,o=a.uniforms;o.uCentre.value.copy(e.centre),o.uCentre.value.y=t.fissureHeight,o.uAge.value=e.age,o.uFade.value=e.fade,o.uSeed.value=e.seed,o.uSpin.value=e.spin*M,o.uRadius.value=Math.max(.2,t.zoneRadius),o.uArms.value=v(Math.round(t.arms),1,8),o.uArmJitter.value=t.armJitter,o.uWander.value=t.wander*r.randomness,o.uSpeedMin.value=Math.max(.2,t.fissureSpeed)*r.speed,o.uSpeedMax.value=Math.max(.2,t.fissureSpeed*(1+Math.max(0,t.speedSpread)))*r.speed,o.uWidth.value=t.fissureWidth,o.uWidthScale.value=n?t.glowWidth:1,o.uOpenLag.value=t.openLag,o.uTipFeather.value=t.tipFeather,o.uForkFrac.value=t.forks,o.uForkLength.value=t.forkLength,o.uHeat.value=t.emberHeat*r.shaderIntensity,o.uCool.value=t.emberCool,o.uPulse.value=t.emberPulse,o.uFlicker.value=t.emberFlicker,o.uTipFlash.value=t.tipFlash,o.uGrain.value=t.fissureGrain*r.noiseStrength,o.uPassOpacity.value=(n?t.glowOpacity:t.gashOpacity)*r.opacity,o.uColorSeam.value.copy(i(t.colorSeam)),o.uColorRed.value.copy(i(t.colorMagma)),o.uColorEmber.value.copy(i(t.colorEmber)),o.uColorHot.value.copy(i(t.colorHot))},a}var I=s.VFX,L=64,R=18,z=2,B=800,V=40,H=.05,U=Math.PI*2,W=[1,0,.62,.28,.85,.14,.46,.74],G={},K=new p,q=new p,J=new p,Y=new p,X=new p,Z=new _,Q=class extends A{constructor(e){super(`tectonic`,e)}createShaders(){this._buildFissureGeometry(),this.gashMaterial=F(j.GASH),this.glowMaterial=F(j.UNDERGLOW),this.fissureMaterials=[this.glowMaterial,this.gashMaterial],this.fissureMeshes=[];for(let[e,t]of this.fissureMaterials.entries()){let n=new E(this.geometry,t);n.frustumCulled=!1,n.matrixAutoUpdate=!1,n.layers.set(I),n.renderOrder=e===0?7:9,n.visible=!1,this.group.add(n),this.fissureMeshes.push(n)}this.lipGeometry=c({seed:8.3,detail:1,lumpiness:.3,noiseScale:1.7,roughness:.2,cuts:4,cutDepth:.22,craters:2}),this.lipMaterial=new o({color:9076587,roughness:.96,metalness:.02,flatShading:!0}),this.lips=new m(this.lipGeometry,this.lipMaterial,V),this.lips.castShadow=!0,this.lips.receiveShadow=!0,this.lips.frustumCulled=!1,this.lips.count=0,this.lips.layers.set(s.WORLD),this.group.add(this.lips),this.ring=new g({mode:h.DOME,prefix:`ring`,nodes:36,sides:72,renderOrder:13}),this.ring.visible=!1,this.group.add(this.ring.group),this._ringConfig=Object.create(y.tectonic);let e=u(`ring`,h.DOME);for(let t of Object.keys(e))t in y.tectonic||(this._ringConfig[t]=e[t]);this._spin=0,this._seed=0,this._slamTime=-1,this._lipsDrawn=0,this._lipCount=0,this._markArm=0,this._bearJitter=new Float32Array(8),this._wander=new Float32Array(8*L),this._wanderRate=new Float32Array(8*L),this.lipRecords=[];for(let e=0;e<V;e++)this.lipRecords.push({arm:0,reach:0,side:1,yaw:0,size:0,flat:0,offset:0});this._state={centre:new p,age:0,fade:1,seed:0,spin:0},this._ringState={origin:new p,axis:new p(0,1,0),side:new p(1,0,0),span:0,t:0,fade:1,seed:0}}_buildFissureGeometry(){let e=B*2;this.positions=new Float32Array(e*3),this.shapes=new Float32Array(e*4),this.roles=new Float32Array(e*4),this.edges=new Float32Array(e*2),this.indices=new Uint16Array(B*6);for(let t=0;t<e;t++)this.edges[t*2]=t%2==0?-1:1;this.geometry=new C;let t=(e,t)=>new d(e,t).setUsage(a);this.geometry.setAttribute(`position`,t(this.positions,3)),this.geometry.setAttribute(`aShape`,t(this.shapes,4)),this.geometry.setAttribute(`aRole`,t(this.roles,4)),this.geometry.setAttribute(`aEdge`,t(this.edges,2)),this.geometry.setIndex(new d(this.indices,1)),this.geometry.setDrawRange(0,0),this.geometry.boundingSphere=new n(new p,1e4)}createParticles(){let e=this.ctx.particles;this.dust=e.get(`tectonic.dust`,{capacity:3e3,shape:D.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.dust.uniforms.uDrag.value=2.2,this.dust.uniforms.uEndSize.value=3.4,this.dust.uniforms.uSizeIn.value=.1,this.dust.uniforms.uFadeIn.value=.12,this.dust.uniforms.uFadeOut.value=.34,this.grit=e.get(`tectonic.grit`,{capacity:2e3,shape:D.CHIP,additive:!1,lit:!0,softFade:.25}),this.grit.uniforms.uDrag.value=.2,this.grit.uniforms.uEndSize.value=.8,this.grit.uniforms.uFadeOut.value=.72,this.embers=e.get(`tectonic.embers`,{capacity:2200,shape:D.SOFT,additive:!0,curl:!0,softFade:.4}),this.embers.uniforms.uDrag.value=1.5,this.embers.uniforms.uEndSize.value=.16,this.embers.uniforms.uSizeIn.value=.05,this.embers.uniforms.uFadeIn.value=.07,this.embers.uniforms.uFadeOut.value=.42,this.dustEmitter=new O,this.gritEmitter=new O,this.emberEmitter=new O,this.markEmitter=new O}get instanceCount(){return this._lipsDrawn+this.ring.instanceCount}get radius(){return Math.max(.2,y.tectonic.zoneRadius)}_speedOf(e){let t=y.tectonic;return Math.max(.2,t.fissureSpeed)*Math.max(.05,y.global.speed)*(1+Math.max(0,t.speedSpread)*e)}_fastArrival(){return this.radius/this._speedOf(1)}_slowArrival(){return this.radius/this._speedOf(0)}get slamAge(){return this._slamTime<0?0:Math.max(0,this.age-this._slamTime)}get propagation(){return x(this.slamAge/Math.max(.02,this._slowArrival()))}get impactDuration(){return Math.max(.2,this._slowArrival()+y.tectonic.holdTime*y.global.lifetime)}get fadeDuration(){return Math.max(.2,y.tectonic.settleTime)}lightShimmer(){let e=y.tectonic,t=.86+.14*Math.sin(this.age*e.lightBreath);return this._slamTime<0?t:t*(e.lightFloor+(1-e.lightFloor)*Math.exp(-this.slamAge/Math.max(.05,e.emberCool)))}_generate(){let e=0,t=0,n=(1-H)/(L-1);for(let r=0;r<8;r++){this._bearJitter[r]=b(-1,1);let i=W[r],a=r*L,o=b(-1,1),s=o,c=0;for(let e=0;e<L;e++)this._wander[a+e]=c,s=v(s+b(-.45,.45),-3,3),s=f(s,o,.08),c=c*.94+s*n;for(let e=0;e<L;e++){let t=this._wander[a+Math.max(0,e-1)],r=this._wander[a+Math.min(L-1,e+1)],i=(Math.min(L-1,e+1)-Math.max(0,e-1))*n;this._wanderRate[a+e]=i>1e-6?(r-t)/i:0}let l=1,u=e;for(let t=0;t<L;t++){let o=H+t*n;l=v(l+b(-.16,.16),.6,1.45);let s=x((1-o)/.16)**.55,c=x((o-H)/.07)**.5;e=this._pushNode(e,o,0,0,this._wander[a+t],this._wanderRate[a+t],o,l*s*c,r,this._bearJitter[r],0,i,0)}t=this._stitch(u,e,t);for(let o=0;o<z;o++){let s=Math.floor(b(L*.28,L*.82)),c=H+s*n,l=(Math.random()<.5?1:-1)*b(.52,1.22),u=Math.cos(l),d=Math.sin(l),f=b(.16,.34),p=(o*8+r+1)/(z*8),m=e;for(let t=0;t<R;t++){let n=t/(R-1),o=n*f;e=this._pushNode(e,c,u*o,d*o,this._wander[a+s],this._wanderRate[a+s],c+o,.62*(1-n*.25)*b(.8,1.2),r,this._bearJitter[r],Math.max(n,.001),i,p)}t=this._stitch(m,e,t)}}this.geometry.setDrawRange(0,t*6);for(let e of[`position`,`aShape`,`aRole`,`aEdge`])this.geometry.attributes[e].needsUpdate=!0;this.geometry.index.needsUpdate=!0;let r=0,i=Math.max(3,Math.floor((L-10)/Math.ceil(V/8)));for(let e=0;e<8&&r<V;e++)for(let t=6;t<L-2&&r<V;t+=i){let a=this.lipRecords[r++];a.arm=e,a.reach=H+t*n,a.side=t%(i*2)==6%(i*2)?1:-1,a.yaw=Math.random(),a.size=Math.random(),a.flat=Math.random(),a.offset=Math.random()}this._lipCount=r}_pushNode(e,t,n,r,i,a,o,s,c,l,u,d,f){if(e>=B)return e;let p=e*2;for(let e=0;e<2;e++){let m=p+e;this.positions[m*3+0]=t,this.positions[m*3+1]=n,this.positions[m*3+2]=r,this.shapes[m*4+0]=i,this.shapes[m*4+1]=a,this.shapes[m*4+2]=o,this.shapes[m*4+3]=s,this.roles[m*4+0]=c,this.roles[m*4+1]=l,this.roles[m*4+2]=u,this.roles[m*4+3]=d,this.edges[m*2+1]=f}return e+1}_stitch(e,t,n){for(let r=e;r<t-1;r++){let e=r*2;this.indices[n*6+0]=e,this.indices[n*6+1]=e+1,this.indices[n*6+2]=e+2,this.indices[n*6+3]=e+1,this.indices[n*6+4]=e+3,this.indices[n*6+5]=e+2,n++}return n}_armFrame(e,t,n,r=null){let i=y.tectonic,a=y.global,o=v(Math.round(i.arms),1,8),s=this.radius,c=x((t-H)/(1-H))*(L-1),l=Math.min(L-1,Math.floor(c)),u=Math.min(L-1,l+1),d=c-l,p=e*L,m=f(this._wander[p+l],this._wander[p+u],d),h=f(this._wanderRate[p+l],this._wanderRate[p+u],d),g=i.wander*a.randomness,_=this._spin*U+(e+.5)/o*U+this._bearJitter[e]*i.armJitter+m*g,b=h*g,S=Math.cos(_),C=Math.sin(_);return n.set(this._state.centre.x+S*t*s,i.fissureHeight,this._state.centre.z+C*t*s),r&&(r.set(S-t*b*C,0,C+t*b*S),r.lengthSq()<1e-8&&r.set(S,0,C),r.normalize()),n}_tipReach(e){return x(this.slamAge*this._speedOf(W[e])/this.radius)}onSpawn(){this.dustEmitter.reset(),this.gritEmitter.reset(),this.emberEmitter.reset(),this.markEmitter.reset(),this._seed=Math.random()*100,this._spin=Math.random(),this._slamTime=-1,this._markArm=0,this._generate(),this._lipsDrawn=0,this.lips.count=0,this.ring.visible=!1;for(let e of this.fissureMeshes)e.visible=!1;this._sync(1),this._muzzleFx()}_sync(e){let t=y.tectonic,n=y.global,r=this._state;this.pointAt(1,r.centre).setY(0),r.age=this.slamAge,r.fade=e,r.seed=this._seed,r.spin=this._spin;for(let e of this.fissureMaterials)e.userData.sync(r);let a=this._slamTime>=0;for(let t of this.fissureMeshes)t.visible=a&&e>.002;this._poseLips(e),this._syncRing(e),this.dust.setGradient(i(t.colorDustA),i(t.colorDustB),i(t.colorDustC),i(t.colorDustD)),this.dust.uniforms.uGravity.value.set(0,t.dustRise,0),this.dust.uniforms.uSizeScale.value=t.dustSize*n.particleSize,this.dust.uniforms.uLifeScale.value=t.dustLifetime*.5*n.particleLifetime,this.dust.uniforms.uSpeedScale.value=t.dustSpeed*n.particleSpeed,this.dust.uniforms.uOpacity.value=t.dustOpacity*n.opacity,this.dust.uniforms.uTurbulence.value=t.dustTurbulence*n.turbulence,this.grit.setGradient(i(t.colorGritA),i(t.colorGritB),i(t.colorGritC),i(t.colorGritD)),this.grit.uniforms.uGravity.value.set(0,t.gritGravity,0),this.grit.uniforms.uSizeScale.value=t.gritSize*n.particleSize*7,this.grit.uniforms.uLifeScale.value=n.particleLifetime,this.grit.uniforms.uSpeedScale.value=n.particleSpeed,this.grit.uniforms.uOpacity.value=n.opacity,this.embers.setGradient(i(t.colorSparkA),i(t.colorSparkB),i(t.colorSparkC),i(t.colorSparkD)),this.embers.uniforms.uGravity.value.set(0,t.emberRise,0),this.embers.uniforms.uSizeScale.value=t.emberSize*n.particleSize*7,this.embers.uniforms.uLifeScale.value=t.emberLifetime*.5*n.particleLifetime,this.embers.uniforms.uSpeedScale.value=n.particleSpeed,this.embers.uniforms.uOpacity.value=n.opacity,this.embers.uniforms.uGlow.value=t.emberGlow*n.glow,this.embers.uniforms.uTurbulence.value=t.emberTurbulence*n.turbulence}_poseLips(e){let t=y.tectonic,n=y.global,r=S.inCubic(x(1-e)),a=0;for(let e=0;e<this._lipCount;e++){let i=this.lipRecords[e],o=i.arm,s=o<v(Math.round(t.arms),1,8),c=this.slamAge*this._speedOf(W[o])-i.reach*this.radius,l=s?x(c/Math.max(.05,t.rubbleEmerge)):0;if(l<=.001)Z.position.set(0,-999,0),Z.quaternion.identity(),Z.scale.setScalar(1e-4);else{let e=t.rubbleSize*f(.55,1.35,i.size)*(1+i.flat*.2*n.randomness);this._armFrame(o,i.reach,K,Y);let a=t.fissureWidth*.55+i.offset*t.rubbleSpread+e*.15;Z.position.set(K.x-Y.z*a*i.side,-e*f(.3,.6,i.flat)-r*(e*2+.4),K.z+Y.x*a*i.side),Z.rotation.set(0,i.yaw*U,0);let s=S.outBack(Math.min(1,l));Z.scale.set(e*s,e*f(.45,.85,i.flat)*s,e*.8*s)}Z.updateMatrix(),this.lips.setMatrixAt(e,Z.matrix),a=e+1}this._lipsDrawn=a,this.lips.count=a,this.lips.instanceMatrix.needsUpdate=!0,this.lipMaterial.color.copy(i(t.colorRubble))}_syncRing(e){let t=y.tectonic,n=Math.max(.02,this._fastArrival()),r=x(this.slamAge/n);this._ringConfig[this.ring.keys.radiusEnd]=this.radius*t.ringReach;let i=this._ringState;i.origin.copy(this._state.centre),i.side.copy(this.side),i.t=r,i.fade=e*(1-x((this.slamAge-n)/Math.max(.05,t.ringFade))),i.seed=this._seed,this.ring.sync(this._ringConfig,i),this.ring.visible=this._slamTime>=0&&i.fade>.004}_muzzleFx(){let e=y.tectonic,n=y.global;K.copy(this.origin).addScaledVector(this.direction,e.handForward),K.y=.1,this.ctx.bursts.spawn(T.EARTH,K,{radius:e.muzzleSize*.25,endRadius:e.muzzleSize*n.explosionIntensity,life:.5,intensity:e.muzzleIntensity,opacity:.7,fresnel:1.2,displace:.6,squash:.45,colorA:i(e.colorDustB),colorB:i(e.colorDustA),colorC:i(e.colorRubble)}),G.position=K,G.radius=.3,G.direction=J.copy(this.direction).multiplyScalar(.5).setY(.7).normalize(),G.speed=e.gritSpeed*.7,G.speedVariance=.8,G.spread=.9,G.inherit=null,G.anchor=null,G.size=.1,G.sizeVariance=.7,G.life=e.gritLifetime*.7,G.lifeVariance=.5,G.spin=8,G.tint=null,G.time=t.uTime.value,this.grit.emit(Math.round(14*n.particleCount),G),this.lightBoost=e.lightIntensity*.35*n.explosionIntensity}_frontFx(e){let n=y.tectonic,r=y.global,i=Math.round(this.dustEmitter.tick(e,n.dustRate*.25)*r.particleCount);i<=0||(G.position=K.copy(this.position).setY(.1),G.radius=.45,G.direction=J.set(0,1,0),G.speed=n.dustSpeed*.6,G.speedVariance=.7,G.spread=1,G.inherit=null,G.anchor=null,G.size=.6,G.sizeVariance=.5,G.life=n.dustLifetime*.7,G.lifeVariance=.4,G.spin=.4,G.tint=null,G.time=t.uTime.value,this.dust.emit(i,G))}_tipFx(e,n){let r=y.tectonic,a=y.global,o=t.uTime.value,s=v(Math.round(r.arms),1,8),c=this.radius,l=r.dustLag/c,u=Math.round(this.dustEmitter.tick(e,r.dustRate*n)*a.particleCount),d=Math.round(this.gritEmitter.tick(e,r.gritRate*n)*a.particleCount),f=Math.round(this.emberEmitter.tick(e,r.emberRate*n)*a.particleCount);for(let e=0;e<s;e++){let t=this._tipReach(e),n=+(t<1),i=Math.max(H,t-l),a=Math.floor(u/s)*n;a>0&&(this._armFrame(e,i,q,Y),q.y=r.dustHeight,G.position=q,G.radius=r.fissureWidth*1.6+.1,G.direction=J.set(-Y.z*(e%2==0?1:-1),r.dustLift,Y.x*(e%2==0?1:-1)).normalize(),G.speed=r.dustSpeed,G.speedVariance=.75,G.spread=.85,G.inherit=null,G.anchor=null,G.size=.7,G.sizeVariance=.5,G.life=r.dustLifetime,G.lifeVariance=.4,G.spin=.5,G.tint=null,G.time=o,this.dust.emit(a,G));let c=Math.floor(d/s)*n;c>0&&(this._armFrame(e,t,q,Y),q.y=.05,G.position=q,G.radius=r.fissureWidth*.8,G.direction=J.set(Y.x*.35,1,Y.z*.35).normalize(),G.speed=r.gritSpeed,G.speedVariance=.8,G.spread=.7,G.size=.1,G.sizeVariance=.75,G.life=r.gritLifetime,G.lifeVariance=.5,G.spin=9,G.time=o,this.grit.emit(c,G));let p=Math.floor(f/s);p>0&&(this._armFrame(e,Math.max(H,t*(.15+.7*Math.random())),q,null),q.y=.08,G.position=q,G.radius=r.fissureWidth*.7,G.direction=J.set(0,1,0),G.speed=r.emberSpeed,G.speedVariance=.8,G.spread=.9,G.size=.07,G.sizeVariance=.6,G.life=r.emberLifetime,G.lifeVariance=.5,G.spin=0,G.time=o,this.embers.emit(p,G))}let p=this.markEmitter.tick(e,r.markRate*n);for(let e=0;e<p;e++){this._markArm=(this._markArm+1)%s;let e=this._tipReach(this._markArm);e>=1||(this._armFrame(this._markArm,Math.max(H,e-l*.5),q,null),this.ctx.decals.spawn(k.DUSTRING,q,{radius:r.markRadius*b(.7,1.3),life:r.markLife,intensity:r.markIntensity,colorA:i(r.colorDustB),colorB:i(r.colorDustA),height:.012}))}}onTravel(e){this._sync(1),this.position.y=.3,this._frontFx(e),this.ctx.shake.rumble(y.tectonic.travelRumble*y.global.cameraShake,e)}onImpact(){let e=y.tectonic,n=y.global,r=t.uTime.value;this._slamTime=this.age,this._centreFx(e,n,r)}_centreFx(e,t,n){this.pointAt(1,X).setY(0),K.copy(X).setY(.3),this.ctx.bursts.spawn(T.EARTH,K,{radius:e.slamSize*.3,endRadius:e.slamSize*t.explosionIntensity,life:.85,intensity:e.slamIntensity,opacity:.85,fresnel:1.1,displace:.7,squash:.45,colorA:i(e.colorDustB),colorB:i(e.colorDustA),colorC:i(e.colorEmber)}),this.ctx.decals.spawn(k.CRACK,X,{radius:this.radius*e.starRadius,life:e.starLife,width:e.starWidth,intensity:e.starIntensity,colorA:i(e.colorSeam),colorB:i(e.colorEmber),height:.014}),this.ctx.decals.spawn(k.DUSTRING,X,{radius:this.radius*e.slamDust,life:e.markLife*1.6,intensity:e.markIntensity,colorA:i(e.colorDustA),colorB:i(e.colorDustB),height:.01}),G.position=K,G.radius=this.radius*.18,G.direction=J.set(0,1,0),G.speed=e.gritSpeed*1.6,G.speedVariance=.85,G.spread=.85,G.inherit=null,G.anchor=null,G.size=.14,G.sizeVariance=.8,G.life=e.gritLifetime*1.3,G.lifeVariance=.5,G.spin=11,G.tint=null,G.time=n,this.grit.emit(Math.round(e.slamGrit*t.particleCount),G),G.radius=this.radius*.3,G.speed=e.dustSpeed*1.8,G.spread=1,G.size=1.2,G.life=e.dustLifetime*1.2,G.spin=.6,this.dust.emit(Math.round(e.slamDustCount*t.particleCount),G),this.ctx.shake.add(e.slamShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.slamShakeTime),19),this.ctx.flash.trigger(i(e.colorFlash),e.slamFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.2*t.explosionIntensity}onFade(e,t){let n=y.tectonic,r=t<=1?1:1-S.inQuad(x(t-1));this._sync(r),this.pointAt(1,this.position).setY(n.lightHeight),this._tipFx(e,r*(t<=1?1:.3));let i=this.propagation,a=i<1?i**+Math.max(.05,n.shakeRamp):Math.exp(-(this.slamAge-this._slowArrival())/Math.max(.05,n.shakeDecay));this.ctx.shake.rumble(n.slamRumble*a*r*y.global.cameraShake,e)}onDestroy(){this._slamTime=-1,this._lipsDrawn=0,this.lips.count=0,this.ring.visible=!1;for(let e of this.fissureMeshes)e.visible=!1;for(let e of this.fissureMaterials)e.uniforms.uFade.value=0}dispose(){this.geometry.dispose();for(let e of this.fissureMaterials)e.dispose();this.lipGeometry.dispose(),this.lipMaterial.dispose(),this.lips.dispose(),this.ring.dispose(),super.dispose()}};export{Q as TectonicAbility};
//# sourceMappingURL=TectonicAbility-Bu-7xhn4.js.map