import{Br as e,Gr as t,K as n,Kt as r,L as i,Nn as a,Pn as o,V as s,Y as c,Yt as l,an as u,di as d,fi as f,hi as p,ui as m,vn as h,xt as g,yn as _}from"./settings-DdywqLlV.js";import{r as v}from"./quads-DpYMEt67.js";var y={max:2,live:0,rendered:0,skipped:0,calls:0,triangles:0},b={list:[],token:-1,own:0,rendering:!1},x=new a,S=new d,C=new d,w=new d,T=new d,E=new d,D=new d,O=new d,k=new d,A=new d,j=new d,M=new h,N=new h,P=new r,F=new t,I=new o,L=new f,R=new f,z=new h().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);function B(e,t){if(e.info.render.frame-b.own===b.token)return;b.token=e.info.render.frame,b.own=0,y.rendered=0,y.skipped=0,y.calls=0,y.triangles=0;let n=b.list,r=0;for(let e=0;e<n.length;e++){let i=n[e];i._selected=!1,i._wants=i._wantsRender(t),i._wants&&r++}let i=Math.min(y.max,r);for(let e=0;e<i;e++){let e=null,r=-1;for(let i=0;i<n.length;i++){let a=n[i];if(!a._wants||a._selected)continue;let o=a._score(t);o>r&&(r=o,e=a)}if(!e)break;e._selected=!0}y.skipped=r-i;for(let e=0;e<n.length;e++){let t=n[e];t._wants&&!t._selected&&t._starve++}}var V=`
  uniform vec3  uAnchor;
  uniform vec3  uAxisX;
  uniform vec3  uAxisY;
  uniform vec2  uSize;          // full extents in metres (x along uAxisX)
  uniform mat4  uReflectMatrix; // bias * proj * view of the reflection camera

  varying vec2 vLocal;      // metres from the centre, in the plane
  varying vec2 vNorm;       // -1..1 across the quad
  varying vec4 vReflect;
  varying vec3 vWorld;
  varying vec3 vViewDir;    // world-space, fragment → eye
  varying vec3 vNormalW;
  varying vec2 vStretch;    // screen direction of the normal, constant

  void main() {
    vec2 ext = (uv - 0.5) * uSize;
    vec3 world = uAnchor + uAxisX * ext.x + uAxisY * ext.y;

    vLocal = ext;
    vNorm = (uv - 0.5) * 2.0;
    vWorld = world;
    vNormalW = normalize(cross(uAxisX, uAxisY));
    vViewDir = normalize(cameraPosition - world);

    vReflect = uReflectMatrix * vec4(world, 1.0);

    vec4 clip = projectionMatrix * viewMatrix * vec4(world, 1.0);
    gl_Position = clip;

    /* The screen image of the anchor and of one metre of surface normal. Both
     * are constant over the quad, so the varying is exact everywhere. */
    vec4 c0 = projectionMatrix * viewMatrix * vec4(uAnchor, 1.0);
    vec4 c1 = projectionMatrix * viewMatrix * vec4(uAnchor + vNormalW, 1.0);
    vec2 s0 = c0.xy / max(c0.w, 0.001);
    vec2 s1 = c1.xy / max(c1.w, 0.001);
    vec2 d = s1 - s0;
    vStretch = length(d) > 1e-5 ? normalize(d) : vec2(0.0, 1.0);
  }
`,H=`
  uniform sampler2D uReflection;
  uniform float uHasReflection;   // 0 until the first reflection has been rendered
  uniform vec2  uResolution;
  uniform float uTime;

  uniform float uRoughness;       // 0 mirror-smooth, 1 fully scattered
  uniform float uBlurRadius;      // reflection-UV radius at roughness 1
  uniform float uBlurTaps;        // 1..12
  uniform float uRoughStretch;    // elongation along the normal's screen direction

  uniform float uReflectivity;    // 0..1 base reflection weight
  uniform float uFresnel;         // 0..1 how much the grazing term shapes it
  uniform float uFresnelPower;

  uniform float uRipple;          // UV amplitude of the surface disturbance
  uniform float uRippleScale;     // cycles per metre
  uniform float uRippleSpeed;     // metres per second

  uniform float uOpacity;
  uniform float uEdgeFade;        // 0..1 of the half-extent
  uniform float uCorner;          // 0 rectangle, 1 ellipse
  uniform float uSeed;

  uniform vec3  uColorTint;       // multiplies the reflection
  uniform vec3  uColorBase;       // what shows through where it does not reflect

  varying vec2 vLocal;
  varying vec2 vNorm;
  varying vec4 vReflect;
  varying vec3 vWorld;
  varying vec3 vViewDir;
  varying vec3 vNormalW;
  varying vec2 vStretch;

  ${c}

  void main() {
    /* --- the reflection lookup ------------------------------------- */
    vec2 base = vReflect.xy / max(vReflect.w, 0.0001);

    /* The disturbance is sampled in world metres and scrolls in world metres,
     * so orbiting the camera does not drag the ripple across the surface —
     * the same reason Distortion.js's heat haze works in world space. */
    vec3 rp = vec3(vWorld.xz * uRippleScale, vWorld.y * uRippleScale - uTime * uRippleSpeed);
    base += vec2(fbm3(rp), fbm3(rp + vec3(19.3, 7.1, 41.7))) * uRipple;

    float aspect = max(uResolution.x, 1.0) / max(uResolution.y, 1.0);
    float radius = clamp(uRoughness, 0.0, 1.0) * uBlurRadius;
    float taps = clamp(uBlurTaps, 1.0, 12.0);

    /* Static per-pixel jitter. Deliberately not a function of time — see the
     * module comment; a temporal hash here boils. */
    float jitter = hash13(vec3(gl_FragCoord.xy, uSeed)) * 6.28318530718;

    vec3 refl = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      if (fi >= taps) break;
      float ang = fi * 2.39996323 + jitter;
      float rad = sqrt((fi + 0.5) / taps) * radius;
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 off = dir * rad;
      // Elongate along the normal's screen direction: a rough plane smears its
      // reflection along the view-vertical, it does not fog it evenly.
      off += vStretch * dot(dir, vStretch) * rad * uRoughStretch;
      off.x /= aspect;   // the square target holds a wide frame; unsquash it
      refl += texture2D(uReflection, clamp(base + off, 0.0015, 0.9985)).rgb;
      wsum += 1.0;
    }
    refl /= max(wsum, 1.0);
    refl *= uColorTint;

    /* --- how much of it survives ------------------------------------ */
    float grazing = 1.0 - abs(dot(normalize(vViewDir), normalize(vNormalW)));
    float fres = mix(1.0, pow(clamp(grazing, 0.0, 1.0), max(uFresnelPower, 0.01)), clamp(uFresnel, 0.0, 1.0));
    float k = clamp(uReflectivity * fres, 0.0, 1.0) * uHasReflection;

    vec3 rgb = mix(uColorBase, refl, k);

    /* --- the silhouette ---------------------------------------------- */
    float d = mix(max(abs(vNorm.x), abs(vNorm.y)), length(vNorm), clamp(uCorner, 0.0, 1.0));
    float edge = 1.0 - smoothstep(1.0 - clamp(uEdgeFade, 0.001, 1.0), 1.0, d);
    float alpha = clamp(uOpacity, 0.0, 1.0) * edge;

    if (alpha < 0.002) discard;
    gl_FragColor = vec4(rgb, alpha);
  }
`,U={width:4,height:4,opacity:1,edgeFade:.12,corner:0,seed:0,resolution:384,reflectivity:.85,fresnel:.35,fresnelPower:2.4,roughness:.25,blurRadius:.035,blurTaps:6,roughStretch:1.2,ripple:0,rippleScale:1.4,rippleSpeed:.5,priority:1,colorTint:`#ffffff`,colorBase:`#0a1116`};function W(){return{...U}}var G=(e,t)=>e??t,K=class{constructor({resolution:t=384,layer:r=s.VFX,reflectLayer:i=s.WORLD,renderOrder:a=4,doubleSided:o=!0,depthWrite:c=!1,name:f}={}){this.reflectLayer=i,this.doubleSided=o,this._resolution=Math.max(64,Math.min(1024,Math.round(t))),this.target=new p(this._resolution,this._resolution,{type:l,depthBuffer:!0,minFilter:u,magFilter:u}),this.target.texture.generateMipmaps=!1,this.target.texture.name=f?`${f}:reflection`:`Mirror:reflection`,this.material=new e({name:f?`${f}:mirror`:`Mirror`,transparent:!0,depthWrite:c,depthTest:!0,blending:1,side:2,uniforms:n({uAnchor:{value:new d},uAxisX:{value:new d(1,0,0)},uAxisY:{value:new d(0,0,1)},uSize:{value:new m(U.width,U.height)},uReflectMatrix:{value:new h},uReflection:{value:this.target.texture},uHasReflection:{value:0},uRoughness:{value:U.roughness},uBlurRadius:{value:U.blurRadius},uBlurTaps:{value:U.blurTaps},uRoughStretch:{value:U.roughStretch},uReflectivity:{value:U.reflectivity},uFresnel:{value:U.fresnel},uFresnelPower:{value:U.fresnelPower},uRipple:{value:U.ripple},uRippleScale:{value:U.rippleScale},uRippleSpeed:{value:U.rippleSpeed},uOpacity:{value:U.opacity},uEdgeFade:{value:U.edgeFade},uCorner:{value:U.corner},uSeed:{value:U.seed},uColorTint:{value:new g(U.colorTint)},uColorBase:{value:new g(U.colorBase)}}),vertexShader:V,fragmentShader:H}),this.mesh=new _(v(),this.material),this.mesh.name=f||`Mirror`,this.mesh.layers.set(r),this.mesh.renderOrder=a,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.visible=!1,this.mesh.onBeforeRender=(e,t,n)=>this._onBeforeRender(e,t,n),this.priority=U.priority,this._starve=999,this._selected=!1,this._wants=!1,this._visible=!1,this._disposed=!1,this.lastCalls=0,this.lastTriangles=0}get object3D(){return this.mesh}get drawCalls(){return 1}get resolution(){return this._resolution}get visible(){return this._visible}set visible(e){let t=!!e&&!this._disposed;if(t!==this._visible)if(this._visible=t,this.mesh.visible=t,t)b.list.push(this),y.live++,this._starve=999,this.material.uniforms.uHasReflection.value=0;else{let e=b.list.indexOf(this);e>=0&&b.list.splice(e,1),y.live=Math.max(0,y.live-1)}}setPlacement(e,t,n){let r=this.material.uniforms;return S.copy(t).normalize(),k.copy(n),k.addScaledVector(S,-k.dot(S)),k.lengthSq()<1e-8&&(k.set(1,0,0).addScaledVector(S,-S.x),k.lengthSq()<1e-8&&k.set(0,0,1).addScaledVector(S,-S.z)),k.normalize(),A.crossVectors(S,k).normalize(),r.uAnchor.value.copy(e),r.uAxisX.value.copy(k),r.uAxisY.value.copy(A),this}update(e){let t=this.material.uniforms;return t.uSize.value.set(G(e.width,U.width),G(e.height,U.height)),t.uRoughness.value=G(e.roughness,U.roughness),t.uBlurRadius.value=G(e.blurRadius,U.blurRadius),t.uBlurTaps.value=G(e.blurTaps,U.blurTaps),t.uRoughStretch.value=G(e.roughStretch,U.roughStretch),t.uReflectivity.value=G(e.reflectivity,U.reflectivity),t.uFresnel.value=G(e.fresnel,U.fresnel),t.uFresnelPower.value=G(e.fresnelPower,U.fresnelPower),t.uRipple.value=G(e.ripple,U.ripple),t.uRippleScale.value=G(e.rippleScale,U.rippleScale),t.uRippleSpeed.value=G(e.rippleSpeed,U.rippleSpeed),t.uOpacity.value=G(e.opacity,U.opacity),t.uEdgeFade.value=G(e.edgeFade,U.edgeFade),t.uCorner.value=G(e.corner,U.corner),t.uSeed.value=G(e.seed,U.seed),i(t.uColorTint.value,e.colorTint||U.colorTint),i(t.uColorBase.value,e.colorBase||U.colorBase),this.priority=G(e.priority,U.priority),this._setResolution(G(e.resolution,U.resolution)),this}_setResolution(e){let t=Math.max(64,Math.min(1024,Math.round(e)));t!==this._resolution&&(this._resolution=t,this.target.setSize(t,t),this.material.uniforms.uHasReflection.value=0,this._starve=999)}_boundRadius(){let e=this.material.uniforms.uSize.value;return .5*Math.sqrt(e.x*e.x+e.y*e.y)}_wantsRender(e){if(!this._visible||this._disposed)return!1;let t=this.material.uniforms;return C.copy(t.uAnchor.value),w.setFromMatrixPosition(e.matrixWorld),!this.doubleSided&&(S.crossVectors(t.uAxisX.value,t.uAxisY.value).normalize(),j.subVectors(w,C).dot(S)<=0)?!1:(N.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),P.setFromProjectionMatrix(N),F.center.copy(C),F.radius=this._boundRadius(),P.intersectsSphere(F))}_score(e){w.setFromMatrixPosition(e.matrixWorld);let t=Math.max(.25,w.distanceTo(this.material.uniforms.uAnchor.value)),n=this._boundRadius()/t;return Math.max(this.priority,0)*n*(1+this._starve)}_onBeforeRender(e,t,n){t.overrideMaterial||b.rendering||n.isPerspectiveCamera&&(B(e,n),this._selected&&(this._selected=!1,this._renderReflection(e,t,n)))}_renderReflection(e,t,n){let r=this.material.uniforms;if(C.copy(r.uAnchor.value),S.crossVectors(r.uAxisX.value,r.uAxisY.value).normalize(),w.setFromMatrixPosition(n.matrixWorld),j.subVectors(w,C).dot(S)<0){if(!this.doubleSided)return;S.negate()}T.subVectors(C,w).reflect(S).negate().add(C),M.extractRotation(n.matrixWorld),E.set(0,0,-1).applyMatrix4(M).add(w),D.subVectors(C,E).reflect(S).negate().add(C),O.set(0,1,0).applyMatrix4(M).reflect(S),x.position.copy(T),x.up.copy(O),x.lookAt(D),x.near=n.near,x.far=n.far,x.updateMatrixWorld(!0),x.matrixWorldInverse.copy(x.matrixWorld).invert(),x.projectionMatrix.copy(n.projectionMatrix),x.layers.set(this.reflectLayer),I.setFromNormalAndCoplanarPoint(S,C),I.applyMatrix4(x.matrixWorldInverse),L.set(I.normal.x,I.normal.y,I.normal.z,I.constant);let i=x.projectionMatrix;R.x=(Math.sign(L.x)+i.elements[8])/i.elements[0],R.y=(Math.sign(L.y)+i.elements[9])/i.elements[5],R.z=-1,R.w=(1+i.elements[10])/i.elements[14],L.multiplyScalar(2/L.dot(R)),i.elements[2]=L.x,i.elements[6]=L.y,i.elements[10]=L.z+1-.004,i.elements[14]=L.w,r.uReflectMatrix.value.copy(z).multiply(x.projectionMatrix).multiply(x.matrixWorldInverse);let a=e.getRenderTarget(),o=e.xr.enabled,s=e.shadowMap.autoUpdate,c=this.mesh.visible;this.mesh.visible=!1,e.xr.enabled=!1,e.shadowMap.autoUpdate=!1,b.rendering=!0,e.setRenderTarget(this.target),e.state.buffers.depth.setMask(!0),e.autoClear===!1&&e.clear(),e.render(t,x),b.rendering=!1,this.lastCalls=e.info.render.calls,this.lastTriangles=e.info.render.triangles,y.calls+=this.lastCalls,y.triangles+=this.lastTriangles,y.rendered++,b.own++,e.setRenderTarget(a),e.xr.enabled=o,e.shadowMap.autoUpdate=s,this.mesh.visible=c,n.viewport!==void 0&&e.state.viewport(n.viewport),r.uHasReflection.value=1,this._starve=0}dispose(){this.visible=!1,this._disposed=!0,this.mesh.onBeforeRender=()=>{},this.target.dispose(),this.material.dispose(),this.mesh.parent?.remove(this.mesh)}};export{y as n,W as r,K as t};
//# sourceMappingURL=Mirror-DRp0p4CU.js.map