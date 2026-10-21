import{F as e,G as t,I as n,Kr as r,P as i,R as a,V as o,Y as s,at as c,bn as l,di as u,fi as d,j as f,nt as p,o as m,st as h,xt as g,yn as _}from"./settings-DdywqLlV.js";import{n as v,t as y}from"./shaderPatch-DNdzBjlE.js";var b=Object.freeze({KEY_LIGHT:`keyLight`,GRADE:`grade`,AGE:`age`,HOLE:`hole`,GRAVITY:`gravity`,DISRUPT:`disrupt`}),x=Object.freeze([b.KEY_LIGHT,b.GRADE,b.AGE,b.HOLE,b.GRAVITY,b.DISRUPT]),S=8,C=new u,w=new u,T=new u,E=new g,D=new g;function O(e,t,n){let r=Math.cos(n);return e.set(-Math.cos(t)*r,-Math.sin(n),-Math.sin(t)*r),e.normalize()}var k={uAgeField:{value:new d(0,0,0,0)},uAgeShape:{value:new d(.35,0,0,0)},uAgeMix:{value:new d(0,0,0,0)},uAgeBleach:{value:0},uAgeRustColor:{value:new g(`#7a3b1c`)},uAgeDustColor:{value:new g(`#8a8375`)},uAgeMossColor:{value:new g(`#3d5a20`)},uAgeGrain:{value:1.4}};function A(){k.uAgeField.value.set(0,0,0,0),k.uAgeShape.value.set(.35,0,0,0),k.uAgeMix.value.set(0,0,0,0),k.uAgeBleach.value=0}var j=`
uniform vec4  uAgeField;
uniform vec4  uAgeShape;
uniform vec4  uAgeMix;
uniform float uAgeBleach;
uniform vec3  uAgeRustColor;
uniform vec3  uAgeDustColor;
uniform vec3  uAgeMossColor;
uniform float uAgeGrain;
varying vec3  vSceneAgeWorld;
`,M=`
float sceneAgeField(vec3 wp) {
  float r = uAgeField.w;
  if (r <= 0.0) return 0.0;
  float d = length(wp.xz - uAgeField.xz);
  float edge = clamp(uAgeShape.x, 0.001, 1.0);
  float inner = clamp(uAgeShape.z, 0.0, 0.999) * r;
  float rise = smoothstep(inner * (1.0 - edge), inner + 1e-3, d);
  float fall = 1.0 - smoothstep(r * (1.0 - edge), r, d);
  return rise * fall * clamp(uAgeShape.y, 0.0, 1.0);
}
`,N=`
{
  float age = sceneAgeField(vSceneAgeWorld);
  if (age > 0.0005) {
    vec3 wp = vSceneAgeWorld;
    float grain = max(uAgeGrain, 0.05);

    // Three bands, deliberately incommensurate scales: patches of rust are
    // metres across, moss hollows are broader still, pitting is centimetres.
    // Sharing one band makes all five terms land in the same places and the
    // whole thing collapses back into a single tint.
    //
    // NOT named 'patch'. It was, and the floor did not compile: three converts
    // this material to GLSL ES 3.00, where 'patch' is the tessellation-shader
    // qualifier and therefore reserved. The error is a syntax error on this
    // line with no mention of the word being reserved anywhere the eye lands,
    // and it takes the whole ground material down with it. The README's
    // reserved-word list has it now, and so does the harness.
    float mottle = fbm3(wp / grain) * 0.5 + 0.5;
    float hollow = fbm3(wp / (grain * 2.7) + 41.0) * 0.5 + 0.5;
    float speck = snoise01(wp / (grain * 0.16) + 7.0);

    float rust = clamp(uAgeMix.x, 0.0, 1.0) * age * smoothstep(0.42, 0.78, mottle);
    float dust = clamp(uAgeMix.y, 0.0, 1.0) * age * (0.65 + 0.35 * speck);
    float moss = clamp(uAgeMix.z, 0.0, 1.0) * age * smoothstep(0.62, 0.30, hollow);
    float pit  = clamp(uAgeMix.w, 0.0, 1.0) * age * smoothstep(0.74, 0.94, speck);

    // Pitting first: it is a hole in the stone, so everything that settles
    // afterwards settles into it.
    diffuseColor.rgb *= 1.0 - 0.62 * pit;
    roughnessFactor = mix(roughnessFactor, 1.0, pit * 0.8);

    // Rust. The metalness lift is the term that makes this a material change.
    diffuseColor.rgb = mix(diffuseColor.rgb, uAgeRustColor, rust * 0.85);
    roughnessFactor = mix(roughnessFactor, 0.82, rust);
    metalnessFactor = mix(metalnessFactor, 0.55, rust * 0.9);

    // Moss in the hollows: matte, and it kills metalness wherever it lands.
    diffuseColor.rgb = mix(diffuseColor.rgb, uAgeMossColor, moss * 0.8);
    roughnessFactor = mix(roughnessFactor, 0.97, moss);
    metalnessFactor *= 1.0 - moss * 0.9;

    // Dust lies on top of all of it and flattens the lot.
    diffuseColor.rgb = mix(diffuseColor.rgb, uAgeDustColor, dust * 0.55);
    roughnessFactor = mix(roughnessFactor, 1.0, dust * 0.9);
    metalnessFactor *= 1.0 - dust * 0.7;

    // Bleaching last, because sun-bleaching acts on whatever colour is there.
    float bleach = clamp(uAgeBleach, 0.0, 1.0) * age;
    float grey = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(grey), bleach * 0.75);
    diffuseColor.rgb += bleach * 0.10;
  }
}
`;function P(e){return!e||e.userData?.sceneHookAged?e:(y(e,e=>{Object.assign(e.uniforms,k);let t=v(e.vertexShader,`#include <common>`,`#include <common>
varying vec3 vSceneAgeWorld;`);t=v(t,`#include <begin_vertex>`,`#include <begin_vertex>
vSceneAgeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`),e.vertexShader=t;let n=v(e.fragmentShader,`#include <common>`,`#include <common>\n${j}\n${s}\n${M}`);n=v(n,`#include <metalnessmap_fragment>`,`#include <metalnessmap_fragment>\n${N}`),e.fragmentShader=n}),e.userData=e.userData??{},e.userData.uniforms=Object.assign(e.userData.uniforms??{},k),e.userData.sceneHookAged=!0,e.needsUpdate=!0,e)}var F=class{constructor(e){this.hook=e,this.serial=0,this.owner=null,this.active=!1,this.driving=!1,this.seen=0,this.hooks=null,this.reset()}reset(){this.weight=1}blend(e){return this.weight=e,this.hold()}hold(){return this.active&&this.hooks&&(this.seen=this.hooks._frame),this}release(){this.hooks?._release(this,this.serial)}},I=class extends F{reset(){this.weight=1,this.azimuth=0,this.elevation=0,this.aimed=!1,this.color=this.color??new g,this.color.setRGB(1,1,1),this.tinted=!1,this.intensity=1,this.lit=!1}aim(e,t){return this.azimuth=e,this.elevation=t,this.aimed=!0,this.hold()}tint(e){return typeof e==`string`?this.color.copy(a(e)):e&&this.color.copy(e),this.tinted=!0,this.hold()}brightness(e){return this.intensity=e,this.lit=!0,this.hold()}},L=class extends F{reset(){this.weight=1,this.saturation=1,this.hasSaturation=!1,this.temperature=0,this.hasTemperature=!1,this.lift=0,this.hasLift=!1,this.vignette=0,this.hasVignette=!1}saturate(e){return this.saturation=e,this.hasSaturation=!0,this.hold()}temper(e){return this.temperature=e,this.hasTemperature=!0,this.hold()}raise(e){return this.lift=e,this.hasLift=!0,this.hold()}darken(e){return this.vignette=e,this.hasVignette=!0,this.hold()}},R=class extends F{reset(){this.weight=1,this.centre=this.centre??new u,this.centre.set(0,0,0),this.radius=0,this.edge=.35,this.amount=0,this.inner=0,this.rust=0,this.dust=0,this.moss=0,this.pit=0,this.bleach=0,this.grain=1.4,this.rustColor=this.rustColor??new g,this.dustColor=this.dustColor??new g,this.mossColor=this.mossColor??new g,this.rustColor.set(`#7a3b1c`),this.dustColor.set(`#8a8375`),this.mossColor.set(`#3d5a20`)}at(e,t,n){return this.centre.set(e,t,n),this.hold()}atPoint(e){return this.centre.copy(e),this.hold()}field(e,t,n,r=0){return this.radius=e,this.edge=t,this.amount=n,this.inner=r,this.hold()}wear(e,t,n,r,i){return this.rust=e,this.dust=t,this.moss=n,this.pit=r,this.bleach=i,this.hold()}scale(e){return this.grain=e,this.hold()}colours(e,t,n){return e&&this.rustColor.copy(typeof e==`string`?a(e):e),t&&this.dustColor.copy(typeof t==`string`?a(t):t),n&&this.mossColor.copy(typeof n==`string`?a(n):n),this.hold()}},z=class extends F{reset(){this.weight=1,this.centre=this.centre??new u,this.centre.set(0,0,0),this.radius=0,this.squash=1}at(e,t,n){return this.centre.set(e,t,n),this.hold()}atPoint(e){return this.centre.copy(e),this.hold()}size(e,t=1){return this.radius=e,this.squash=t,this.hold()}},B=class extends F{reset(){this.weight=1,this.centre=this.centre??new u,this.centre.set(0,0,0),this.radius=0,this.edge=.25,this.inside=1,this.outside=1}at(e,t,n){return this.centre.set(e,t,n),this.hold()}atPoint(e){return this.centre.copy(e),this.hold()}well(e,t=.25){return this.radius=e,this.edge=t,this.hold()}scale(e,t=1){return this.inside=e,this.outside=t,this.hold()}},V=class extends F{reset(){this.weight=1,this.centre=this.centre??new u,this.centre.set(0,0,0),this.radius=0,this.edge=.35,this.drain=0,this.fracture=0,this.dim=0,this.grain=6}at(e,t,n){return this.centre.set(e,t,n),this.hold()}atPoint(e){return this.centre.copy(e),this.hold()}region(e,t=.35){return this.radius=e,this.edge=t,this.hold()}power(e,t,n){return this.drain=e,this.fracture=t,this.dim=n,this.hold()}shardSize(e){return this.grain=e,this.hold()}},H={[b.KEY_LIGHT]:I,[b.GRADE]:L,[b.AGE]:R,[b.HOLE]:z,[b.GRAVITY]:B,[b.DISRUPT]:V},U=class{constructor(){this._stacks=new Map,this._owned=new Map;for(let e of x)this._stacks.set(e,[]),this._owned.set(e,new WeakMap);this._held=0,this._frame=0,this._warned=new Set,this._scene=null,this._environment=null,this._grade=null,this._renderer=null,this._holeMesh=null,this._aged=!1,this.stats={acquired:0,released:0,reclaimed:0,applies:0}}install(e={}){this._scene=e.scene??null,this._environment=e.environment??null,this._grade=e.grade??null,this._renderer=e.renderer??null;let t=e.ground?.material??e.groundMaterial??null;return t&&(P(t),this._aged=!0),this}uninstall(){return this.dispose()}observe(e){return e&&(e.userData=e.userData??{},e.userData.uniforms=Object.assign(e.userData.uniforms??{},f,i,k),e)}acquire(e,t=null){let n=this._stacks.get(e);if(!n)return console.warn(`[SceneHooks] no such hook: ${String(e)}`),null;let r=this._owned.get(e),i=t?r.get(t):null;if(i&&i.active)return i.hold();let a=i??new H[e](e);t&&!i&&r.set(t,a),a.reset(),a.hooks=this,a.owner=t,a.active=!0,a.serial++,a.seen=this._frame,n.length===0&&this._held++;for(let e of n)e.driving=!1;return n.push(a),a.driving=!0,this.stats.acquired++,a}isHeld(e){return(this._stacks.get(e)?.length??0)>0}driver(e){let t=this._stacks.get(e);return t&&t.length?t[t.length-1]:null}get heldCount(){return this._held}reclaim(e){let t=0;for(let n of x){let r=this._stacks.get(n);for(let n=r.length-1;n>=0;n--)r[n].owner===e&&(this._release(r[n],r[n].serial),t++)}return t}releaseAll(){for(let e of x){let t=this._stacks.get(e);for(let e=t.length-1;e>=0;e--)this._release(t[e],t[e].serial)}return this}_release(e,t){if(!e||!e.active||e.serial!==t)return!1;let n=this._stacks.get(e.hook),r=n.indexOf(e);return r>=0&&n.splice(r,1),e.active=!1,e.driving=!1,e.owner=null,e.hooks=null,n.length===0?(this._held=Math.max(0,this._held-1),this._restore(e.hook)):n[n.length-1].driving=!0,this.stats.released++,!0}_restore(t){switch(t){case b.AGE:A();break;case b.HOLE:this._holeMesh&&(this._holeMesh.visible=!1);break;case b.GRAVITY:n();break;case b.DISRUPT:e();break;default:break}}apply(){this._held!==0&&(this._frame++,this.stats.applies++,this._sweep(),this._held!==0&&(this.isHeld(b.KEY_LIGHT)&&this._applyKeyLight(this.driver(b.KEY_LIGHT)),this.isHeld(b.GRADE)&&this._applyGrade(this.driver(b.GRADE)),this.isHeld(b.AGE)&&this._applyAge(this.driver(b.AGE)),this.isHeld(b.HOLE)&&this._applyHole(this.driver(b.HOLE)),this.isHeld(b.GRAVITY)&&this._applyGravity(this.driver(b.GRAVITY)),this.isHeld(b.DISRUPT)&&this._applyDisrupt(this.driver(b.DISRUPT))))}_sweep(){for(let e of x){let t=this._stacks.get(e);for(let n=t.length-1;n>=0;n--){let r=t[n];if(this._frame-r.seen<=S)continue;let i=r.owner?.id??r.owner?.constructor?.name??`an anonymous owner`,a=`${e}:${i}`;this._warned.has(a)||(this._warned.add(a),console.warn(`[SceneHooks] reclaimed '${e}' from ${i}: no write for ${S} frames. Call token.hold() on a frame with nothing to say, or token.release() when done.`)),this._release(r,r.serial),this.stats.reclaimed++}}}_applyKeyLight(e){let n=this._environment;if(!n||!e)return;let r=m.environment,i=h(e.weight);O(C,r.sunAzimuth,r.sunElevation),e.aimed?(O(w,e.azimuth,e.elevation),T.copy(C).lerp(w,i),T.lengthSq()<1e-8&&T.copy(w),T.normalize()):T.copy(C),n.sunTarget.position.copy(n.focus),n.sun.position.copy(n.focus).addScaledVector(T,-70),t.uLightDir.value.copy(T).negate(),e.tinted&&(E.copy(a(r.sunColor)),D.copy(E).lerp(e.color,i),n.sun.color.copy(D)),e.lit&&(n.sun.intensity=c(r.sunIntensity,e.intensity,i)),this._renderer?.gl&&(this._renderer.gl.shadowMap.needsUpdate=!0)}_applyGrade(e){let t=this._grade;if(!t||!e)return;let n=m.post,r=n.enabled!==!1,i=h(e.weight);e.hasSaturation&&t.uSaturation&&(t.uSaturation.value=c(r?n.saturation:1,e.saturation,i)),e.hasTemperature&&t.uTemperature&&(t.uTemperature.value=c(r?n.temperature:0,e.temperature,i)),e.hasLift&&t.uLift&&(t.uLift.value=c(n.lift,e.lift,i)),e.hasVignette&&t.uVignette&&(t.uVignette.value=c(r?n.vignette:0,e.vignette,i))}_applyAge(e){if(!e)return;let t=h(e.weight);k.uAgeField.value.set(e.centre.x,e.centre.y,e.centre.z,Math.max(0,e.radius)),k.uAgeShape.value.set(p(e.edge,.001,1),h(e.amount)*t,p(e.inner,0,.999),0),k.uAgeMix.value.set(h(e.rust),h(e.dust),h(e.moss),h(e.pit)),k.uAgeBleach.value=h(e.bleach),k.uAgeGrain.value=Math.max(.05,e.grain),k.uAgeRustColor.value.copy(e.rustColor),k.uAgeDustColor.value.copy(e.dustColor),k.uAgeMossColor.value.copy(e.mossColor)}_applyHole(e){if(!e)return;let t=this._ensureHole();if(!t)return;let n=Math.max(0,e.radius)*h(e.weight);t.visible=n>1e-4,t.visible&&(t.position.copy(e.centre),t.scale.set(n,n*Math.max(.01,e.squash),n),t.updateMatrix())}_ensureHole(){if(this._holeMesh)return this._holeMesh;if(!this._scene)return null;let e=new _(new r(1,32,16),new l({colorWrite:!1,depthWrite:!0,depthTest:!0,fog:!1}));return e.name=`SceneHooks.Hole`,e.layers.set(o.WORLD),e.renderOrder=-1e3,e.castShadow=!1,e.receiveShadow=!1,e.matrixAutoUpdate=!1,e.visible=!1,this._scene.add(e),this._holeMesh=e,e}_applyGravity(e){if(!e)return;let t=h(e.weight);i.uGravityWell.value.set(e.centre.x,e.centre.y,e.centre.z,Math.max(0,e.radius)),i.uGravityMix.value.set(c(e.outside,e.inside,t),e.outside,p(e.edge,.001,1),0)}_applyDisrupt(e){if(!e)return;let t=h(e.weight);f.uDisruptRegion.value.set(e.centre.x,e.centre.y,e.centre.z,Math.max(0,e.radius)),f.uDisruptPower.value.set(h(e.drain)*t,h(e.fracture)*t,h(e.dim)*t,p(e.edge,.001,1)),f.uDisruptGrain.value=Math.max(1,e.grain)}gravityAt(e,t,n){let r=i.uGravityWell.value;if(r.w<=0)return 1;let a=i.uGravityMix.value,o=p(a.z,.001,1),s=Math.hypot(e-r.x,t-r.y,n-r.z),c=1-W(r.w*(1-o),r.w,s);return a.y+(a.x-a.y)*c}disruptAt(e,t,n){let r=f.uDisruptRegion.value;if(r.w<=0)return 0;let i=p(f.uDisruptPower.value.w,.001,1),a=Math.hypot(e-r.x,t-r.y,n-r.z);return 1-W(r.w*(1-i),r.w,a)}ageAt(e,t){let n=k.uAgeField.value;if(n.w<=0)return 0;let r=k.uAgeShape.value,i=Math.hypot(e-n.x,t-n.z),a=p(r.x,.001,1),o=p(r.z,0,.999)*n.w;return W(o*(1-a),o+.001,i)*(1-W(n.w*(1-a),n.w,i))*h(r.y)}describe(){let e=[];for(let t of x){let n=this._stacks.get(t);if(!n.length)continue;let r=n.map(e=>e.owner?.id??e.owner?.constructor?.name??`?`);e.push(`${t}[${r.join(` < `)}]`)}return e.length?e.join(` `):`nothing held`}dispose(){return this.releaseAll(),this._holeMesh&&=(this._holeMesh.parent?.remove(this._holeMesh),this._holeMesh.geometry.dispose(),this._holeMesh.material.dispose(),null),this._scene=null,this._environment=null,this._grade=null,this._renderer=null,this}};function W(e,t,n){if(t-e<=0)return+(n>=t);let r=h((n-e)/(t-e));return r*r*(3-2*r)}var G=new U;export{G as n,b as t};
//# sourceMappingURL=SceneHooks-DvEWF-72.js.map