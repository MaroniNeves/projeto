import{$t as e,Fn as t,G as n,Gr as r,Qt as i,R as a,Tn as o,V as s,Y as c,di as l,o as u,st as d,tt as f,ui as p,xt as m,yn as h}from"./settings-DdywqLlV.js";import{t as g}from"./ParticleSystem-BZTczMT8.js";import{n as _}from"./ParticleEngine-DLxipNH0.js";import{t as v}from"./Ability-CYesB5Ur.js";function y(n,a=5,o=14){let s=new t(1,1,a,o),c=new e;c.index=s.index,c.setAttribute(`position`,s.getAttribute(`position`)),c.setAttribute(`normal`,s.getAttribute(`normal`)),c.setAttribute(`uv`,s.getAttribute(`uv`));let u=new Float32Array(n*4);return c.setAttribute(`aSeed`,new i(u,4)),c.instanceCount=0,c.boundingSphere=new r(new l,1),c}function b(e){let t=new o({color:16777215,roughness:.74,metalness:0,flatShading:!0,transparent:!0,side:2,depthWrite:!0}),r={uAge:{value:0},uFade:{value:1},uLightDir:n.uLightDir,uOrigin:{value:new l},uRadius:{value:5},uCeiling:{value:4.6},uCeilingVary:{value:.4},uStagger:{value:1.9},uFloor:{value:.012},uWind:{value:new p},uSize:{value:.26},uSizeVary:{value:.45},uVaneWidth:{value:.19},uWidthBias:{value:.85},uTaper:{value:.65},uLeadFrac:{value:.62},uQuill:{value:.16},uCup:{value:.55},uArch:{value:.1},uBarb:{value:.06},uBarbFreq:{value:22},uPivot:{value:.42},uSink:{value:1.05},uLift:{value:.6},uSwing:{value:.95},uFlutterRate:{value:4.2},uFlutterVary:{value:.55},uPitch:{value:.95},uSpin:{value:.35},uTumbleShare:{value:.28},uTumbleRate:{value:7.5},uTumbleDrift:{value:.55},uTumbleSink:{value:1.15},uTumbleBob:{value:.06},uCatchGain:{value:.55},uCatchWidth:{value:.55},uCatchWindow:{value:3.2},uBirthFade:{value:.35},uSettleTime:{value:.9},uColorQuill:{value:new m},uColorVane:{value:new m},uColorTip:{value:new m},uColorGlow:{value:new m},uRachis:{value:.55},uBarbLines:{value:.35},uBarbCount:{value:26},uGrain:{value:.18},uGrainScale:{value:6},uFresnel:{value:.7},uFresnelPower:{value:2.4},uTranslucency:{value:1.6},uTranslucencyPower:{value:3.2},uGlow:{value:.8},uOpacity:{value:1}};return e.registerShadowCasterWithPatch(t,e=>{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
         attribute vec4 aSeed;     // four unitless dice, per feather
         uniform float uAge;
         uniform float uFade;
         uniform vec3  uOrigin;
         uniform float uRadius;
         uniform float uCeiling;
         uniform float uCeilingVary;
         uniform float uStagger;
         uniform float uFloor;
         uniform vec2  uWind;
         uniform float uSize;
         uniform float uSizeVary;
         uniform float uVaneWidth;
         uniform float uWidthBias;
         uniform float uTaper;
         uniform float uLeadFrac;
         uniform float uQuill;
         uniform float uCup;
         uniform float uArch;
         uniform float uBarb;
         uniform float uBarbFreq;
         uniform float uPivot;
         uniform float uSink;
         uniform float uLift;
         uniform float uSwing;
         uniform float uFlutterRate;
         uniform float uFlutterVary;
         uniform float uPitch;
         uniform float uSpin;
         uniform float uTumbleShare;
         uniform float uTumbleRate;
         uniform float uTumbleDrift;
         uniform float uTumbleSink;
         uniform float uTumbleBob;
         uniform float uCatchGain;
         uniform float uCatchWidth;
         uniform float uCatchWindow;
         uniform float uBirthFade;
         uniform float uSettleTime;
         varying float vAlong;
         varying float vAcross;
         varying float vDice;
         varying float vRest;
         varying float vAlpha;
         varying vec3  vFeatherWorld;

         /* Decorrelated randoms out of the four dice. Deliberately not a noise
          * function: this is called six times per vertex and every one of them
          * wants a different, stable, unitless number rather than a field. */
         float featherRand(vec2 p) {
           return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
         }`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
         {
           /* No turn constant is declared here, and that is not an oversight.
            *
            * This is a patched MeshStandardMaterial, so three's
            * <common> chunk is already above us and it does
            *
            *     #define PI2 6.283185307179586
            *
            * A local "const float PI2 = ..." is therefore not a shadowed
            * declaration, it is a macro expansion: the preprocessor rewrites it
            * to "const float 6.283185307179586 = 6.28318530718;" and the whole
            * vertex shader fails to compile with a syntax error pointing at a
            * number that appears nowhere in this file. The feathers then do not
            * draw at all — and nothing catches it, because npm run check
            * compiles no GLSL and the reserved-word sweep only looks for GLSL ES
            * 3.00 keywords, not for three's own macros. It took a live GL
            * context to find.
            *
            * PI2 below is three's, same quantity, more digits. The names to
            * avoid in any patched standard material are PI, PI2, PI_HALF,
            * RECIPROCAL_PI, RECIPROCAL_PI2, EPSILON and LOG2 — see
            * three/src/renderers/shaders/ShaderChunk/common.glsl.js. */

           float r1 = aSeed.x;
           float r2 = aSeed.y;
           float r3 = aSeed.z;
           float r4 = aSeed.w;
           float r5 = featherRand(aSeed.xy);
           float r6 = featherRand(aSeed.yz + 3.71);
           float r7 = featherRand(aSeed.zw + 11.37);
           float r8 = featherRand(aSeed.xw + 5.13);

           /* ---- where and when this one was let go ---- */
           // sqrt on the radial roll, or the flock crowds the middle of the
           // circle: uniform in r gives uniform in *radius*, not in area.
           float bearing = PI2 * r1;
           float radius = uRadius * sqrt(r2);
           vec3 base = uOrigin + vec3(cos(bearing) * radius, 0.0, sin(bearing) * radius);

           float y0 = uCeiling * (1.0 - uCeilingVary * r3);
           float release = uStagger * r4;
           float tau = max(0.0, uAge - release);

           /* ---- which regime ---- */
           // Not a blend of two motions: a per-feather choice between them.
           float mode = step(r5, uTumbleShare);   // 1 = tumbling, 0 = fluttering

           /* ---- the landing time, from the mean sink rate of that regime ---- */
           float meanFlutter = max(0.02, uSink * (1.0 - 0.5 * uLift));
           float meanSink = mix(meanFlutter, max(0.02, uTumbleSink), mode);
           float land = max(0.05, (y0 - uFloor) / meanSink);
           float te = min(tau, land);

           /* ---- FLUTTER: stall, sideslip, glide ---- */
           float omega = max(0.15, uFlutterRate * (1.0 - 0.5 * uFlutterVary + uFlutterVary * r6));
           float phi0 = PI2 * r7;
           float phi = omega * te + phi0;
           float slipF = (uSwing / omega) * (sin(phi) - sin(phi0));
           float dropF = uSink * (1.0 - 0.5 * uLift) * te
                       - uSink * uLift * (sin(2.0 * phi) - sin(2.0 * phi0)) / (4.0 * omega);
           // The plate's attitude tracks its horizontal velocity, so it flips
           // sign at every stall. That flip is the whole silhouette of a
           // falling leaf and it costs one cosine.
           float angleF = uPitch * cos(phi);

           /* ---- TUMBLE: end over end, and it drifts ---- */
           float spinDir = r6 < 0.5 ? -1.0 : 1.0;
           float rate = uTumbleRate * (0.7 + 0.6 * r7) * spinDir;
           float slipT = uTumbleDrift * spinDir * te;
           float dropT = uTumbleSink * te + uTumbleBob * (sin(rate * te + phi0) - sin(phi0));
           float angleT = rate * te;

           float slip = mix(slipF, slipT, mode);
           float drop = mix(dropF, dropT, mode);
           float angle = mix(angleF, angleT, mode);

           /* ---- the catch: one gust, at its own moment, for each feather ---- */
           // A Gaussian bump subtracted from the drop, so the feather rises,
           // hangs, and resumes. Doing it as a bump on *position* rather than
           // on velocity is what keeps the landing time honest — the integral
           // of the bump over the whole descent is finite and small.
           float when = uCatchWindow * r8;
           float gust = exp(-pow((te - when) / max(0.05, uCatchWidth), 2.0));
           drop -= uCatchGain * gust * (0.35 + 0.65 * r5);

           /* ---- settle: the last second before it is down ---- */
           float rest = smoothstep(land - max(0.02, uSettleTime), land, tau);
           // Snap toward the nearest face-up-or-face-down attitude rather than
           // toward zero: a tumbler that unwinds three revolutions on the way
           // to the floor reads as rewinding, which is the one thing a feather
           // never does.
           float lying = floor(angle / PI + 0.5) * PI;
           angle = mix(angle, lying, rest);

           /* ---- assemble ---- */
           vec3 heading = vec3(cos(bearing), 0.0, sin(bearing));
           vec3 pos = base
                    + heading * slip
                    + vec3(uWind.x, 0.0, uWind.y) * te
                    + vec3(0.0, max(uFloor, y0 - drop), 0.0);

           // The feather's own frame: long axis, face normal, and the vane
           // across. Rotating the pair about the horizontal perpendicular by
           // angle is exactly "pitch"; at angle 0 the feather lies flat.
           float ca = cos(angle);
           float sa = sin(angle);
           vec3 axis = heading * ca + vec3(0.0, sa, 0.0);
           vec3 face = heading * -sa + vec3(0.0, ca, 0.0);
           vec3 vane = normalize(cross(face, axis));

           // A slow roll about the rachis, frozen with everything else once it
           // is down. Small: a feather that spins like a propeller is a seed.
           float roll = uSpin * te * (r8 * 2.0 - 1.0) * (1.0 - rest);
           float cr = cos(roll);
           float sr = sin(roll);
           vec3 faceR = face * cr + vane * sr;
           vec3 vaneR = vane * cr - face * sr;

           /* ---- the outline, from uv and nothing else ---- */
           float along = uv.y;
           float across = uv.x * 2.0 - 1.0;

           float bare = smoothstep(uQuill, uQuill + 0.09, along);
           float prof = pow(max(sin(PI * pow(clamp(along, 0.0, 1.0), uWidthBias)), 0.0), uTaper);
           // The barb ripple runs *diagonally*: the phase is swept by across
           // as well as along, because barbs leave the rachis swept back. A
           // ripple in along alone gives a scalloped edge on both vanes at
           // the same height, which reads as a serrated leaf.
           float ripple = 1.0 + uBarb * sin(along * uBarbFreq * PI2 + across * 2.7);
           float halfW = uVaneWidth * prof * bare * ripple;
           float wide = across < 0.0 ? uLeadFrac : 1.0;

           float lx = across * halfW * wide;
           float ly = along - uPivot;
           // The cup curls the outer edge of each vane toward the underside;
           // the arch bows the whole feather along its length. Two marks, and
           // the cup is the one that makes it catch air.
           float lz = -uCup * halfW * across * across + uArch * (along - uPivot) * (along - uPivot);

           float span = uSize * (1.0 + uSizeVary * (r3 - 0.5));

           // Authored in world space. The mesh and its group are both held at
           // identity by the ability, so object space *is* world space here —
           // the same contract the bolt ribbon works under, and the reason
           // uOrigin can be a world point rather than a local one.
           transformed = pos + (vaneR * lx + axis * ly + faceR * lz) * span;

           /* ---- what the fragment stage needs ---- */
           vAlong = along;
           vAcross = across;
           vDice = r5;
           vRest = rest;
           vAlpha = uFade * smoothstep(0.0, max(0.02, uBirthFade), tau);
           vFeatherWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
         }`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
         uniform vec3  uLightDir;
         uniform vec3  uColorQuill;
         uniform vec3  uColorVane;
         uniform vec3  uColorTip;
         uniform vec3  uColorGlow;
         uniform float uRachis;
         uniform float uBarbLines;
         uniform float uBarbCount;
         uniform float uGrain;
         uniform float uGrainScale;
         uniform float uFresnel;
         uniform float uFresnelPower;
         uniform float uTranslucency;
         uniform float uTranslucencyPower;
         uniform float uGlow;
         uniform float uOpacity;
         varying float vAlong;
         varying float vAcross;
         varying float vDice;
         varying float vRest;
         varying float vAlpha;
         varying vec3  vFeatherWorld;
         ${c}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           vec3  N = normalize(normal);
           vec3  V = normalize(vViewPosition);
           float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uFresnelPower);
           float side = abs(vAcross);

           vec3 body = mix(uColorQuill, uColorVane, smoothstep(0.05, 0.45, vAlong));
           body = mix(body, uColorTip, smoothstep(0.5, 1.0, vAlong));

           // The rachis, and the barbs leaving it. The barb phase is swept by
           // vAlong for the same reason the outline ripple is: barbs are not
           // perpendicular to the shaft, they rake back toward the tip, and a
           // comb of parallel lines is the tell that it was drawn rather than
           // grown.
           float shaft = pow(1.0 - side, 9.0);
           float comb = cos(side * uBarbCount * PI - vAlong * 5.5);
           float barbs = smoothstep(0.55, 1.0, abs(comb)) * (1.0 - side * 0.6);
           body *= 1.0 - uBarbLines * barbs * 0.5;
           body = mix(body, uColorQuill, clamp(shaft * uRachis, 0.0, 1.0));

           // Grain in world space, so a flock does not read as one feather
           // stamped two hundred times.
           body *= 1.0 + uGrain * (fbm3(vFeatherWorld * uGrainScale + vDice * 17.0) - 0.5);

           diffuseColor.rgb *= body;

           // A feather is one cell thick at the edge and the read of a flock
           // against a low sun is almost entirely the light coming through it.
           float through = pow(clamp(dot(V, -uLightDir), 0.0, 1.0), uTranslucencyPower);
           vec3 glow = uColorGlow * through * uTranslucency * (0.3 + 0.7 * vAlong);
           glow += uColorTip * rim * uFresnel;
           glow *= uGlow;
           // Soft ceiling: both terms above peak at a grazing angle and they
           // stack, and a flock on the silhouette otherwise sums past white and
           // smears the bloom pass across the whole zone.
           glow /= 1.0 + glow * 0.35;
           totalEmissiveRadiance += glow;

           // The outer barbs separate rather than ending in a clean curve, and
           // the ones that have landed press flat and lose a little of it.
           float split = smoothstep(0.72, 1.0, side) * (0.35 + 0.65 * abs(comb));
           float alpha = vAlpha * uOpacity * (1.0 - split * 0.55 * (1.0 - vRest * 0.5));
           diffuseColor.a = clamp(diffuseColor.a * alpha, 0.0, 1.0);
         }`)}),t.userData.uniforms=r,t.userData.sync=(e,t,n)=>{let i=u.featherfall,o=u.global;r.uAge.value=t,r.uFade.value=n,r.uOrigin.value.copy(e),r.uRadius.value=i.zoneRadius,r.uCeiling.value=i.ceiling,r.uCeilingVary.value=i.ceilingVary,r.uStagger.value=i.stagger,r.uFloor.value=i.floorHeight,r.uWind.value.set(i.windX,i.windZ),r.uSize.value=i.featherSize,r.uSizeVary.value=i.featherSizeVary,r.uVaneWidth.value=i.vaneWidth,r.uWidthBias.value=i.widthBias,r.uTaper.value=i.taper,r.uLeadFrac.value=i.leadFrac,r.uQuill.value=i.quill,r.uCup.value=i.cup,r.uArch.value=i.arch,r.uBarb.value=i.barb,r.uBarbFreq.value=i.barbFreq,r.uPivot.value=i.pivot,r.uSink.value=i.sink*o.speed,r.uLift.value=i.lift,r.uSwing.value=i.swing*o.speed,r.uFlutterRate.value=i.flutterRate,r.uFlutterVary.value=i.flutterVary,r.uPitch.value=i.pitch,r.uSpin.value=i.spin,r.uTumbleShare.value=i.tumbleShare,r.uTumbleRate.value=i.tumbleRate,r.uTumbleDrift.value=i.tumbleDrift*o.speed,r.uTumbleSink.value=i.tumbleSink*o.speed,r.uTumbleBob.value=i.tumbleBob,r.uCatchGain.value=i.catchGain,r.uCatchWidth.value=i.catchWidth,r.uCatchWindow.value=i.catchWindow,r.uBirthFade.value=i.birthFade,r.uSettleTime.value=i.settleTime,r.uColorQuill.value.copy(a(i.colorQuill)),r.uColorVane.value.copy(a(i.colorVane)),r.uColorTip.value.copy(a(i.colorTip)),r.uColorGlow.value.copy(a(i.colorGlow)),r.uRachis.value=i.rachis,r.uBarbLines.value=i.barbLines,r.uBarbCount.value=i.barbCount,r.uGrain.value=i.grain,r.uGrainScale.value=i.grainScale*o.noiseFrequency,r.uFresnel.value=i.fresnel,r.uFresnelPower.value=i.fresnelPower,r.uTranslucency.value=i.translucency,r.uTranslucencyPower.value=i.translucencyPower,r.uGlow.value=i.glow*o.glow,r.uOpacity.value=i.opacity*o.opacity},t}var x=256,S=Math.PI*2,C=new l,w=new l,T=new l,E={},D=class extends v{constructor(e){super(`featherfall`,e)}createShaders(){this.geometry=y(x),this.material=b(this.ctx.environment),this.mesh=new h(this.geometry,this.material),this.mesh.matrixAutoUpdate=!1,this.mesh.frustumCulled=!1,this.mesh.layers.set(s.WORLD),this.mesh.renderOrder=4,this.mesh.receiveShadow=!0,this.mesh.castShadow=!1,this.group.add(this.mesh),this._seeds=this.geometry.getAttribute(`aSeed`),this._live=0}createParticles(){this.down=this.ctx.particles.get(`featherfall.down`,{capacity:900,shape:g.SOFT,additive:!1,curl:!0,softFade:.5}),this.down.uniforms.uDrag.value=2.6,this.down.uniforms.uEndSize.value=1.1,this.down.uniforms.uSizeIn.value=.12,this.down.uniforms.uFadeIn.value=.2,this.down.uniforms.uFadeOut.value=.55,this.downEmitter=new _}get impactDuration(){return Math.max(.1,u.featherfall.lifetime*u.global.lifetime)}get fadeDuration(){return Math.max(.1,u.featherfall.fadeTime)}get instanceCount(){return this._live}lightShimmer(){return .92+.08*Math.sin(this.age*1.7)}_centrePoint(e){return this.pointAt(1,e).setY(0)}get _fallAge(){return this.age}onSpawn(){this.downEmitter.reset();let e=Math.max(1,Math.min(x,Math.round(u.featherfall.count)));this._live=e;let t=this._seeds.array;for(let n=0;n<e*4;n++)t[n]=Math.random();this._seeds.needsUpdate=!0,this.geometry.instanceCount=e,this._sync(1)}_sync(e){let t=u.featherfall,n=u.global;this._centrePoint(C),this.material.userData.sync(C,this._fallAge,e);let r=Math.max(1,Math.min(this._live,Math.round(t.count)));this.geometry.instanceCount=r,this.down.setGradient(a(t.colorDownA),a(t.colorDownB),a(t.colorDownC),a(t.colorDownD)),this.down.uniforms.uGravity.value.set(0,t.downRise,0),this.down.uniforms.uSizeScale.value=t.downSize*n.particleSize*7,this.down.uniforms.uLifeScale.value=t.downLifetime*.5*n.particleLifetime,this.down.uniforms.uSpeedScale.value=n.particleSpeed,this.down.uniforms.uOpacity.value=t.opacity*n.opacity,this.down.uniforms.uTurbulence.value=t.downTurbulence*n.turbulence}_downFx(e,t){let r=u.featherfall,i=u.global,a=Math.round(this.downEmitter.tick(e,r.downRate*t)*i.particleCount);if(a<=0)return;this._centrePoint(C);let o=Math.random()*S,s=r.zoneRadius*Math.sqrt(Math.random());w.set(C.x+Math.cos(o)*s,r.floorHeight+Math.random()*r.ceiling,C.z+Math.sin(o)*s),E.position=w,E.radius=r.featherSize,E.direction=T.set(0,-1,0),E.speed=r.downSpeed,E.speedVariance=.9,E.spread=1,E.inherit=null,E.anchor=null,E.size=.06,E.sizeVariance=.7,E.life=r.downLifetime,E.lifeVariance=.6,E.spin=0,E.tint=null,E.time=n.uTime.value,this.down.emit(a,E)}onTravel(e){this._sync(1),this._lightPoint(),this._downFx(e,1)}onImpact(){}onFade(e,t){let n=t<=1?1:1-f.inQuad(d(t-1));this._sync(n),this._lightPoint(),this._downFx(e,n*(t<=1?.8:.2))}_lightPoint(){let e=u.featherfall;this._centrePoint(this.position),this.position.y=e.ceiling*.45}onDestroy(){this._live=0,this.geometry.instanceCount=0,this.material.userData.uniforms.uFade.value=0}dispose(){this.geometry.dispose(),this.material.dispose(),super.dispose()}};export{D as FeatherfallAbility};
//# sourceMappingURL=FeatherfallAbility-BoTox4YH.js.map