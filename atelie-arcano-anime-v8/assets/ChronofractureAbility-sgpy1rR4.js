import{Br as e,Fn as t,G as n,K as r,Qt as i,R as a,V as o,Y as s,_t as c,at as l,di as u,en as d,it as f,jn as p,nt as m,o as h,q as g,st as _,vn as v,vt as y,xt as b,y as x,zn as S}from"./settings-DdywqLlV.js";import{t as C}from"./ParticleSystem-BZTczMT8.js";import{n as w}from"./ParticleEngine-DLxipNH0.js";import{n as ee,t as T}from"./Ability-CYesB5Ur.js";import{n as E,r as D,t as O}from"./GroundField-aLIZg3d3.js";import{n as k,r as A}from"./Distortion-CclodxJd.js";import{r as te}from"./GrowthField-BxvnSH9l.js";import{n as j,t as M}from"./ShatterField-Ky_Am4am.js";var N=28,P=2,F=224,I=Math.PI*2,L={},R=new u,z=new u,B=new u,V=new u,H=new u,U=new u,W=new u,G=new u,K=new u(0,1,0),q=new p,J=new S,Y=new v,X=j(),Z=D(),Q={},$={colorA:new b,colorB:new b,colorEdge:new b,colorScene:new b,opacity:1,glow:1,rim:1,rimPower:2,shade:1,ambient:.4,fadeStart:.6,soft:.2,sceneMix:.7,refract:.05,saturation:.25},ne=`
  attribute float aSeed;
  attribute float aOpen;

  varying float vSeed;
  varying float vOpen;
  varying vec2  vLocal;
  varying vec2  vHalf;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  void main() {
    vSeed = aSeed;
    vOpen = aOpen;

    mat4 im = mat4(1.0);
    #ifdef USE_INSTANCING
      im = instanceMatrix;
    #endif

    // The pane's size lives in the instance matrix and nowhere else, so its
    // column lengths are where the metres are. Recovering them here is what
    // lets every measurement below be a real centimetre count.
    vHalf = vec2(length(im[0].xyz), length(im[1].xyz)) * 0.5;
    vLocal = position.xy * vHalf * 2.0;

    vec4 world = modelMatrix * im * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * mat3(im) * normal);
    vViewDir = cameraPosition - world.xyz;

    vec4 mv = viewMatrix * world;
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,re=`
  uniform vec3  uColorGlass;
  uniform vec3  uColorGhost;
  uniform vec3  uColorRim;
  uniform vec3  uColorSeam;
  uniform vec3  uColorCrack;

  uniform float uOpacity;
  uniform float uGlow;
  uniform float uFrost;
  uniform float uFrostScale;
  uniform float uGrain;
  uniform float uFringe;
  uniform float uFringeOffset;
  uniform float uRim;
  uniform float uRimPower;
  uniform float uBorder;
  uniform float uStill;
  uniform float uStillSpeed;
  uniform float uSoft;
  uniform float uSeamWidth;
  uniform float uSeamGlow;
  uniform float uCrack;
  uniform float uCrackArms;
  uniform float uCrackRings;
  uniform float uCrackWidth;
  uniform float uCrackGlow;
  uniform float uFade;

  uniform float     uTime;
  uniform vec2      uResolution;
  uniform sampler2D uSceneDepth;
  uniform float     uCameraNear;
  uniform float     uCameraFar;
  uniform float     uGlobalGlow;
  uniform float     uShaderIntensity;

  varying float vSeed;
  varying float vOpen;
  varying vec2  vLocal;
  varying vec2  vHalf;
  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vViewZ;

  ${s}
  ${g}

  void main() {
    /* ---- the slit: a pane opens outward from its own centre line ---- */
    float openX = vOpen * vHalf.x;
    float dx = abs(vLocal.x);
    if (dx > openX) discard;

    // The hot edge of the opening has to die as vOpen reaches 1, or every pane
    // keeps a bright vertical bar down each side for the whole hold. The first
    // version did not, and twenty of them read as a rack of fluorescent tubes.
    float seam = smoothstep(max(uSeamWidth, 1e-4), 0.0, openX - dx)
               * (1.0 - smoothstep(0.985, 1.0, vOpen));

    /* ---- the frozen image ---------------------------------------- */
    // There is no scene colour buffer in this build (frame.uSceneColor does not
    // exist yet), so there is nothing behind the pane to resample and age. What
    // gets aged instead is the pane's own grain: one fbm field in the pane's
    // metres, with the red and blue taps pulled uFringeOffset metres apart.
    //
    // That is deliberately the *shape* of the three-tap scene sample this
    // becomes the day somebody adds a colour copy to FrameUniforms — swap the
    // fbm for a texture2D and the look is already authored. Written as a flat
    // tint instead, it would have had to be thrown away.
    //
    // What is faked here and honestly cannot be: the blur. A blur needs
    // neighbours, neighbours need a texture, and a fake blur with no texture is
    // a wash of flat colour that reads as exactly that. The desaturation is
    // real, though — the cold wash is alpha-blended over the frame, so it drags
    // whatever is behind the pane toward uColorGlass, which is what "colder"
    // means when you cannot touch the pixels.
    float drift = uTime * uStillSpeed * uStill;
    vec3 np = vec3(vLocal * uFrostScale, vSeed + drift);
    vec3 tap = vec3(uFringeOffset * uFrostScale, 0.0, 0.0);
    float g0 = fbm3(np);
    float gr = fbm3(np + tap);
    float gb = fbm3(np - tap);
    vec3 ghost = mix(vec3(g0), vec3(gr, g0, gb), clamp(uFringe, 0.0, 2.0)) * 0.5 + 0.5;

    float dust = snoise(vec3(vLocal * uFrostScale * 9.0, vSeed * 3.1)) * 0.5 + 0.5;
    ghost *= mix(1.0, dust, clamp(uGrain, 0.0, 1.0));

    /* ---- the perimeter hairline ---------------------------------- */
    float border = smoothstep(max(uBorder, 1e-4), 0.0, min(vHalf.x - dx, vHalf.y - abs(vLocal.y)));

    /* ---- the fractures ------------------------------------------- */
    // Glass does not craze on a lattice, it fails from one stress point:
    // radial arms out of it, and a ring or two around it. This is the single
    // deliberately angular sample in the file. The house warning about
    // atan(y, x) handing every radius along a bearing the same value and
    // drawing dead-straight spokes is, here, a description of the thing we
    // want — a fracture star genuinely is spokes.
    vec2 stress = (hash21(vSeed * 17.3) - 0.5) * vHalf * 1.2;
    vec2 rel = vLocal - stress;
    float rd = length(rel);
    float arms = max(uCrackArms, 1.0);
    float spoke = abs(fract(atan(rel.y, rel.x) / 6.283185 * arms + hash11(vSeed * 5.7)) - 0.5)
                * 6.283185 / arms * rd;
    float ring = abs(fract(rd * uCrackRings + hash11(vSeed * 9.1)) - 0.5) / max(uCrackRings, 1e-3);
    float crack = smoothstep(max(uCrackWidth, 1e-4), 0.0, min(spoke, ring))
                * clamp(uCrack, 0.0, 1.0)
                * smoothstep(0.0, max(vHalf.x * 0.15, 1e-3), rd);

    /* ---- assemble ------------------------------------------------- */
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), uRimPower);

    // The wash is *not* scaled by the glow: it is the thing that makes the
    // scene behind colder, and a cold wash that blooms is a lamp.
    vec3 emit = uColorGhost * ghost * clamp(uFrost, 0.0, 2.0)
              + uColorRim * fres * uRim
              + uColorSeam * (seam * uSeamGlow + border)
              + uColorCrack * crack * uCrackGlow;
    vec3 color = uColorGlass + emit * uGlow * uGlobalGlow * mix(0.75, 1.0, uShaderIntensity);

    float alpha = uOpacity
                + ghost.g * clamp(uFrost, 0.0, 2.0) * 0.16
                + seam * 0.9
                + border * 0.7
                + crack * 0.8;
    alpha = clamp(alpha, 0.0, 1.0) * uFade;

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoft);

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;function ie(e){let t=3+e,n=new Float32Array(t*3),r=new Float32Array(t*3),i=new Uint16Array((t-2)*3);for(let i=0;i<t;i++){let a=i/t*I+e*.73,o=.34+.66*f(i*3.71+e*11.13);n[i*3+0]=Math.cos(a)*o,n[i*3+1]=Math.sin(a)*o,n[i*3+2]=(f(i*7.19+e*5.31)-.5)*.12,r[i*3+2]=1}for(let e=1;e<t-1;e++)i[(e-1)*3+0]=0,i[(e-1)*3+1]=e,i[(e-1)*3+2]=e+1;let a=new y;return a.setAttribute(`position`,new c(n,3)),a.setAttribute(`normal`,new c(r,3)),a.setIndex(new c(i,1)),a}var ae=class extends T{constructor(e){super(`chronofracture`,e)}createShaders(){this.paneGeometry=new t(1,1),this.paneOpen=new i(new Float32Array(N),1),this.paneSeed=new i(new Float32Array(N),1),this.paneGeometry.setAttribute(`aOpen`,this.paneOpen),this.paneGeometry.setAttribute(`aSeed`,this.paneSeed),this.paneMaterial=new e({name:`Chronofracture:pane`,transparent:!0,blending:1,depthWrite:!1,depthTest:!0,side:2,toneMapped:!1,uniforms:r({uColorGlass:{value:new b},uColorGhost:{value:new b},uColorRim:{value:new b},uColorSeam:{value:new b},uColorCrack:{value:new b},uOpacity:{value:.34},uGlow:{value:1.2},uFrost:{value:.6},uFrostScale:{value:1.4},uGrain:{value:.3},uFringe:{value:.7},uFringeOffset:{value:.05},uRim:{value:1.1},uRimPower:{value:2.6},uBorder:{value:.045},uStill:{value:0},uStillSpeed:{value:.35},uSoft:{value:.35},uSeamWidth:{value:.09},uSeamGlow:{value:3.4},uCrack:{value:0},uCrackArms:{value:7},uCrackRings:{value:1.6},uCrackWidth:{value:.012},uCrackGlow:{value:2.2},uFade:{value:1}}),vertexShader:ne,fragmentShader:re}),this.panes=new d(this.paneGeometry,this.paneMaterial,N),this.panes.name=`Chronofracture:panes`,this.panes.count=0,this.panes.frustumCulled=!1,this.panes.layers.set(o.VFX),this.panes.renderOrder=9,this.group.add(this.panes),this.hullGeometry=new y,this.hullPositions=new Float32Array(N*4*3),this.hullNormals=new Float32Array(N*4*3);let n=new Uint16Array(N*6);for(let e=0;e<N;e++){let t=e*4,r=e*6;n[r+0]=t,n[r+1]=t+1,n[r+2]=t+2,n[r+3]=t+2,n[r+4]=t+1,n[r+5]=t+3}this.hullPositionAttribute=new c(this.hullPositions,3),this.hullNormalAttribute=new c(this.hullNormals,3),this.hullGeometry.setAttribute(`position`,this.hullPositionAttribute),this.hullGeometry.setAttribute(`normal`,this.hullNormalAttribute),this.hullGeometry.setIndex(new c(n,1)),this.hullGeometry.setDrawRange(0,0),this.hull=new k({mode:A.REFRACT,geometry:this.hullGeometry,renderOrder:4,name:`chronofracture.panes`}),this.hull.material.side=2,this.group.add(this.hull.object3D),this.shatter=new M(this.group,{geometry:ie,variants:P,capacity:F,additive:!1,depthWrite:!1,renderOrder:10}),this.seal=new O(this.group,{mode:E.RUNE,additive:!1,renderOrder:7,name:`Chronofracture:seal`}),this._seed=0,this._lockedAt=-1,this._shatterAt=-1,this._panes=[];for(let e=0;e<N;e++)this._panes.push({angle:0,radial:0,heightRoll:0,yawRoll:0,tiltRoll:0,sizeRoll:0,delayRoll:0,seed:0});this._liveCount=0}createParticles(){let e=this.ctx.particles;this.motes=e.get(`chronofracture.motes`,{capacity:1400,shape:C.SOFT,additive:!0,curl:!0,softFade:.5}),this.motes.uniforms.uDrag.value=3.2,this.motes.uniforms.uEndSize.value=.6,this.motes.uniforms.uSizeIn.value=.25,this.motes.uniforms.uFadeIn.value=.3,this.motes.uniforms.uFadeOut.value=.45,this.glints=e.get(`chronofracture.glints`,{capacity:2200,shape:C.STREAK,additive:!0,stretch:!0,softFade:.25}),this.glints.uniforms.uDrag.value=1.6,this.glints.uniforms.uEndSize.value=.2,this.glints.uniforms.uSizeIn.value=.03,this.glints.uniforms.uFadeIn.value=.04,this.glints.uniforms.uFadeOut.value=.5,this.chips=e.get(`chronofracture.chips`,{capacity:1200,shape:C.CHIP,additive:!1,lit:!0,softFade:.25}),this.chips.uniforms.uDrag.value=.3,this.chips.uniforms.uEndSize.value=.7,this.chips.uniforms.uFadeOut.value=.65,this.moteEmitter=new w,this.glintEmitter=new w}get instanceCount(){return this._liveCount+this.shatter.count}get impactDuration(){let e=h.chronofracture;return Math.max(.05,(e.assembleTime+e.holdTime)*h.global.lifetime)}get fadeDuration(){return Math.max(.05,h.chronofracture.fadeTime)}get _assembleSpan(){return Math.max(.02,h.chronofracture.assembleTime*h.global.lifetime)}lightShimmer(){let e=h.chronofracture;return this.phase===ee.TRAVEL?1:this._shatterAt>=0||this.impactTime>=this._assembleSpan?e.lightHold:1}onSpawn(){this.moteEmitter.reset(),this.glintEmitter.reset(),this.shatter.clear(),this._seed=Math.random()*100,this._lockedAt=-1,this._shatterAt=-1,this._liveCount=0;for(let e=0;e<N;e++){let t=this._panes[e];t.angle=Math.random(),t.radial=Math.sqrt(Math.random()),t.heightRoll=Math.random()*2-1,t.yawRoll=Math.random()*2-1,t.tiltRoll=Math.random()*2-1,t.sizeRoll=Math.random()*2-1,t.delayRoll=Math.random(),t.seed=Math.random()*10,this.paneSeed.array[e]=t.seed}this.paneSeed.needsUpdate=!0,this._syncPaneLook(0,1),this._syncSeal(0,0,1),this._syncShatterLook()}_zoneCentre(e){return this.pointAt(1,e)}_placePanes(e){let t=h.chronofracture,n=m(Math.round(t.paneCount),0,N);if(n<=0||e<0)return this.panes.count=0,this.hullGeometry.setDrawRange(0,0),this.hull.visible=!1,0;this.hull.visible=!0,this._zoneCentre(B);let r=this._assembleSpan,i=m(t.assembleStagger,0,.98),a=Math.max(.02,r*(1-i)),o=Math.max(.05,t.assembleCurve),s=h.global.randomness;for(let c=0;c<n;c++){let n=this._panes[c],u=_((e-n.delayRoll*i*r)/a)**+o;this.paneOpen.array[c]=u;let d=n.angle*I,f=Math.cos(d),p=Math.sin(d),m=t.zoneRadius*l(t.paneInner,t.paneReach,n.radial);R.copy(B).addScaledVector(this.direction,f*m).addScaledVector(this.side,p*m),R.y=t.paneHeight+n.heightRoll*t.paneRise*s,H.copy(this.direction).multiplyScalar(f).addScaledVector(this.side,p),H.lengthSq()<1e-8&&H.copy(this.direction),H.normalize().lerp(this.direction,1-_(t.paneFaceOut)),H.lengthSq()<1e-8&&H.copy(this.direction),H.normalize(),H.applyAxisAngle(K,n.yawRoll*t.paneYaw*s),U.crossVectors(K,H),U.lengthSq()<1e-8&&U.set(1,0,0),U.normalize(),J.setFromAxisAngle(U,n.tiltRoll*t.paneTilt*s),H.applyQuaternion(J).normalize(),W.crossVectors(H,U).normalize(),Y.makeBasis(U,W,H),q.quaternion.setFromRotationMatrix(Y),q.position.copy(R);let h=1+n.sizeRoll*t.paneSizeJitter*s,g=Math.max(.02,t.paneWidth*h),v=Math.max(.02,g*t.paneAspect);q.scale.set(g,v,1),q.updateMatrix(),this.panes.setMatrixAt(c,q.matrix);let y=g*.5*u,b=v*.5;for(let e=0;e<4;e++){let t=e&1?1:-1,n=e&2?1:-1;G.copy(R).addScaledVector(U,t*y).addScaledVector(W,n*b);let r=(c*4+e)*3;this.hullPositions[r+0]=G.x,this.hullPositions[r+1]=G.y,this.hullPositions[r+2]=G.z,this.hullNormals[r+0]=H.x,this.hullNormals[r+1]=H.y,this.hullNormals[r+2]=H.z}}return this.panes.count=n,this.panes.instanceMatrix.needsUpdate=!0,this.paneOpen.needsUpdate=!0,this.hullPositionAttribute.needsUpdate=!0,this.hullNormalAttribute.needsUpdate=!0,this.hullGeometry.setDrawRange(0,n*6),n}_syncPaneLook(e,t){let n=h.chronofracture,r=h.global,i=this.paneMaterial.uniforms;i.uColorGlass.value.copy(a(n.colorGlass)),i.uColorGhost.value.copy(a(n.colorGhost)),i.uColorRim.value.copy(a(n.colorRim)),i.uColorSeam.value.copy(a(n.colorSeam)),i.uColorCrack.value.copy(a(n.colorCrack)),i.uOpacity.value=n.paneOpacity*r.opacity,i.uGlow.value=n.paneGlow*r.glow,i.uFrost.value=n.frost*r.noiseStrength,i.uFrostScale.value=n.frostScale*r.noiseFrequency,i.uGrain.value=n.grain,i.uFringe.value=n.fringe,i.uFringeOffset.value=n.fringeOffset,i.uRim.value=n.rim*r.fresnel,i.uRimPower.value=n.rimPower,i.uBorder.value=n.border,i.uStill.value=n.stillness,i.uStillSpeed.value=n.stillSpeed*r.noiseSpeed,i.uSoft.value=n.paneSoft,i.uSeamWidth.value=n.seamWidth,i.uSeamGlow.value=n.seamGlow,i.uCrack.value=e,i.uCrackArms.value=Math.max(1,Math.round(n.crackArms)),i.uCrackRings.value=n.crackRings,i.uCrackWidth.value=n.crackWidth,i.uCrackGlow.value=n.crackGlow,i.uFade.value=t,Q.strength=n.refractStrength*t,Q.power=n.refractPower,Q.opacity=n.refractOpacity,Q.ripple=n.refractRipple,Q.rippleScale=n.refractRippleScale,Q.rippleSpeed=n.refractRippleSpeed,Q.depthReject=n.refractDepthReject,Q.depthFade=n.refractDepthFade,Q.seed=this._seed,this.hull.update(Q)}_syncSeal(e,t,n){let r=h.chronofracture,i=h.global;this._zoneCentre(B),Z.centre=B,Z.yaw=Math.atan2(this.direction.x,this.direction.z),Z.height=r.sealHeight,Z.radius=Math.max(.1,r.zoneRadius*r.sealScale),Z.grow=e,Z.recede=0,Z.inscribe=t,Z.ignite=_(t*1.35-.35),Z.fade=n,Z.seed=this._seed,Z.edge=r.sealEdge,Z.ragged=r.sealRagged,Z.raggedScale=r.sealRaggedScale,Z.warp=r.sealWarp,Z.relief=r.sealRelief,Z.normalStep=r.sealNormalStep,Z.ambient=r.sealAmbient,Z.wrap=r.sealWrap,Z.specular=r.sealSpecular,Z.gloss=r.sealGloss,Z.parallax=r.sealParallax,Z.cell=r.sealCell,Z.detail=r.sealDetail,Z.thickness=r.sealThickness,Z.depth=r.sealDepth,Z.rings=Math.round(r.sealRings),Z.ringInner=r.sealRingInner,Z.glyphSize=r.sealGlyphSize,Z.glyphStroke=r.sealGlyphStroke,Z.glyphGap=r.sealGlyphGap,Z.spin=r.sealSpin,Z.spinFalloff=r.sealSpinFalloff,Z.rule=r.sealRule,Z.additive=!1,Z.emissive=r.sealEmissive,Z.opacity=r.sealOpacity,Z.depthFade=r.sealDepthFade,Z.colorBase=r.colorSealBase,Z.colorEdge=r.colorSealEdge,Z.colorGlow=r.colorSealGlow,Z.colorDeep=r.colorSealDeep,Z.noiseStrength=i.noiseStrength,Z.noiseFrequency=i.noiseFrequency,Z.noiseSpeed=i.noiseSpeed,Z.opacityScale=i.opacity,this.seal.update(Z)}_syncShatterLook(){let e=h.chronofracture,t=h.global;$.colorA.copy(a(e.colorShardA)),$.colorB.copy(a(e.colorShardB)),$.colorEdge.copy(a(e.colorShardEdge)),$.colorScene.copy(a(e.colorShardScene)),$.opacity=e.shardOpacity*t.opacity,$.glow=e.shardGlow*t.glow,$.rim=e.shardRim*t.fresnel,$.rimPower=e.shardRimPower,$.shade=e.shardShade,$.ambient=e.shardAmbient,$.fadeStart=e.shardFadeStart,$.soft=e.shardSoft,$.sceneMix=e.shardSceneMix,$.refract=e.shardRefract,$.saturation=e.shardSaturation,this.shatter.sync($)}_syncShatterFlight(){let e=h.chronofracture,t=h.global,n=Math.max(.01,Math.max(e.paneInner,e.paneReach)),r=e.zoneRadius*n;this._zoneCentre(B),X.layout=te.LINE,X.origin=V.copy(B).addScaledVector(this.direction,-r),X.direction=this.direction,X.side=this.side,X.length=r*2,X.width=r,X.centre=null,X.radius=r,X.spawnHeight=e.paneHeight,X.spawnRadius=e.shardScatter,X.speed=e.shardSpeed,X.speedJitter=e.shardSpeedJitter,X.spread=e.shardSpread,X.upBias=e.shardUp,X.inherit=null,X.inheritScale=1,X.gravity=e.shardGravity,X.drag=e.shardDrag,X.size=e.shardSize,X.sizeJitter=e.shardSizeJitter,X.shrink=e.shardShrink,X.shrinkPower=e.shardShrinkPower,X.spin=e.shardSpin,X.spinJitter=e.shardSpinJitter,X.lifetime=e.shardLifetime,X.floor=e.shardFloor,X.floorSpin=e.shardFloorSpin,X.randomness=t.randomness,this.shatter.update(this.age,X)}_bandPoint(e){let t=h.chronofracture,n=Math.random()*I,r=t.zoneRadius*l(t.paneInner,t.paneReach,Math.sqrt(Math.random()));return this._zoneCentre(e),e.addScaledVector(this.direction,Math.cos(n)*r),e.addScaledVector(this.side,Math.sin(n)*r),e.y=t.paneHeight+(Math.random()*2-1)*t.paneRise,e}_airFx(e,t){let r=h.chronofracture,i=h.global,a=n.uTime.value,o=Math.round(this.moteEmitter.tick(e,r.moteRate*t)*i.particleCount);o>0&&(this._bandPoint(R),L.position=R,L.radius=r.zoneRadius*.12,L.direction=z.set(0,1,0),L.speed=r.moteSpeed,L.speedVariance=.9,L.spread=1,L.inherit=null,L.anchor=null,L.size=.1,L.sizeVariance=.6,L.life=r.moteLifetime,L.lifeVariance=.4,L.spin=0,L.tint=null,L.time=a,this.motes.emit(o,L));let s=Math.round(this.glintEmitter.tick(e,r.glintRate*t)*i.particleCount);s>0&&(this._bandPoint(R),L.position=R,L.radius=r.paneWidth*.6,L.direction=z.set(0,-1,0),L.speed=r.glintSpeed,L.speedVariance=.8,L.spread=1,L.inherit=null,L.anchor=null,L.size=.18,L.sizeVariance=.7,L.life=r.glintLifetime,L.lifeVariance=.5,L.spin=0,L.tint=null,L.time=a,this.glints.emit(s,L))}_syncParticles(){let e=h.chronofracture,t=h.global;this.motes.setGradient(a(e.colorMoteA),a(e.colorMoteB),a(e.colorMoteC),a(e.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,e.moteDrift,0),this.motes.uniforms.uSizeScale.value=e.moteSize*t.particleSize*7,this.motes.uniforms.uLifeScale.value=e.moteLifetime*.5*t.particleLifetime,this.motes.uniforms.uSpeedScale.value=t.particleSpeed,this.motes.uniforms.uOpacity.value=t.opacity,this.motes.uniforms.uGlow.value=.85*t.glow,this.motes.uniforms.uTurbulence.value=e.moteTurbulence*t.turbulence,this.glints.setGradient(a(e.colorGlintA),a(e.colorGlintB),a(e.colorGlintC),a(e.colorGlintD)),this.glints.uniforms.uGravity.value.set(0,e.glintGravity,0),this.glints.uniforms.uSizeScale.value=e.glintSize*t.particleSize*7,this.glints.uniforms.uLifeScale.value=e.glintLifetime*.5*t.particleLifetime,this.glints.uniforms.uSpeedScale.value=t.particleSpeed,this.glints.uniforms.uOpacity.value=t.opacity,this.glints.uniforms.uGlow.value=1.1*t.glow,this.glints.uniforms.uStretch.value=e.glintStretch,this.chips.setGradient(a(e.colorChipA),a(e.colorChipB),a(e.colorChipC),a(e.colorChipD)),this.chips.uniforms.uGravity.value.set(0,e.chipGravity,0),this.chips.uniforms.uSizeScale.value=e.chipSize*t.particleSize*7,this.chips.uniforms.uLifeScale.value=e.chipLifetime*.5*t.particleLifetime,this.chips.uniforms.uSpeedScale.value=t.particleSpeed,this.chips.uniforms.uOpacity.value=t.opacity}onTravel(e){let t=h.chronofracture;this._syncParticles(),this._syncSeal(this.u,_(this.u*.8),1),this._syncPaneLook(0,1),this._syncShatterLook(),this._syncShatterFlight(),this._liveCount=this._placePanes(-1),this.position.y=l(.2,t.paneHeight,_(this.u))}onImpact(){this.ctx.shake.add(h.chronofracture.breakShake*.25*h.global.cameraShake,4,18)}onFade(e,t){let n=h.chronofracture;if(this._syncParticles(),this._syncShatterLook(),t<=1){let t=this.impactTime,r=this._assembleSpan,i=Math.max(0,this.impactDuration-t),o=t<r,s=n.crackLead>1e-4?_(1-i/n.crackLead):0;this._syncPaneLook(s,1),this._syncSeal(1,_(.8+t/Math.max(r,.001)*.2),1),this._liveCount=this._placePanes(t),this._syncShatterFlight(),!o&&this._lockedAt<0&&(this._lockedAt=this.age,this.ctx.flash.trigger(a(n.colorFreezeFlash),n.freezeFlash*h.global.explosionIntensity)),this._airFx(e,o?1:.12),this._zoneCentre(this.position),this.position.y=n.paneHeight;return}this._shatterAt<0&&this._break();let r=_(t-1);this._syncPaneLook(1,0),this._liveCount=this._placePanes(-1),this._syncSeal(1,1,1-r*r),this._syncShatterFlight(),this._airFx(e,.25*(1-r)),this._zoneCentre(this.position),this.position.y=n.paneHeight*(1-r*.7)}_break(){let e=h.chronofracture,t=h.global,r=n.uTime.value;this._shatterAt=this.age;let i=m(Math.round(e.paneCount),0,N),o=Math.max(0,Math.round(e.shardsPerPane)),s=Math.max(.01,Math.max(e.paneInner,e.paneReach));for(let t=0;t<i;t++){let n=this._panes[t],r=n.angle*I,i=l(e.paneInner,e.paneReach,n.radial)/s;this.shatter.burst(this.age,o,.5+.5*Math.cos(r)*i,Math.sin(r)*i)}this._zoneCentre(R),R.y=e.paneHeight,this.ctx.bursts.spawn(x.FROST,R,{radius:e.breakBurst*.25,endRadius:e.breakBurst*t.explosionIntensity,life:.6,intensity:e.breakBurstIntensity,opacity:.85,fresnel:1.7,displace:.4,squash:.9,colorA:a(e.colorBreakA),colorB:a(e.colorBreakB),colorC:a(e.colorBreakC)}),L.position=R,L.radius=e.zoneRadius*.85,L.direction=z.set(0,-.35,0).normalize(),L.speed=e.glintSpeed*2.4,L.speedVariance=.9,L.spread=1,L.inherit=null,L.anchor=null,L.size=.24,L.sizeVariance=.8,L.life=e.glintLifetime*1.6,L.lifeVariance=.6,L.spin=0,L.tint=null,L.time=r,this.glints.emit(Math.round(e.glintBurst*t.particleCount),L),L.speed=e.chipSpeed,L.size=.16,L.life=e.chipLifetime,L.spin=9,this.chips.emit(Math.round(e.chipBurst*t.particleCount),L),this.ctx.shake.add(e.breakShake*t.explosionIntensity*t.cameraShake,1/Math.max(.05,e.breakShakeDuration),24),this.ctx.flash.trigger(a(e.colorBreakFlash),e.breakFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*e.lightBreak*.1*t.explosionIntensity}onDestroy(){this.shatter.clear(),this.panes.count=0,this._liveCount=0,this.hullGeometry.setDrawRange(0,0),this.hull.visible=!1,this.paneMaterial.uniforms.uFade.value=0}dispose(){this.paneGeometry.dispose(),this.paneMaterial.dispose(),this.hullGeometry.dispose(),this.hull.dispose(),this.shatter.dispose(),this.seal.dispose(),super.dispose()}};export{ae as ChronofractureAbility};
//# sourceMappingURL=ChronofractureAbility-sgpy1rR4.js.map