import{G as e,R as t,Tn as n,Ut as r,V as i,Y as a,at as o,di as s,it as c,nt as l,o as u,ot as d,st as f,ui as p,vt as m,xt as h,y as g}from"./settings-DdywqLlV.js";import{t as _}from"./ParticleSystem-BZTczMT8.js";import{n as v}from"./ParticleEngine-DLxipNH0.js";import{n as y}from"./GroundDecals-kYmr8HKl.js";import{n as b,t as x}from"./Ability-CYesB5Ur.js";import{n as S,t as C}from"./GroundField-aLIZg3d3.js";import{n as w,r as T,t as E}from"./GrowthField-BxvnSH9l.js";import{t as D}from"./ShatterField-Ky_Am4am.js";function O(r){let i=new n({color:16777215,roughness:.14,metalness:0,flatShading:!0,transparent:!0,side:2,depthWrite:!0}),o={uTime:e.uTime,uCurl:{value:2.5},uCurlDelay:{value:.34},uCurlSpread:{value:.55},uCurlHinge:{value:-.06},uCurlDir:{value:new p(0,1)},uSublimeOrigin:{value:new s},uSublimeDir:{value:new s(0,0,1)},uSublimeFront:{value:-1e4},uSublimeEdge:{value:1.1},uSublimeGlow:{value:2.2},uColorSublime:{value:new h},uColorSheet:{value:new h},uColorDeep:{value:new h},uColorLip:{value:new h},uColorGlow:{value:new h},uDepthTint:{value:1.15},uDepthPower:{value:1.5},uTranslucency:{value:.9},uFresnel:{value:1.6},uFresnelPower:{value:2.2},uLipGlow:{value:1.8},uLipWidth:{value:.45},uLipPower:{value:1.6},uGrain:{value:.4},uGrainScale:{value:4.5},uGlint:{value:1.3},uGlintScale:{value:26},uGlintSpeed:{value:.5},uGlow:{value:1.25},uBirthGlow:{value:2.6},uBirthPower:{value:6}};return r.registerShadowCasterWithPatch(i,e=>{Object.assign(e.uniforms,o),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
         attribute float aSeed;
         attribute float aBirth;
         uniform float uCurl;
         uniform float uCurlDelay;
         uniform float uCurlSpread;
         uniform float uCurlHinge;
         uniform vec2  uCurlDir;
         varying vec3  vSheetLocal;
         varying vec3  vSheetWorld;
         varying float vSheetSeed;
         varying float vSheetBirth;
         varying float vSheetRoll;
         varying float vSheetPeel;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
         vSheetSeed  = aSeed;
         vSheetBirth = aBirth;

         // GrowthField's birth flash, read backwards, is the only per-instance
         // stopwatch the field publishes: 0 the instant this plate locked,
         // 1 once its curl clock has run out. See the module header.
         float locked = 1.0 - aBirth;
         float peel = smoothstep(uCurlDelay, 1.0, locked);
         vSheetPeel = peel;

         // The plan of the plate is authored around its own axes and the wind
         // is a world direction, so the wind has to come back into object
         // space or a yawed plate peels sideways. Columns 0 and 2 of the
         // instance matrix are the instance's own X and Z in world; flattened
         // and normalised they are its yaw, scale removed.
         vec2 wind = uCurlDir;
         #ifdef USE_INSTANCING
           vec2 ex = vec2(instanceMatrix[0].x, instanceMatrix[0].z);
           vec2 ez = vec2(instanceMatrix[2].x, instanceMatrix[2].z);
           ex = length(ex) > 1e-5 ? normalize(ex) : vec2(1.0, 0.0);
           ez = length(ez) > 1e-5 ? normalize(ez) : vec2(0.0, 1.0);
           wind = vec2(dot(uCurlDir, ex), dot(uCurlDir, ez));
         #endif
         float windLen = length(wind);
         wind = windLen > 1e-5 ? wind / windLen : vec2(0.0, 1.0);

         // ...plus a small per-plate bearing jitter, because a field that peels
         // on exactly one bearing reads as combed rather than as frozen.
         float bearing = (aSeed - 5.0) * uCurlSpread * 0.2;
         float cb = cos(bearing);
         float sb = sin(bearing);
         wind = vec2(wind.x * cb - wind.y * sb, wind.x * sb + wind.y * cb);

         // Constant-curvature roll about the hinge line. Everything upwind of
         // the hinge is left alone; downwind of it the sheet wraps onto a
         // cylinder whose radius shrinks as the plate peels.
         float along = dot(transformed.xz, wind);
         float reach = max(0.5 - uCurlHinge, 0.05);
         float rollT = clamp(max(0.0, along - uCurlHinge) / reach, 0.0, 1.0);
         vSheetRoll = rollT * peel;

         float bend = uCurl * peel;
         if (bend > 1.0e-3) {
           float radius = reach / bend;
           // The sheet has thickness, and a roll tighter than the sheet is
           // thick turns it inside out.
           float body = min(transformed.y, radius * 0.85);
           float theta = bend * rollT;
           vec2 perp = vec2(-wind.y, wind.x);
           float across = dot(transformed.xz, perp);
           float lifted = radius - (radius - body) * cos(theta);
           float slid = uCurlHinge + (radius - body) * sin(theta);
           transformed.xz = wind * slid + perp * across;
           transformed.y = lifted;
         }

         vSheetLocal = transformed;
         #ifdef USE_INSTANCING
           vSheetWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
         #else
           vSheetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
         #endif`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
         uniform float uTime;
         uniform vec3  uColorSheet;
         uniform vec3  uColorDeep;
         uniform vec3  uColorLip;
         uniform vec3  uColorGlow;
         uniform vec3  uColorSublime;
         uniform float uDepthTint;
         uniform float uDepthPower;
         uniform float uTranslucency;
         uniform float uFresnel;
         uniform float uFresnelPower;
         uniform float uLipGlow;
         uniform float uLipWidth;
         uniform float uLipPower;
         uniform float uGrain;
         uniform float uGrainScale;
         uniform float uGlint;
         uniform float uGlintScale;
         uniform float uGlintSpeed;
         uniform float uGlow;
         uniform float uBirthGlow;
         uniform float uBirthPower;
         uniform vec3  uSublimeOrigin;
         uniform vec3  uSublimeDir;
         uniform float uSublimeFront;
         uniform float uSublimeEdge;
         uniform float uSublimeGlow;
         varying vec3  vSheetLocal;
         varying vec3  vSheetWorld;
         varying float vSheetSeed;
         varying float vSheetBirth;
         varying float vSheetRoll;
         varying float vSheetPeel;
         ${a}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           vec3  N   = normalize(normal);
           float ndv = clamp(dot(N, normalize(vViewPosition)), 0.0, 1.0);

           // A sheet, not a solid: face-on the ray crosses the thickness and
           // almost nothing absorbs; edge-on it runs the length of the plate.
           // This is the inverted term the module header is about.
           float depth = clamp(pow(1.0 - ndv, uDepthPower) * uDepthTint, 0.0, 1.0);
           float fres = pow(1.0 - ndv, uFresnelPower) * uFresnel;

           vec3 body = mix(uColorSheet, uColorDeep, depth);

           // The lip: the outer band of the roll, and only once the plate has
           // actually peeled. A flat plate has no lip and must not glow.
           float lip = pow(smoothstep(1.0 - uLipWidth, 1.0, vSheetRoll), uLipPower) * vSheetPeel;
           body = mix(body, uColorLip, clamp(lip * 0.8, 0.0, 1.0));

           // Rime grain in *world* space, so two plates that interlock look
           // frozen out of the same film rather than each carrying its own
           // private pattern. Local space was tried and every plate wore an
           // identical bullseye, which is the giveaway of an instanced field.
           float grain = fbm3(vSheetWorld * uGrainScale + vSheetSeed * 3.7) * 0.5 + 0.5;
           float frost = smoothstep(0.52, 1.0, grain);
           body = mix(body, uColorLip, frost * uGrain);

           // Pinpoint glints, scrolling slowly in world space.
           float glint = snoise(vSheetWorld * uGlintScale +
                                vec3(0.0, uTime * uGlintSpeed, 0.0) + vSheetSeed * 17.0);
           glint = pow(clamp(glint, 0.0, 1.0), 12.0);

           // The sublimation front, in metres downrange of the caster. Below
           // the front the plate has gone; the transition band is where the ice
           // is actually turning to vapour, so that is where it is brightest.
           float reach = dot(vSheetWorld - uSublimeOrigin, uSublimeDir);
           float gone = 1.0 - smoothstep(uSublimeFront - uSublimeEdge,
                                         uSublimeFront + uSublimeEdge, reach);
           float band = clamp(gone * (1.0 - gone) * 4.0, 0.0, 1.0);

           vec3 glow = uColorGlow * lip * uLipGlow;
           glow += uColorLip * fres * 0.45;
           glow += uColorGlow * frost * uTranslucency * 0.5;
           glow += uColorLip * glint * uGlint;
           glow += uColorGlow * pow(clamp(vSheetBirth, 0.0, 1.0), uBirthPower) * uBirthGlow;
           glow += uColorSublime * band * uSublimeGlow;
           glow *= uGlow;

           // The same Reinhard ceiling the crystals use: every term above peaks
           // at a grazing angle, so without it a plate on the silhouette sums
           // past 5x white and the bloom pass smears the whole corridor.
           glow /= 1.0 + glow * 0.22;

           diffuseColor.rgb *= body;
           totalEmissiveRadiance += glow;

           // Thin face-on so the plate behind shows through, denser along the
           // roll and at the lip where there is genuinely more ice in the way.
           diffuseColor.a = clamp(diffuseColor.a * (0.4 + 0.6 * clamp(depth + lip, 0.0, 1.0)), 0.0, 1.0);
           diffuseColor.a *= 1.0 - gone;
         }`)}),i.userData.uniforms=o,i.userData.sync=()=>{let e=u.rime,n=u.global;o.uColorSheet.value.copy(t(e.colorSheet)),o.uColorDeep.value.copy(t(e.colorDeep)),o.uColorLip.value.copy(t(e.colorLip)),o.uColorGlow.value.copy(t(e.colorGlow)),o.uColorSublime.value.copy(t(e.colorSublime)),o.uCurl.value=e.curl,o.uCurlDelay.value=Math.min(.95,e.curlDelay),o.uCurlSpread.value=e.curlSpread*n.randomness,o.uCurlHinge.value=e.curlHinge,o.uDepthTint.value=e.depthTint,o.uDepthPower.value=e.depthPower,o.uTranslucency.value=e.translucency,o.uFresnel.value=e.fresnel*n.fresnel,o.uFresnelPower.value=e.fresnelPower,o.uLipGlow.value=e.lipGlow,o.uLipWidth.value=Math.min(.99,e.lipWidth),o.uLipPower.value=e.lipPower,o.uGrain.value=e.grain*n.shaderIntensity,o.uGrainScale.value=e.grainScale*n.noiseFrequency,o.uGlint.value=e.glint*n.shaderIntensity,o.uGlintScale.value=e.glintScale,o.uGlintSpeed.value=e.glintSpeed*n.noiseSpeed,o.uGlow.value=e.glow*n.glow,o.uBirthGlow.value=e.birthGlow,o.uBirthPower.value=Math.max(.5,e.birthPower),o.uSublimeEdge.value=Math.max(.02,e.sublimeEdge),o.uSublimeGlow.value=e.sublimeGlow,i.opacity=e.opacity*n.opacity,i.roughness=e.roughness,i.envMapIntensity=e.envIntensity},i.userData.sync(),i}var k=Math.PI*2,A=216,j=3,M=2,N=10,P={},F=new s,I=new s,L=new s;function R(e,t){let n=3.1+e*17.3,i=l(Math.round(t?.facets??11),5,24),a=l(Math.round(t?.rings??8),2,20),o=l(t?.rimJitter??.34,0,.95),s=t?.buckle??.055,u=Math.max(1e-4,t?.thickness??.04),d=[];for(let e=0;e<i;e++)d.push(.5*(1-o*c(n*3.1+e*7.7)));let f=(e,t,r)=>s*Math.sin(e*6.1+n*2.3)*Math.cos(t*5.3-n*1.7)*r,p=[],h=[];for(let e=0;e<a;e++){let t=.12+.88*(e/(a-1)),n=[],r=[];for(let e=0;e<i;e++){let a=e/i*k,o=d[e]*t,s=Math.cos(a)*o,c=Math.sin(a)*o,l=f(s,c,t);n.push([s,l,c]),r.push([s,l+u,c])}p.push(n),h.push(r)}let g=[0,0,0],_=[0,u,0],v=[],y=(e,t,n)=>{v.push(e[0],e[1],e[2],t[0],t[1],t[2],n[0],n[1],n[2])};for(let e=0;e<i;e++){let t=(e+1)%i;y(_,h[0][t],h[0][e]),y(g,p[0][e],p[0][t]);for(let n=0;n<a-1;n++)y(h[n][e],h[n][t],h[n+1][e]),y(h[n][t],h[n+1][t],h[n+1][e]),y(p[n][t],p[n][e],p[n+1][e]),y(p[n][t],p[n+1][e],p[n+1][t]);let n=a-1;y(h[n][e],h[n][t],p[n][t]),y(h[n][e],p[n][t],p[n][e])}let b=new m;return b.setAttribute(`position`,new r(v,3)),b.computeVertexNormals(),b}function z(e){let t=5.7+e*13.1,n=1.4+c(t)*1.6,i=.42,a=.11+c(t*2.3)*.13,o=i*(Math.cos(n*.5)+1)*.5,s=[],l=(e,t,n)=>{s.push(e[0],e[1],e[2],t[0],t[1],t[2],n[0],n[1],n[2])},u=(e,t)=>{let r=(e/6-.5)*n,s=a*(.45+.55*Math.sin(e/6*Math.PI));return[i*Math.sin(r),i*Math.cos(r)-o,s*t]};for(let e=0;e<6;e++){let t=u(e,-1),n=u(e,1),r=u(e+1,1),i=u(e+1,-1);l(t,n,r),l(t,r,i)}let d=new m;return d.setAttribute(`position`,new r(s,3)),d.computeVertexNormals(),d}var B=class extends x{constructor(e){super(`rime`,e)}createShaders(){this.material=O(this.ctx.environment),this.plateUniforms=this.material.userData.uniforms,this._shape={facets:11,rings:8,rimJitter:.34,buckle:.055,thickness:.04},this._fillShape(),this.plates=new w(this.group,{geometry:R,material:this.material,shape:this._shape,variants:j,capacity:A,layer:i.WORLD,renderOrder:2,castShadow:!1,receiveShadow:!0}),this.plates.onBreach=(e,t,n)=>this._lockFx(t,n),this.glaze=new C(this.group,{mode:S.PLATE,additive:!1,name:`Rime:glaze`}),this.curls=new D(this.group,{geometry:z,variants:M,capacity:192,renderOrder:6}),this._growth={layout:T.LINE,emerge:E.SCALE,origin:new s,direction:new s(0,0,1),side:new s(1,0,0),length:1,heightJitter:0,lean:0,baseHeight:0},this._ground={centre:new s},this._shatter={layout:T.LINE,origin:new s,direction:new s(0,0,1),side:new s(1,0,0),length:1},this._look={},this._seed=0,this._poolTime=-1,this._snapped=!1}createParticles(){let e=this.ctx.particles;this.mist=e.get(`rime.mist`,{capacity:2400,shape:_.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.mist.uniforms.uDrag.value=2.1,this.mist.uniforms.uEndSize.value=2.8,this.mist.uniforms.uSizeIn.value=.12,this.mist.uniforms.uFadeIn.value=.18,this.mist.uniforms.uFadeOut.value=.3,this.glints=e.get(`rime.glints`,{capacity:2e3,shape:_.SOFT,additive:!0,curl:!0,softFade:.4}),this.glints.uniforms.uDrag.value=1.3,this.glints.uniforms.uEndSize.value=.16,this.glints.uniforms.uSizeIn.value=.05,this.glints.uniforms.uFadeIn.value=.07,this.glints.uniforms.uFadeOut.value=.34,this.chips=e.get(`rime.chips`,{capacity:1600,shape:_.CHIP,additive:!1,lit:!0,softFade:.25}),this.chips.uniforms.uDrag.value=.3,this.chips.uniforms.uEndSize.value=.7,this.chips.uniforms.uFadeOut.value=.7,this.mistEmitter=new v,this.glintEmitter=new v}get instanceCount(){return this.plates.count+this.curls.count}get impactDuration(){return Math.max(.1,u.rime.lifetime*u.global.lifetime)}get fadeDuration(){let e=u.rime;return Math.max(.1,e.snapDelay+e.sublimeTime)}lightShimmer(){let e=u.rime;return 1-e.lightPulse*(.5-.5*Math.cos(this.age*e.lightPulseSpeed*k))}_fillShape(){let e=u.rime,t=this._shape;return t.facets=e.facets,t.rings=e.rings,t.rimJitter=e.rimJitter,t.buckle=e.buckle,t.thickness=e.thickness/Math.max(.02,e.plateHeight),t}_fillGrowth(){let e=u.rime,t=u.global,n=this._growth;return n.origin.copy(this.origin),n.direction.copy(this.direction),n.side.copy(this.side),n.length=this.length,n.widthNear=e.widthNear,n.width=e.width,n.widthCurve=e.widthCurve,n.frontBias=e.frontBias,n.clumping=e.clumping,n.scatter=e.scatter,n.clusterRadius=e.clusterRadius,n.heightNear=e.plateHeight,n.height=e.plateHeightFar,n.heightCurve=e.heightCurve,n.crown=e.crown,n.crownPower=e.crownPower,n.radiusNear=e.plateRadius,n.radius2=e.plateRadiusFar,n.radiusCurve=e.radiusCurve,n.radiusJitter=e.radiusJitter,n.tilt=e.tilt,n.twist=e.twist,n.riseTime=e.riseTime,n.riseOvershoot=e.riseOvershoot,n.settle=e.settle,n.springRate=e.springRate,n.birthScale=e.birthScale,n.birthFade=Math.max(.05,e.curlTime),n.randomness=t.randomness,n}_fillGround(e,t,n){let r=u.rime,i=u.global,a=this._ground;return this.pointAt(1,a.centre),a.yaw=Math.atan2(this.direction.x,this.direction.z),a.height=r.poolHeight,a.radius=r.poolRadius,a.seed=this._seed,a.grow=e,a.recede=t,a.fade=n,a.edge=r.poolEdge,a.ragged=r.poolRagged,a.raggedScale=r.poolRaggedScale,a.warp=r.poolWarp,a.relief=r.poolRelief,a.normalStep=r.poolNormalStep,a.ambient=r.poolAmbient,a.wrap=r.poolWrap,a.specular=r.poolSpecular,a.gloss=r.poolGloss,a.parallax=r.poolParallax,a.cell=r.poolCell,a.cellJitter=r.poolCellJitter,a.seam=r.poolSeam,a.thickness=r.poolThickness,a.lift=r.poolLift,a.detail=r.poolDetail,a.windAngle=0,a.additive=!1,a.emissive=r.poolEmissive,a.opacity=r.poolOpacity,a.depthFade=r.poolDepthFade,a.colorBase=r.colorPoolBase,a.colorEdge=r.colorPoolEdge,a.colorGlow=r.colorPoolGlow,a.colorDeep=r.colorPoolDeep,a.noiseStrength=i.noiseStrength,a.noiseFrequency=i.noiseFrequency,a.noiseSpeed=i.noiseSpeed,a.opacityScale=i.opacity,a}_fillShatter(){let e=u.rime,t=u.global,n=this._shatter;return n.origin.copy(this.origin),n.direction.copy(this.direction),n.side.copy(this.side),n.length=this.length,n.width=e.width,n.spawnRadius=e.shardSpawnRadius,n.spawnHeight=e.shardSpawnHeight,n.speed=e.shardSpeed,n.speedJitter=e.shardSpeedJitter,n.spread=e.shardSpread,n.upBias=e.shardUpBias,n.gravity=e.shardGravity,n.drag=e.shardDrag,n.size=e.shardSize,n.sizeJitter=e.shardSizeJitter,n.shrink=e.shardShrink,n.shrinkPower=e.shardShrinkPower,n.spin=e.shardSpin,n.spinJitter=e.shardSpinJitter,n.lifetime=e.shardLifetime,n.floor=e.shardFloor,n.floorSpin=e.shardFloorSpin,n.randomness=t.randomness,n}_fillLook(){let e=u.rime,n=u.global,r=this._look;return r.colorA=t(e.colorShardA),r.colorB=t(e.colorShardB),r.colorEdge=t(e.colorShardEdge),r.opacity=e.shardOpacity*n.opacity,r.glow=e.shardGlow*n.glow,r.rim=e.shardRim,r.rimPower=e.shardRimPower,r.shade=e.shardShade,r.ambient=e.shardAmbient,r.fadeStart=e.shardFadeStart,r.soft=e.shardSoft,r}_sublimeFront(){let e=u.rime;if(this.phase!==b.FADE)return-1e4;let t=f((this.fadeTime-e.snapDelay)/Math.max(.05,e.sublimeTime));return o(-e.sublimeEdge,this.length+e.sublimeEdge*2,t)}_poolGrowth(){return this._poolTime<0?0:f((this.age-this._poolTime)/Math.max(.05,u.rime.poolGrow))}_poolRecede(){let e=u.rime;if(this.phase!==b.FADE)return 0;let t=f((this.fadeTime-e.snapDelay)/Math.max(.05,e.sublimeTime)),n=Math.min(.98,e.poolHold);return f((t-n)/(1-n))}onSpawn(){let e=u.rime;this.mistEmitter.reset(),this.glintEmitter.reset(),this._poolTime=-1,this._snapped=!1,this._seed=Math.random()*100,this.curls.clear(),this.plates.plant(Math.min(A,Math.round(e.plateCount)),e.clusterShare),this._syncUniforms(),this._muzzleFx()}_syncUniforms(){let e=u.rime,n=u.global,r=this.plateUniforms;this.material.userData.sync(),r.uCurlDir.value.set(this.direction.x,this.direction.z),r.uSublimeOrigin.value.copy(this.origin),r.uSublimeDir.value.copy(this.direction),r.uSublimeFront.value=this._sublimeFront(),this.curls.sync(this._fillLook()),this.mist.setGradient(t(e.colorMistA),t(e.colorMistB),t(e.colorMistC),t(e.colorMistD)),this.mist.uniforms.uGravity.value.set(0,e.mistRise,0),this.mist.uniforms.uSizeScale.value=e.mistSize*n.particleSize,this.mist.uniforms.uLifeScale.value=e.mistLifetime*.5*n.particleLifetime,this.mist.uniforms.uSpeedScale.value=e.mistSpeed*n.particleSpeed,this.mist.uniforms.uOpacity.value=e.mistOpacity*n.opacity,this.mist.uniforms.uTurbulence.value=.35*n.turbulence,this.glints.setGradient(t(e.colorGlintA),t(e.colorGlintB),t(e.colorGlintC),t(e.colorGlintD)),this.glints.uniforms.uGravity.value.set(0,e.glintRise,0),this.glints.uniforms.uSizeScale.value=e.glintSize*n.particleSize*7,this.glints.uniforms.uLifeScale.value=e.glintLifetime*.5*n.particleLifetime,this.glints.uniforms.uSpeedScale.value=e.glintSpeed*n.particleSpeed,this.glints.uniforms.uOpacity.value=n.opacity,this.glints.uniforms.uGlow.value=.9*n.glow,this.glints.uniforms.uTurbulence.value=e.glintTurbulence*n.turbulence,this.chips.setGradient(t(e.colorChipA),t(e.colorChipB),t(e.colorChipC),t(e.colorChipD)),this.chips.uniforms.uGravity.value.set(0,e.chipGravity,0),this.chips.uniforms.uSizeScale.value=e.chipSize*n.particleSize*7,this.chips.uniforms.uLifeScale.value=e.chipLifetime*.5*n.particleLifetime,this.chips.uniforms.uSpeedScale.value=n.particleSpeed,this.chips.uniforms.uOpacity.value=n.opacity}_syncFields(e,t,n){this.plates.syncGeometry(this._fillShape()),this.plates.update(this.age,this._fillGrowth(),0),this.glaze.update(this._fillGround(e,t,n)),this.curls.update(this.age,this._fillShatter())}_muzzleFx(){let e=u.rime,n=u.global;F.copy(this.origin).addScaledVector(this.direction,.5).setY(.4),this.ctx.bursts.spawn(g.FROST,F,{radius:e.burstSize*.15,endRadius:e.burstSize*.55*n.explosionIntensity,life:.5,intensity:e.burstIntensity*.7,opacity:.8,fresnel:1.4,displace:.4,squash:.7,colorA:t(e.colorBurstA),colorB:t(e.colorBurstB),colorC:t(e.colorBurstC)}),this.lightBoost=e.lightIntensity*.5*n.explosionIntensity}_lockFx(t,n){let r=u.rime,i=u.global;F.copy(t).setY(.05),P.position=F,P.radius=n*.5,P.direction=I.copy(this.direction).multiplyScalar(.45).setY(1).normalize(),P.speed=r.chipSpeed,P.speedVariance=.75,P.spread=.85,P.inherit=null,P.anchor=null,P.size=.09,P.sizeVariance=.7,P.life=r.chipLifetime,P.lifeVariance=.5,P.spin=8,P.tint=null,P.time=e.uTime.value,this.chips.emit(Math.round(r.breachChips*i.particleCount),P)}_corridorFx(t,n){let r=u.rime,i=u.global,a=e.uTime.value,s=this.phase===b.TRAVEL?Math.max(.03,this.u):1,c=Math.round(this.mistEmitter.tick(t,r.mistRate*n)*i.particleCount);if(c>0){let e=this.phase===b.TRAVEL?s:Math.random()*s;this.pointAt(e,F).setY(.14),P.position=F,P.radius=o(r.widthNear,r.width,e)*1.2,P.direction=I.set(0,1,0),P.speed=r.mistSpeed,P.speedVariance=.7,P.spread=1,P.inherit=null,P.anchor=null,P.size=.8,P.sizeVariance=.5,P.life=r.mistLifetime,P.lifeVariance=.4,P.spin=.4,P.tint=null,P.time=a,this.mist.emit(c,P)}let l=Math.round(this.glintEmitter.tick(t,r.glintRate*n)*i.particleCount);if(l>0){let e=Math.random()*s;this.pointAt(e,F).setY(.35),P.position=F,P.radius=o(r.widthNear,r.width,e),P.direction=I.set(0,1,0),P.speed=r.glintSpeed,P.speedVariance=.8,P.spread=.9,P.size=.07,P.sizeVariance=.6,P.life=r.glintLifetime,P.lifeVariance=.5,P.spin=0,P.time=a,this.glints.emit(l,P)}}_snapFx(){let e=u.rime,t=u.global,n=Math.round(e.shardCount*t.particleCount),r=Math.max(1,Math.round(n/N));for(let e=0;e<N;e++)this.curls.burst(this.age,r,(e+.5)/N,d(-.85,.85));this.ctx.shake.add(e.snapShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),22)}onTravel(e){let t=u.rime;this._syncUniforms(),this.plates.triggerUpTo(this.age,this.u,t.lockStagger,t.frontBias,!1),this._syncFields(this._poolGrowth(),0,f(this._poolGrowth()*3)),this._corridorFx(e,1),this.ctx.shake.rumble(t.rumble*u.global.cameraShake,e)}onImpact(){let n=u.rime,r=u.global,i=e.uTime.value;this.plates.triggerUpTo(this.age,1,n.lockStagger,n.frontBias,!0),this._poolTime=this.age,this.pointAt(1,L),F.copy(L).setY(.35),this.ctx.bursts.spawn(g.FROST,F,{radius:n.burstSize*.25,endRadius:n.burstSize*r.explosionIntensity,life:.85,intensity:n.burstIntensity,opacity:.85,fresnel:1.4,displace:.5,squash:.68,colorA:t(n.colorBurstA),colorB:t(n.colorBurstB),colorC:t(n.colorBurstC)}),this.ctx.decals.spawn(y.SHOCKWAVE,L,{radius:n.shockRadius*r.explosionIntensity,life:.7,width:.05,intensity:.85,colorA:t(n.colorShockA),colorB:t(n.colorShockB)}),P.position=F,P.radius=n.poolRadius*.5,P.direction=I.set(0,1,0),P.speed=n.chipSpeed*1.8,P.speedVariance=.8,P.spread=.9,P.inherit=null,P.anchor=null,P.size=.13,P.sizeVariance=.8,P.life=n.chipLifetime*1.3,P.lifeVariance=.5,P.spin=9,P.tint=null,P.time=i,this.chips.emit(Math.round(40*r.particleCount),P),P.speed=n.mistSpeed*2.6,P.spread=1,P.size=1.4,P.life=n.mistLifetime*1.3,P.spin=.5,this.mist.emit(Math.round(70*r.particleCount),P),this.ctx.shake.add(n.impactShake*r.explosionIntensity*r.cameraShake,1/Math.max(.1,n.shakeDuration),18),this.ctx.flash.trigger(t(n.colorFlash),n.impactFlash*r.explosionIntensity),this.lightBoost=n.lightIntensity*1.2*r.explosionIntensity}onFade(e,t){let n=u.rime;this.phase===b.FADE&&!this._snapped&&this.fadeTime>=n.snapDelay&&(this._snapped=!0,this._snapFx()),this._syncUniforms(),this._syncFields(this._poolGrowth(),this._poolRecede(),f(this._poolGrowth()*3));let r=this._sublimeFront();r>0&&(this.pointAt(f(r/Math.max(.1,this.length)),this.position),this.position.y=.3);let i=this.phase===b.FADE?1.4:.5;this._corridorFx(e,i*(t<=1?1:1-f((t-1)*.6)))}onDestroy(){this.plates.clear(),this.curls.clear(),this._poolTime=-1,this._snapped=!1,this.plateUniforms.uSublimeFront.value=-1e4,this.glaze.update(this._fillGround(0,0,0))}dispose(){this.plates.dispose(),this.curls.dispose(),this.glaze.dispose(),this.material.dispose(),super.dispose()}};export{B as RimeAbility};
//# sourceMappingURL=RimeAbility-Trvkvrsz.js.map