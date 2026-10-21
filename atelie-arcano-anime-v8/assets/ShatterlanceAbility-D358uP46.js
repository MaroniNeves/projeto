import{$t as e,Br as t,G as n,K as r,Qt as i,R as a,Tn as o,Ut as s,V as c,Y as l,at as u,di as d,et as f,it as p,nt as m,o as h,ot as g,st as _,tt as v,vt as y,xt as b,y as x,yn as S}from"./settings-DdywqLlV.js";import{t as C}from"./ParticleSystem-BZTczMT8.js";import{n as w}from"./ParticleEngine-DLxipNH0.js";import{n as T}from"./GroundDecals-kYmr8HKl.js";import{n as E,t as D}from"./Ability-CYesB5Ur.js";import{n as O,t as k}from"./GroundField-aLIZg3d3.js";import{n as A,r as j,t as M}from"./GrowthField-BxvnSH9l.js";import{t as N}from"./ShatterField-Ky_Am4am.js";function P(e){let t=new o({color:16777215,roughness:.1,metalness:0,flatShading:!0,transparent:!0,side:2,depthWrite:!0}),r={uTime:n.uTime,uColorIce:{value:new b},uColorDeep:{value:new b},uColorSeam:{value:new b},uColorRim:{value:new b},uDepthTint:{value:1.3},uFresnel:{value:2},uFresnelPower:{value:2.3},uFacetSharp:{value:.62},uFracture:{value:.3},uFractureScale:{value:5},uVeins:{value:.28},uVeinScale:{value:2.6},uSeamGlow:{value:2.4},uSeamCount:{value:3.5},uSeamWidth:{value:.35},uSeamTwist:{value:.5},uGlint:{value:1.4},uGlintScale:{value:22},uGlintSpeed:{value:.6},uGlow:{value:1.4},uCharge:{value:0},uChargeGlow:{value:3}};return e.registerShadowCasterWithPatch(t,e=>{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
         attribute float aSeed;
         attribute float aBirth;
         varying vec3  vLanceLocal;
         varying vec3  vLanceWorld;
         varying float vLanceSeed;
         varying float vLanceBirth;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
         vLanceLocal = transformed;
         vLanceSeed  = aSeed;
         vLanceBirth = aBirth;
         #ifdef USE_INSTANCING
           vLanceWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
         #else
           vLanceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
         #endif`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
         uniform float uTime;
         uniform vec3  uColorIce;
         uniform vec3  uColorDeep;
         uniform vec3  uColorSeam;
         uniform vec3  uColorRim;
         uniform float uDepthTint;
         uniform float uFresnel;
         uniform float uFresnelPower;
         uniform float uFacetSharp;
         uniform float uFracture;
         uniform float uFractureScale;
         uniform float uVeins;
         uniform float uVeinScale;
         uniform float uSeamGlow;
         uniform float uSeamCount;
         uniform float uSeamWidth;
         uniform float uSeamTwist;
         uniform float uGlint;
         uniform float uGlintScale;
         uniform float uGlintSpeed;
         uniform float uGlow;
         uniform float uCharge;
         uniform float uChargeGlow;
         varying vec3  vLanceLocal;
         varying vec3  vLanceWorld;
         varying float vLanceSeed;
         varying float vLanceBirth;
         ${l}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           vec3  N   = normalize(normal);
           float ndv = clamp(dot(N, normalize(vViewPosition)), 0.0, 1.0);

           // A solid, unlike the rime plates: face a facet and you are looking
           // down the long axis of the body, so it deepens.
           float thick = clamp(ndv * uDepthTint, 0.0, 1.0);
           float fres = pow(1.0 - ndv, uFresnelPower) * uFresnel;

           // Fracture in world space so the lance and the fragments it breaks
           // into look quarried from one block.
           float cracks = smoothstep(0.58, 0.98, ridged(vLanceWorld * uFractureScale + vLanceSeed * 31.0, 4));
           float veins = smoothstep(0.45, 0.92,
                         fbm3(vLanceLocal * uVeinScale * 4.0 + vLanceSeed * 9.0) * 0.5 + 0.5);

           vec3 body = mix(uColorIce, uColorDeep, thick);
           body = mix(body, uColorRim, veins * uVeins * 0.5);
           body = mix(body, uColorRim, cracks * uFracture * 0.35);
           body *= mix(1.0, 0.55 + 0.9 * ndv, uFacetSharp);

           // The seam: the flute valleys, sampled on the bearing because that
           // is genuinely what they are — see the module header.
           float bearing = atan(vLanceLocal.z, vLanceLocal.x);
           float flute = abs(sin(bearing * uSeamCount + vLanceLocal.y * uSeamTwist * 6.2831853));
           float seam = pow(1.0 - clamp(flute, 0.0, 1.0), max(1.0, 1.0 / max(uSeamWidth, 0.02)));

           // While it assembles, a band of light runs from the tail to the tip
           // on the charge clock: the lance filling up, one shard at a time.
           float fill = smoothstep(uCharge + 0.18, uCharge - 0.05, vLanceLocal.y);
           float weld = smoothstep(0.16, 0.0, abs(vLanceLocal.y - uCharge)) * (1.0 - step(0.999, uCharge));

           float glint = snoise(vLanceWorld * uGlintScale +
                                vec3(0.0, uTime * uGlintSpeed, 0.0) + vLanceSeed * 13.0);
           glint = pow(clamp(glint, 0.0, 1.0), 13.0);

           vec3 glow = uColorSeam * seam * uSeamGlow * mix(0.35, 1.0, fill);
           glow += uColorRim * pow(1.0 - ndv, uFresnelPower) * uFresnel * 0.5;
           glow += uColorSeam * (weld + vLanceBirth) * uChargeGlow;
           glow += uColorRim * glint * uGlint;
           glow += uColorSeam * cracks * uFracture * 0.4;
           glow *= uGlow;

           // The same Reinhard ceiling the crystals use — every term here peaks
           // at a grazing angle and they stack.
           glow /= 1.0 + glow * 0.22;

           diffuseColor.rgb *= body;
           totalEmissiveRadiance += glow;
           diffuseColor.a = clamp(diffuseColor.a * (0.66 + 0.5 * fres) + seam * 0.1, 0.0, 1.0);
         }`)}),t.userData.uniforms=r,t.userData.sync=()=>{let e=h.shatterlance,n=h.global;r.uColorIce.value.copy(a(e.colorIce)),r.uColorDeep.value.copy(a(e.colorDeep)),r.uColorSeam.value.copy(a(e.colorSeam)),r.uColorRim.value.copy(a(e.colorRim)),r.uDepthTint.value=e.depthTint,r.uFresnel.value=e.fresnel*n.fresnel,r.uFresnelPower.value=e.fresnelPower,r.uFacetSharp.value=e.facetSharp,r.uFracture.value=e.fracture*n.shaderIntensity,r.uFractureScale.value=e.fractureScale*n.noiseFrequency,r.uVeins.value=e.veins*n.shaderIntensity,r.uVeinScale.value=e.veinScale*n.noiseFrequency,r.uSeamGlow.value=e.seamGlow,r.uSeamCount.value=Math.max(.5,e.seamCount),r.uSeamWidth.value=e.seamWidth,r.uSeamTwist.value=e.seamTwist,r.uGlint.value=e.glint*n.shaderIntensity,r.uGlintScale.value=e.glintScale,r.uGlintSpeed.value=e.glintSpeed*n.noiseSpeed,r.uGlow.value=e.glow*n.glow,r.uChargeGlow.value=e.chargeGlow,t.opacity=e.opacity*n.opacity,t.roughness=e.roughness,t.envMapIntensity=e.envIntensity},t.userData.sync(),t}var F=`
  attribute float aSeed;

  uniform vec3  uHub;          // world centre of the lance
  uniform vec3  uAxis;         // unit, down the lance
  uniform vec3  uSide;         // unit, across it
  uniform vec3  uUp;           // unit, uAxis x uSide
  uniform float uAssembly;     // 0..1 the wind-up clock
  uniform float uStagger;      // 0..1 of that clock spread over the shards
  uniform float uSphere;       // metres, the shell they start on
  uniform float uSpread;       // metres, that shell stretched along the axis
  uniform float uLanceHalf;    // metres, half the lance
  uniform float uLanceRadius;  // metres
  uniform float uSize;         // metres, one shard
  uniform float uSpin;         // radians/second of tumble
  uniform float uEase;         // >1 makes them accelerate in late
  uniform float uSeed;         // per-cast, so two casts do not draw the same intake
  uniform float uTime;

  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vShardT;

  float ihash(float p) {
    return fract(sin(p * 127.1) * 43758.5453);
  }

  void main() {
    float s0 = aSeed + uSeed;
    float h1 = ihash(s0 * 1.7);
    float h2 = ihash(s0 * 3.3 + 4.1);
    float h3 = ihash(s0 * 5.9 + 8.7);
    float h4 = ihash(s0 * 7.1 + 12.3);
    float h5 = ihash(s0 * 11.3 + 19.9);

    // Where it starts: a point on a shell about the hub, stretched along the
    // axis so the intake is a capsule rather than a ball — a ball puts as many
    // shards behind the caster as in front of him.
    float cosT = h1 * 2.0 - 1.0;
    float sinT = sqrt(max(0.0, 1.0 - cosT * cosT));
    float phi = h2 * 6.2831853;
    vec3 start = uHub
               + uSide * (sinT * cos(phi) * uSphere)
               + uUp   * (cosT * uSphere)
               + uAxis * (sinT * sin(phi) * uSpread);

    // Where it lands: a point on the lance's own surface.
    float along = (h3 * 2.0 - 1.0) * uLanceHalf;
    float bearing = h4 * 6.2831853;
    vec3 target = uHub
                + uAxis * along
                + (uSide * cos(bearing) + uUp * sin(bearing)) * (uLanceRadius * (0.45 + 0.55 * h5));

    // Closed form, so a paused wind-up re-flies under the slider.
    float t = clamp((uAssembly - h5 * uStagger) / max(1e-3, 1.0 - uStagger), 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, max(1.0, uEase));
    vec3 hub = mix(start, target, e);

    // It shrinks into the last few centimetres of its flight, so the merge
    // reads as absorption rather than as shards parked on the surface.
    float scale = uSize * (1.0 - smoothstep(0.62, 1.0, t));

    // Tumble about its own axis.
    vec3 spinAxis = normalize(vec3(h4 - 0.5, h1 - 0.5, h2 - 0.5) + vec3(1e-4, 1e-4, 1e-4));
    float ang = uTime * uSpin * (0.6 + h3) + h1 * 6.2831853;
    float ca = cos(ang);
    float sa = sin(ang);

    vec3 p = position * scale;
    vec3 rotated = p * ca + cross(spinAxis, p) * sa + spinAxis * dot(spinAxis, p) * (1.0 - ca);
    vec3 n = normal * ca + cross(spinAxis, normal) * sa + spinAxis * dot(spinAxis, normal) * (1.0 - ca);

    vec3 world = hub + rotated;

    vShardT = t;
    vNormalW = normalize(mat3(modelMatrix) * n);
    vViewDir = cameraPosition - world;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(world, 1.0);
  }
`,I=`
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorEdge;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uRim;
  uniform float uRimPower;
  uniform float uShade;
  uniform float uAmbient;
  uniform float uFade;

  uniform vec3  uLightDir;
  uniform float uGlobalGlow;

  varying vec3  vNormalW;
  varying vec3  vViewDir;
  varying float vShardT;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);

    // Two-sided: a shard is thin enough that its back face is on screen half
    // the time, and lighting it from behind makes the swarm flicker black.
    float lambert = max(dot(N, uLightDir), 0.0);
    if (dot(N, V) < 0.0) lambert = max(dot(-N, uLightDir), 0.0);
    float shade = mix(1.0, uAmbient + (1.0 - uAmbient) * lambert, uShade);

    float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), uRimPower);

    // A shard cools from the shell colour to the lance colour as it arrives, so
    // the swarm reads as feeding the thing it is turning into.
    vec3 color = mix(uColorA, uColorB, clamp(vShardT, 0.0, 1.0)) * shade;
    color += uColorEdge * fres * uRim * uGlow * uGlobalGlow;

    // Gone by the time it lands; the lance is what is left.
    float alpha = uOpacity * uFade * (1.0 - smoothstep(0.62, 1.0, vShardT));
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;function L(){let e=r({uHub:{value:new d},uAxis:{value:new d(0,0,1)},uSide:{value:new d(1,0,0)},uUp:{value:new d(0,1,0)},uAssembly:{value:0},uStagger:{value:.55},uSphere:{value:4.5},uSpread:{value:3.2},uLanceHalf:{value:2.1},uLanceRadius:{value:.42},uSize:{value:.22},uSpin:{value:6},uEase:{value:3},uSeed:{value:0},uFade:{value:1},uColorA:{value:new b},uColorB:{value:new b},uColorEdge:{value:new b},uOpacity:{value:.95},uGlow:{value:1.6},uRim:{value:1.2},uRimPower:{value:2.2},uShade:{value:1},uAmbient:{value:.35}}),n=new t({transparent:!0,depthWrite:!0,depthTest:!0,side:2,blending:1,toneMapped:!1,uniforms:e,vertexShader:F,fragmentShader:I});return n.userData.uniforms=e,n.userData.sync=()=>{let t=h.shatterlance,n=h.global;e.uColorA.value.copy(a(t.colorIntakeA)),e.uColorB.value.copy(a(t.colorIntakeB)),e.uColorEdge.value.copy(a(t.colorIntakeEdge)),e.uStagger.value=Math.min(.95,t.intakeStagger),e.uSphere.value=t.intakeSphere,e.uSpread.value=t.intakeSpread,e.uSize.value=t.intakeSize,e.uSpin.value=t.intakeSpin,e.uEase.value=Math.max(1,t.intakeEase),e.uOpacity.value=t.intakeOpacity*n.opacity,e.uGlow.value=t.intakeGlow*n.glow,e.uRim.value=t.intakeRim,e.uRimPower.value=t.intakeRimPower,e.uShade.value=t.intakeShade,e.uAmbient.value=t.intakeAmbient},n.userData.sync(),n}var R=Math.PI*2,z=256,B=256,V=2,H=12,U={},W=new d,G=new d,K=new d,q=new d;function J(e,t){let n=9.7+e*31.3,r=m(Math.round(t?.facets??7),4,20),i=m(t?.swell??.26,.05,.9),a=m(t?.tailWidth??.22,.02,1),o=Math.max(.2,t?.tipCurve??1.35),c=m(t?.flute??.28,0,.8),l=t?.fluteTwist??.5,d=m(t?.bodyJitter??.12,0,.8),f=r*2,h=[.03,i*.45,i,u(i,1,.35),u(i,1,.68),u(i,1,.88)],g=e=>(e<=i?a+(1-a)*(e/Math.max(i,.001))**.65:(1-(e-i)/Math.max(1-i,.001))**o)*.5,_=h.map((e,t)=>{let i=g(e),a=l*e*(R/r),o=[];for(let r=0;r<f;r++){let s=r/f*R+a,l=r%2==0?1:1-c,u=1+(p(n*7.3+t*13.1+r*3.7)-.5)*d*.6,m=Math.max(.002,i*l*u);o.push([Math.cos(s)*m,e,Math.sin(s)*m])}return o}),v=[0,0,0],b=[(p(n*17.3)-.5)*.04*d,1,(p(n*19.9)-.5)*.04*d],x=[],S=(e,t,n)=>{x.push(e[0],e[1],e[2],t[0],t[1],t[2],n[0],n[1],n[2])};for(let e=0;e<f;e++){let t=(e+1)%f;S(v,_[0][e],_[0][t]);for(let n=0;n<_.length-1;n++)S(_[n][e],_[n+1][e],_[n][t]),S(_[n][t],_[n+1][e],_[n+1][t]);S(_[_.length-1][e],b,_[_.length-1][t])}let C=new y;return C.setAttribute(`position`,new s(x,3)),C.computeVertexNormals(),C}function Y(e){let t=f({seed:11.3+e*23.9,sides:5,taper:.1,roughness:.55,bend:.3});return t.translate(0,-.5,0),t.scale(.8,1,.8),t}function X(){let t=f({seed:4.2,sides:5,taper:.16,roughness:.5,bend:.25});t.translate(0,-.5,0);let n=new e;n.setAttribute(`position`,t.getAttribute(`position`)),n.setAttribute(`normal`,t.getAttribute(`normal`));let r=new Float32Array(z);for(let e=0;e<z;e++)r[e]=.13+e*.6180339887;return n.setAttribute(`aSeed`,new i(r,1)),n.instanceCount=0,n}var Z=class extends D{constructor(e){super(`shatterlance`,e)}createShaders(){let e=this.ctx.environment;this.lanceMaterial=P(e),this.lanceUniforms=this.lanceMaterial.userData.uniforms,this.intakeMaterial=L(),this.intakeUniforms=this.intakeMaterial.userData.uniforms,this._shape={facets:7,swell:.26,tailWidth:.22,tipCurve:1.35,flute:.28,fluteTwist:.5,bodyJitter:.12},this._fillShape(),this.lance=new A(this.group,{geometry:J,material:this.lanceMaterial,shape:this._shape,variants:1,capacity:1,layer:c.WORLD,renderOrder:2,castShadow:!0,receiveShadow:!0}),this.intakeGeometry=X(),this.intake=new S(this.intakeGeometry,this.intakeMaterial),this.intake.frustumCulled=!1,this.intake.matrixAutoUpdate=!1,this.intake.layers.set(c.VFX),this.intake.renderOrder=7,this.group.add(this.intake),this.frags=new N(this.group,{geometry:Y,variants:V,capacity:B,renderOrder:6}),this.sheet=new k(this.group,{mode:O.PLATE,additive:!1,name:`Shatterlance:sheet`}),this._growth={layout:j.LINE,emerge:M.SCALE,origin:new d,direction:new d(0,0,1),side:new d(1,0,0),length:0,clusterRadius:0,heightJitter:0,radiusJitter:0,leanJitter:0,leanRamp:1,leanForward:1,leanOutward:0,tilt:0,crown:0,peak:1,rubble:0,riseTime:.02,riseOvershoot:0,birthScale:1},this._shatter={layout:j.LINE,origin:new d,direction:new d(0,0,1),side:new d(1,0,0),length:1,inherit:new d,inheritScale:1},this._ground={centre:new d},this._look={},this._seed=0,this._sheetTime=-1,this._broken=!1}createParticles(){let e=this.ctx.particles;this.motes=e.get(`shatterlance.motes`,{capacity:2400,shape:C.SOFT,additive:!0,swirl:!0,softFade:.4}),this.motes.uniforms.uDrag.value=2.2,this.motes.uniforms.uEndSize.value=.1,this.motes.uniforms.uSizeIn.value=.05,this.motes.uniforms.uFadeIn.value=.1,this.motes.uniforms.uFadeOut.value=.3,this.chips=e.get(`shatterlance.chips`,{capacity:2e3,shape:C.CHIP,additive:!1,lit:!0,softFade:.25}),this.chips.uniforms.uDrag.value=.28,this.chips.uniforms.uEndSize.value=.75,this.chips.uniforms.uFadeOut.value=.72,this.mist=e.get(`shatterlance.mist`,{capacity:2e3,shape:C.SMOKE,additive:!1,curl:!0,softFade:1.1}),this.mist.uniforms.uDrag.value=2,this.mist.uniforms.uEndSize.value=3,this.mist.uniforms.uSizeIn.value=.12,this.mist.uniforms.uFadeIn.value=.16,this.mist.uniforms.uFadeOut.value=.3,this.moteEmitter=new w,this.mistEmitter=new w}get instanceCount(){return this.lance.count+this.frags.count+this.intakeGeometry.instanceCount}get impactDuration(){return Math.max(.05,h.shatterlance.lifetime*h.global.lifetime)}get fadeDuration(){return Math.max(.05,h.shatterlance.fadeTime)}lightShimmer(){let e=h.shatterlance,t=1-_(this.assembly);return 1-e.lightPulse*t*(.5-.5*Math.cos(this.age*e.lightPulseSpeed*R))}get assembly(){return _(this.age/Math.max(.01,h.shatterlance.assembly))}advance(e){let t=this.config,n=Math.max(0,t.assembly);if(this.age<n)return!1;let r=t.speed*h.global.speed,i=this.age-n;this.front+=r*v.outQuad(_(i/.04))*e;let a=this.u;return this.u=_(this.front/this.length),this.pointAt(this.u,this.position),this.u>=1&&a<1}_fillShape(){let e=h.shatterlance,t=this._shape;return t.facets=e.facets,t.swell=e.swell,t.tailWidth=e.tailWidth,t.tipCurve=e.tipCurve,t.flute=e.flute,t.fluteTwist=e.fluteTwist,t.bodyJitter=e.bodyJitter,t}_tipDistance(){let e=h.shatterlance;return u(e.hoverForward,this.length,this.u)}_lanceHeight(){let e=h.shatterlance;return e.lanceHeight+Math.sin(this.age*e.hoverBobSpeed*R)*e.hoverBob*(1-this.u)}_lanceHub(e){let t=h.shatterlance,n=this._lengthForm();return e.copy(this.origin).addScaledVector(this.direction,this._tipDistance()-t.lanceLength*n*.5),e.y=this._lanceHeight(),e}_lengthForm(){let e=h.shatterlance;return u(e.formSeed,1,this.assembly**+Math.max(.05,e.formLengthCurve))}_radiusForm(){let e=h.shatterlance;return u(e.formSeed,1,this.assembly**+Math.max(.05,e.formRadiusCurve))}_fillGrowth(){let e=h.shatterlance,t=h.global,n=this._growth,r=this._lengthForm();return n.origin.copy(this.origin),n.direction.copy(this.direction),n.side.copy(this.side),n.length=this._tipDistance()-e.lanceLength*r,n.heightNear=e.lanceLength*r,n.height=e.lanceLength*r,n.radiusNear=e.lanceRadius*this._radiusForm(),n.radius2=e.lanceRadius*this._radiusForm(),n.baseHeight=this._lanceHeight(),n.lean=e.lanceLean,n.twist=e.lanceRoll,n.birthFade=Math.max(.05,e.assembly*.12),n.randomness=t.randomness,n}_fillGround(e,t,n){let r=h.shatterlance,i=h.global,a=this._ground;return this.pointAt(1,a.centre),a.yaw=Math.atan2(this.direction.x,this.direction.z),a.height=r.sheetHeight,a.radius=r.sheetRadius,a.seed=this._seed,a.grow=e,a.recede=t,a.fade=n,a.edge=r.sheetEdge,a.ragged=r.sheetRagged,a.raggedScale=r.sheetRaggedScale,a.warp=r.sheetWarp,a.relief=r.sheetRelief,a.normalStep=r.sheetNormalStep,a.ambient=r.sheetAmbient,a.wrap=r.sheetWrap,a.specular=r.sheetSpecular,a.gloss=r.sheetGloss,a.parallax=r.sheetParallax,a.cell=r.sheetCell,a.cellJitter=r.sheetCellJitter,a.seam=r.sheetSeam,a.thickness=r.sheetThickness,a.lift=r.sheetLift,a.detail=r.sheetDetail,a.windAngle=0,a.additive=!1,a.emissive=r.sheetEmissive,a.opacity=r.sheetOpacity,a.depthFade=r.sheetDepthFade,a.colorBase=r.colorSheetBase,a.colorEdge=r.colorSheetEdge,a.colorGlow=r.colorSheetGlow,a.colorDeep=r.colorSheetDeep,a.noiseStrength=i.noiseStrength,a.noiseFrequency=i.noiseFrequency,a.noiseSpeed=i.noiseSpeed,a.opacityScale=i.opacity,a}_fillShatter(){let e=h.shatterlance,t=h.global,n=this._shatter;return n.origin.copy(this.origin),n.direction.copy(this.direction),n.side.copy(this.side),n.length=this.length,n.width=e.lanceRadius*2,n.inherit.copy(this.direction).multiplyScalar(e.speed*t.speed*e.fragInherit),n.spawnRadius=e.fragSpawnRadius,n.spawnHeight=e.fragSpawnHeight,n.speed=e.fragSpeed,n.speedJitter=e.fragSpeedJitter,n.spread=e.fragSpread,n.upBias=e.fragUpBias,n.gravity=e.fragGravity,n.drag=e.fragDrag,n.size=e.fragSize,n.sizeJitter=e.fragSizeJitter,n.shrink=e.fragShrink,n.shrinkPower=e.fragShrinkPower,n.spin=e.fragSpin,n.spinJitter=e.fragSpinJitter,n.lifetime=e.fragLifetime,n.floor=e.fragFloor,n.floorSpin=e.fragFloorSpin,n.randomness=t.randomness,n}_fillLook(){let e=h.shatterlance,t=h.global,n=this._look;return n.colorA=a(e.colorFragA),n.colorB=a(e.colorFragB),n.colorEdge=a(e.colorFragEdge),n.opacity=e.fragOpacity*t.opacity,n.glow=e.fragGlow*t.glow,n.rim=e.fragRim,n.rimPower=e.fragRimPower,n.shade=e.fragShade,n.ambient=e.fragAmbient,n.fadeStart=e.fragFadeStart,n.soft=e.fragSoft,n}_sheetGrowth(){return this._sheetTime<0?0:_((this.age-this._sheetTime)/Math.max(.02,h.shatterlance.sheetGrow))}_sheetRecede(){let e=h.shatterlance;if(this.phase!==E.FADE)return 0;let t=_(this.fadeTime/Math.max(.05,e.fadeTime)),n=Math.min(.98,e.sheetHold);return _((t-n)/(1-n))}onSpawn(){this.moteEmitter.reset(),this.mistEmitter.reset(),this._sheetTime=-1,this._broken=!1,this._seed=Math.random()*100,this.frags.clear(),this.lance.clear(),this.lance.plant(1,1),this.lance.triggerIndex(0,0,0),this._syncUniforms(),this._syncFields()}_syncUniforms(){let e=h.shatterlance,t=h.global;this.lanceMaterial.userData.sync(),this.lanceUniforms.uCharge.value=this.assembly,this.intakeMaterial.userData.sync();let n=this.intakeUniforms;this._lanceHub(K),n.uHub.value.copy(K),n.uAxis.value.copy(this.direction),n.uSide.value.copy(this.side),n.uUp.value.crossVectors(this.direction,this.side).normalize(),n.uAssembly.value=this.assembly,n.uLanceHalf.value=e.lanceLength*this._lengthForm()*.5,n.uLanceRadius.value=e.lanceRadius*this._radiusForm(),n.uSeed.value=this._seed,n.uFade.value=1-_((this.assembly-.92)/.08),this.intakeGeometry.instanceCount=Math.min(z,Math.max(0,Math.round(e.intakeCount))),this.frags.sync(this._fillLook()),this.motes.setGradient(a(e.colorMoteA),a(e.colorMoteB),a(e.colorMoteC),a(e.colorMoteD)),this.motes.uniforms.uGravity.value.set(0,e.moteRise,0),this.motes.uniforms.uSizeScale.value=e.moteSize*t.particleSize*7,this.motes.uniforms.uLifeScale.value=e.moteLifetime*.5*t.particleLifetime,this.motes.uniforms.uSpeedScale.value=t.particleSpeed,this.motes.uniforms.uOpacity.value=t.opacity,this.motes.uniforms.uGlow.value=.95*t.glow,this.motes.uniforms.uTurbulence.value=e.moteTurbulence*t.turbulence,this.motes.uniforms.uSwirl.value=e.moteSwirl,this.motes.uniforms.uSwirlExpand.value=-Math.min(.99,e.moteConverge),this.chips.setGradient(a(e.colorChipA),a(e.colorChipB),a(e.colorChipC),a(e.colorChipD)),this.chips.uniforms.uGravity.value.set(0,e.chipGravity,0),this.chips.uniforms.uSizeScale.value=e.chipSize*t.particleSize*7,this.chips.uniforms.uLifeScale.value=e.chipLifetime*.5*t.particleLifetime,this.chips.uniforms.uSpeedScale.value=t.particleSpeed,this.chips.uniforms.uOpacity.value=t.opacity,this.mist.setGradient(a(e.colorMistA),a(e.colorMistB),a(e.colorMistC),a(e.colorMistD)),this.mist.uniforms.uGravity.value.set(0,e.mistRise,0),this.mist.uniforms.uSizeScale.value=e.mistSize*t.particleSize,this.mist.uniforms.uLifeScale.value=e.mistLifetime*.5*t.particleLifetime,this.mist.uniforms.uSpeedScale.value=e.mistSpeed*t.particleSpeed,this.mist.uniforms.uOpacity.value=e.mistOpacity*t.opacity,this.mist.uniforms.uTurbulence.value=.4*t.turbulence}_syncFields(){this.lance.syncGeometry(this._fillShape()),this.lance.update(this.age,this._fillGrowth(),0),this.frags.update(this.age,this._fillShatter()),this.sheet.update(this._fillGround(this._sheetGrowth(),this._sheetRecede(),_(this._sheetGrowth()*4)))}_chargeFx(e){let t=h.shatterlance,r=h.global,i=Math.round(this.moteEmitter.tick(e,t.moteRate)*r.particleCount);i>0&&(this._lanceHub(W),U.position=W,U.radius=t.moteShell,U.anchor=W,U.direction=G.set(0,1,0),U.speed=0,U.speedVariance=0,U.spread=1,U.inherit=null,U.size=.07,U.sizeVariance=.6,U.life=t.moteLifetime,U.lifeVariance=.35,U.spin=0,U.tint=null,U.time=n.uTime.value,this.motes.emit(i,U)),this.ctx.shake.rumble(t.chargeShake*this.assembly*r.cameraShake,e)}_sheetFx(e,t){let r=h.shatterlance,i=h.global,a=Math.round(this.mistEmitter.tick(e,r.mistRate*t)*i.particleCount);if(a<=0)return;let o=r.sheetRadius*this._sheetGrowth();this.pointAt(1,W),W.y=.15,U.position=W,U.radius=Math.max(.1,o),U.anchor=null,U.direction=G.set(0,1,0),U.speed=r.mistSpeed,U.speedVariance=.7,U.spread=1,U.inherit=null,U.size=1,U.sizeVariance=.5,U.life=r.mistLifetime,U.lifeVariance=.4,U.spin=.4,U.tint=null,U.time=n.uTime.value,this.mist.emit(a,U)}_breakFx(){let e=h.shatterlance,t=h.global,n=Math.min(B,Math.round(e.fragmentCount*t.particleCount)),r=Math.max(1,Math.round(n/H)),i=_(e.lanceLength/Math.max(.5,this.length));for(let e=0;e<H;e++){let t=1-i*(1-(e+.5)/H);this.frags.burst(this.age,r,t,g(-.9,.9))}}onTravel(e){let t=h.shatterlance;if(this._syncUniforms(),this._syncFields(),this.age<t.assembly){this._lanceHub(this.position),this._chargeFx(e);return}this._lanceHub(this.position),this.ctx.shake.rumble(t.rumble*h.global.cameraShake,e)}onImpact(){let e=h.shatterlance,t=h.global,r=n.uTime.value;this._broken=!0,this._sheetTime=this.age,this._breakFx(),this.lance.clear(),this.pointAt(1,q),W.copy(q),W.y=e.fragSpawnHeight,this.ctx.bursts.spawn(x.FROST,W,{radius:e.burstSize*.2,endRadius:e.burstSize*t.explosionIntensity,life:.8,intensity:e.burstIntensity,opacity:.9,fresnel:1.5,displace:.6,squash:.8,colorA:a(e.colorBurstA),colorB:a(e.colorBurstB),colorC:a(e.colorBurstC)}),this.ctx.decals.spawn(T.SHOCKWAVE,q,{radius:e.shockRadius*t.explosionIntensity,life:.75,width:.045,intensity:1,colorA:a(e.colorShockA),colorB:a(e.colorShockB)}),U.position=W,U.radius=e.lanceRadius*2,U.anchor=null,U.direction=G.copy(this.direction).multiplyScalar(.55).setY(.7).normalize(),U.speed=e.chipSpeed,U.speedVariance=.85,U.spread=.95,U.inherit=null,U.size=.12,U.sizeVariance=.8,U.life=e.chipLifetime,U.lifeVariance=.5,U.spin=11,U.tint=null,U.time=r,this.chips.emit(Math.round(e.chipCount*t.particleCount),U),U.speed=e.mistSpeed*3,U.spread=1,U.size=1.5,U.life=e.mistLifetime*1.2,U.spin=.5,this.mist.emit(Math.round(60*t.particleCount),U),this.ctx.shake.add(e.breakShake*t.explosionIntensity*t.cameraShake,1/Math.max(.1,e.shakeDuration),26),this.ctx.flash.trigger(a(e.colorFlash),e.breakFlash*t.explosionIntensity),this.lightBoost=e.lightIntensity*1.6*t.explosionIntensity}onFade(e,t){this._syncUniforms(),this._syncFields(),this.pointAt(1,this.position),this.position.y=h.shatterlance.fragSpawnHeight*.6,this._sheetFx(e,t<=1?1:1-_((t-1)*.8))}onDestroy(){this.lance.clear(),this.frags.clear(),this.intakeGeometry.instanceCount=0,this._sheetTime=-1,this._broken=!1,this.sheet.update(this._fillGround(0,0,0))}dispose(){this.lance.dispose(),this.frags.dispose(),this.sheet.dispose(),this.intakeGeometry.dispose(),this.intakeMaterial.dispose(),this.lanceMaterial.dispose(),super.dispose()}};export{Z as ShatterlanceAbility};
//# sourceMappingURL=ShatterlanceAbility-D358uP46.js.map