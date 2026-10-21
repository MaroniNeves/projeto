import{$t as e,Br as t,Gr as n,Jt as r,K as i,Qt as a,R as o,V as s,Y as c,_t as l,di as u,q as d,xt as f,yn as p}from"./settings-DdywqLlV.js";var m=Object.freeze({FLAT:0,ROUND:1,SPLIT:2}),h=`
  float vnoise1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash11(i), hash11(i + 1.0), f);
  }
`,g=`
  #define TAU 6.283185307179586
  #define INK_QUAD 12

  /* --- the paper --- */
  uniform vec3  uPaper;         // unit normal of the plane the stroke is written in

  /* --- the brush --- */
  uniform float uWidth;         // metres, ferrule half-width at pressure 1
  uniform float uDepth;         // metres, half-thickness of one bristle's deposit
  uniform float uFerruleDepth;  // metres the bristles are spread through the paper normal
  uniform float uBristles;      // how many, so one bristle's share of the width is known
  uniform float uBristleWidth;  // >1 overlaps into a solid stroke, <1 separates
  uniform float uSplay;         // fraction the bristles fan out at full pressure
  uniform float uWobble;        // metres of per-bristle lateral wander
  uniform float uFibreScale;    // features per metre of that wander

  /* --- ink --- */
  uniform float uFlowLength;    // pigment laid per metre of travel, at pressure 1
  uniform float uFlowDwell;     // extra pigment laid per metre when the brush dwells
  uniform float uSpeedRef;      // metres per unit t at which the brush is "at speed"
  uniform float uEdgeStarve;    // load multiplier at the edge of the ferrule
  uniform float uLoadJitter;    // +/- fraction of load, per bristle
  uniform float uDryBand;       // ink units over which a bristle goes wet -> dry
  uniform float uDryThin;       // width multiplier when a bristle is fully dry
  uniform float uSkipScale;     // features per metre of the contact noise
  uniform float uSkipSoft;      // softness of the contact threshold
  uniform float uSkipContrast;  // pushes the value noise off its central pile

  /* --- pooling --- */
  uniform float uPoolSwell;     // fraction the stroke widens per unit of extra pigment
  uniform float uPoolCurve;     // extra pigment per 1/metre of spine curvature
  uniform float uPigment;       // overall density multiplier

  /* --- the beat --- */
  uniform float uProgress;      // 0..1 across the whole set of strokes
  uniform float uHeadTaper;     // fraction of the drawn length the moving head tapers over
  uniform float uWetLength;     // metres behind the head that still read wet

  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec4 aPress;        // pressure control points: entry, swell, hold, exit
  attribute vec4 aStroke;       // drawStart, drawSpan, strokeSeed, inkLoad
  attribute vec4 aBrush;        // across -1..1, through -1..1, load dice, bristle seed

  varying float vPigment;
  varying float vAcross;
  varying float vDry;
  varying float vContact;
  varying float vWet;
  varying float vAlong;
  varying float vSeed;
  varying vec3  vNormalW;
  varying float vViewZ;

  ${c}
  ${h}

  vec3 safeNormalize(vec3 v, vec3 fallback) {
    float l2 = dot(v, v);
    return l2 > 1e-10 ? v * inversesqrt(l2) : fallback;
  }

  /* --- the spine ---------------------------------------------------- */

  vec3 bezier(float t) {
    float m = 1.0 - t;
    return m * m * m * aP0 + 3.0 * m * m * t * aP1 + 3.0 * m * t * t * aP2 + t * t * t * aP3;
  }

  vec3 bezierD(float t) {
    float m = 1.0 - t;
    return 3.0 * (m * m * (aP1 - aP0) + 2.0 * m * t * (aP2 - aP1) + t * t * (aP3 - aP2));
  }

  vec3 bezierDD(float t) {
    float m = 1.0 - t;
    return 6.0 * (m * (aP2 - 2.0 * aP1 + aP0) + t * (aP3 - 2.0 * aP2 + aP1));
  }

  /**
   * Pressure, on the same cubic Bernstein basis as the spine.
   *
   * Bernstein rather than an interpolating spline on purpose: the curve passes
   * through the first and last control points exactly, which is what "entry"
   * and "exit" have to mean, and the two middle points only pull at the body.
   * An interpolating curve through four authored values overshoots between them
   * and the overshoot is a bulge the author did not draw.
   */
  float pressureAt(float t) {
    float m = 1.0 - t;
    return m * m * m * aPress.x + 3.0 * m * m * t * aPress.y
         + 3.0 * m * t * t * aPress.z + t * t * t * aPress.w;
  }

  /** Pigment laid per metre of travel. 1.0 is a nominal full-pressure stroke. */
  float pigmentAt(float t) {
    float sp = max(length(bezierD(t)), 1e-3);
    float pr = max(pressureAt(t), 0.0);
    // Two terms because deposition has two causes: area swept (scales with the
    // distance covered) and time in contact (does not). Where the spine's
    // control points bunch, sp collapses, the dwell term blows up, and the ink
    // pools — which is the whole of "pooling where the stroke slows".
    float dwell = uFlowDwell * (uSpeedRef / sp);
    return pr * (uFlowLength + dwell) * uPigment;
  }

  /** Ink drawn out of the ferrule between the start of the stroke and t. */
  float inkSpent(float t) {
    float h = t / float(INK_QUAD);
    float acc = 0.0;
    for (int i = 0; i <= INK_QUAD; i++) {
      float s = float(i) * h;
      float w = (i == 0 || i == INK_QUAD) ? 0.5 : 1.0;
      acc += w * pigmentAt(s) * max(length(bezierD(s)), 1e-3);
    }
    return acc * h;
  }

  void main() {
    /*
     * The head. Strokes are written in sequence: uProgress is one clock for the
     * whole set and each stroke owns a window of it. The along-parameter is
     * *remapped* into 0..head rather than clipped at it, so the strip spends
     * all its samples on the part that exists and the head itself is a full
     * cross-section — the brush is still there, it has not been lifted.
     */
    float head = clamp((uProgress - aStroke.x) / max(aStroke.y, 1e-4), 0.0, 1.0);
    float t = position.x * head;
    float ring = position.y;

    vec3  P  = bezier(t);
    vec3  T  = bezierD(t);
    float sp = max(length(T), 1e-4);
    vec3  Tn = T / sp;

    vec3 paper = safeNormalize(uPaper, vec3(0.0, 1.0, 0.0));
    vec3 W = safeNormalize(cross(Tn, paper), vec3(1.0, 0.0, 0.0));  // across the stroke
    vec3 D = safeNormalize(cross(W, Tn), paper);                     // through the paper

    float pr = max(pressureAt(t), 0.0);
    float halfW = uWidth * pr;

    /* --- pooling ---------------------------------------------------- */
    // Curvature in 1/metres. A hairpin is where the brush pivots on its tip and
    // dumps ink, and the speed term alone under-reads it because a tight turn
    // can still be quick.
    vec3 A = bezierDD(t);
    float curv = length(cross(T, A)) / (sp * sp * sp);
    float pig = pigmentAt(t) * (1.0 + uPoolCurve * curv);
    halfW *= 1.0 + uPoolSwell * max(pig - 1.0, 0.0);

    /* --- the head, while it is still moving -------------------------- */
    // step(head, 0.999) is 1 while the stroke is unfinished. A finished stroke
    // must not taper at t = 1: that is the exit, and the exit is the author's
    // last pressure control point, not ours.
    float drawing = step(head, 0.999);
    float toHead = (head - t) / max(head, 1e-4);
    float headFade = mix(1.0, smoothstep(0.0, max(uHeadTaper, 1e-4), toHead), drawing);

    /* --- arclength, approximated by the chord ------------------------ */
    // Good enough for the noise phases and the wet band, and it costs nothing.
    // The exact arclength would need its own quadrature and would move the
    // streaks by less than their own width.
    float chord = max(length(aP3 - aP0), 1e-3);
    float along = t * chord;
    float wet = 1.0 - smoothstep(0.0, max(uWetLength, 1e-3), (head - t) * chord);

    /* --- this bristle's ink ------------------------------------------ */
    float load = aStroke.w
               * mix(1.0, max(uEdgeStarve, 0.0), abs(aBrush.x))
               * (1.0 + uLoadJitter * (aBrush.z - 0.5) * 2.0);
    float remain = load - inkSpent(t);
    float dry = 1.0 - clamp(remain / max(uDryBand, 1e-3), 0.0, 1.0);

    float bseed = aBrush.w * 613.0 + aStroke.z * 37.0;
    float n = vnoise1(along * uSkipScale + bseed);
    n = clamp(0.5 + (n - 0.5) * max(uSkipContrast, 0.0), 0.0, 1.0);
    float soft = max(uSkipSoft, 1e-3);
    // Below the threshold the bristle is off the paper. step() on remain is not
    // redundant with the smoothstep: dryness saturates at 1 while remain keeps
    // going negative, and a lucky noise sample would otherwise let a spent
    // bristle print a stray dash a metre past its runout.
    float contact = smoothstep(dry - soft, dry + soft, n) * step(0.0, remain);

    /* --- the cross-section ------------------------------------------- */
    float bw = halfW * (max(uBristleWidth, 0.0) / max(uBristles, 1.0));
    bw *= mix(1.0, max(uDryThin, 0.0), dry);
    float bd = uDepth * mix(1.0, max(uDryThin, 0.0), dry);

    float across = aBrush.x * (1.0 + uSplay * pr);
    float wob = (vnoise1(along * uFibreScale + bseed * 1.7) - 0.5) * 2.0 * uWobble;
    vec3 centre = P + W * (across * halfW + wob) + D * (aBrush.y * uFerruleDepth);

    float ang = ring * TAU;
    vec2 sect = vec2(cos(ang), sin(ang));
    // Collapsing the section onto the spine where contact is lost is what makes
    // the fray read as fibres tapering off rather than as a stroke with bites
    // taken out of it. The degenerate triangles cost nothing; the fragment
    // discards them on alpha anyway.
    float sc = contact * headFade;
    vec3 world = centre + W * (sect.x * bw * sc) + D * (sect.y * bd * sc);

    // The ellipse normal, written as the un-normalised gradient so a zero
    // half-axis does not divide by zero.
    vec3 nrm = safeNormalize(W * (sect.x * bd) + D * (sect.y * bw), D);

    vPigment = pig;
    vAcross  = sect.x;
    vDry     = dry;
    vContact = sc * step(0.0001, head);
    vWet     = wet;
    vAlong   = along;
    vSeed    = bseed;
    vNormalW = nrm;

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vViewZ = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`,_=`
  uniform vec2  uResolution;
  uniform sampler2D uSceneDepth;
  uniform float uCameraNear;
  uniform float uCameraFar;
  uniform vec3  uLightDir;

  uniform float uBleed;         // fraction of the bristle half-width the edge wicks over
  uniform float uFibreEdge;     // capillary roughness of that edge
  uniform float uFibreScale;    // features per metre
  uniform float uDryPigment;    // density multiplier where a bristle is dry
  uniform float uWetGain;       // extra density in the wet band behind the head
  uniform float uOpacity;
  uniform float uFade;          // the ability's own fade, 0..1
  uniform float uLit;           // 0 flat pigment, 1 wrapped diffuse
  uniform float uBackLit;       // the floor of that wrap
  uniform float uCeiling;       // max linear luminance — the anti-bloom clamp
  uniform float uSoftFade;      // metres of depth feather

  uniform vec3  uColorA;        // the palest wicked edge
  uniform vec3  uColorB;        // body
  uniform vec3  uColorC;        // full-strength ink
  uniform vec3  uColorD;        // pooled
  uniform float uTint;          // where in the gradient a zero-density mark sits
  uniform float uTintDensity;   // how far density walks it
  uniform float uTintJitter;    // +/- per bristle

  varying float vPigment;
  varying float vAcross;
  varying float vDry;
  varying float vContact;
  varying float vWet;
  varying float vAlong;
  varying float vSeed;
  varying vec3  vNormalW;
  varying float vViewZ;

  ${c}
  ${d}
  ${h}

  void main() {
    if (vContact < 0.004) discard;

    // Distance in from the rim of this bristle, 1 on its centreline.
    float edge = 1.0 - abs(vAcross);
    float fibre = (vnoise1(vAlong * uFibreScale * 3.1 + vSeed * 0.37) - 0.5) * uFibreEdge;
    float ink = smoothstep(0.0, max(uBleed, 1e-3), edge + fibre);
    if (ink < 0.004) discard;

    float density = vPigment * ink * vContact;
    density *= mix(1.0, max(uDryPigment, 0.0), vDry);
    density *= 1.0 + uWetGain * vWet;

    float alpha = clamp(density * uOpacity, 0.0, 1.0) * clamp(uFade, 0.0, 1.0);
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    alpha *= softFade(uSceneDepth, screenUV, vViewZ, uCameraNear, uCameraFar, uSoftFade);
    if (alpha < 0.004) discard;

    float jitter = (fract(vSeed * 0.618034) - 0.5) * 2.0 * uTintJitter;
    float g = clamp(uTint + density * uTintDensity + jitter, 0.0, 1.0);
    vec3 colour = gradient4(uColorA, uColorB, uColorC, uColorD, g);

    // Wrapped diffuse and no specular at all. A specular lobe on ink is the one
    // thing that would put this school back among the emissive ones; the only
    // gloss in Ink is on wet InkDiffusion, where it is a real observation.
    vec3 nrm = normalize(vNormalW);
    float ndl = dot(nrm, normalize(uLightDir)) * 0.5 + 0.5;
    colour *= mix(1.0, mix(max(uBackLit, 0.0), 1.0, ndl), clamp(uLit, 0.0, 1.0));

    float lum = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    colour *= lum > uCeiling ? uCeiling / max(lum, 1e-4) : 1.0;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 1.0));
  }
`,v=new u,y=new u,b=new u,x=new u,S=new u(0,1,0),C=class{constructor(e,t){this._brush=e,this.index=t,this.p0=new u,this.p1=new u,this.p2=new u,this.p3=new u,this.pressEntry=.15,this.pressSwell=1,this.pressHold=.85,this.pressExit=.05,this.drawStart=0,this.drawSpan=1,this.load=9,this.seed=0,this.active=!0}curve(e,t,n,r){return this.p0.copy(e),this.p1.copy(t),this.p2.copy(n),this.p3.copy(r),this}line(e,t,n=0,r=0){let i=this._brush._paper;v.copy(t).sub(e);let a=v.length();return a>1e-5?v.multiplyScalar(1/a):v.set(0,0,1),y.copy(v).cross(i),y.lengthSq()<1e-8&&y.copy(v).cross(S),y.lengthSq()<1e-8&&y.set(1,0,0),y.normalize(),this.p0.copy(e),this.p3.copy(t),b.copy(y).multiplyScalar(n).addScaledVector(i,r),this.p1.copy(e).lerp(t,1/3).add(b),this.p2.copy(e).lerp(t,2/3).add(b),this}pressure(e,t,n,r){return this.pressEntry=e,this.pressSwell=t,this.pressHold=n,this.pressExit=r,this}ink(e){return this.load=e,this}timing(e,t){return this.drawStart=e,this.drawSpan=t,this}get head(){let e=this._brush.material.uniforms.uProgress.value;return Math.max(0,Math.min(1,(e-this.drawStart)/Math.max(this.drawSpan,1e-4)))}},w=class{constructor(o,{strokes:c=6,bristles:d=14,samples:h=40,sides:v=6,tip:y=m.FLAT,depthWrite:b=!1,layer:x=s.VFX,renderOrder:S=7,name:w=null}={}){this.strokes=Math.max(1,Math.round(c)),this.bristles=Math.max(1,Math.round(d)),this.samples=Math.max(2,Math.round(h)),this.sides=Math.max(3,Math.round(v)),this.capacity=this.strokes*this.bristles,this.group=new r,this.group.name=w??`BrushStroke`,this.group.matrixAutoUpdate=!1,o?.add(this.group);let E=this.samples+1,D=E*this.sides,O=new Float32Array(D*3);for(let e=0;e<E;e++){let t=e/this.samples;for(let n=0;n<this.sides;n++){let r=(e*this.sides+n)*3;O[r+0]=t,O[r+1]=n/this.sides,O[r+2]=0}}let k=new Uint16Array(this.samples*this.sides*6),A=0;for(let e=0;e<this.samples;e++)for(let t=0;t<this.sides;t++){let n=(t+1)%this.sides,r=e*this.sides+t,i=e*this.sides+n,a=(e+1)*this.sides+t,o=(e+1)*this.sides+n;k[A++]=r,k[A++]=a,k[A++]=i,k[A++]=i,k[A++]=a,k[A++]=o}this._p0=new a(new Float32Array(this.capacity*3),3),this._p1=new a(new Float32Array(this.capacity*3),3),this._p2=new a(new Float32Array(this.capacity*3),3),this._p3=new a(new Float32Array(this.capacity*3),3),this._press=new a(new Float32Array(this.capacity*4),4),this._stroke=new a(new Float32Array(this.capacity*4),4),this._brushAttr=new a(new Float32Array(this.capacity*4),4);let j=new e;j.setAttribute(`position`,new l(O,3)),j.setAttribute(`aP0`,this._p0),j.setAttribute(`aP1`,this._p1),j.setAttribute(`aP2`,this._p2),j.setAttribute(`aP3`,this._p3),j.setAttribute(`aPress`,this._press),j.setAttribute(`aStroke`,this._stroke),j.setAttribute(`aBrush`,this._brushAttr),j.setIndex(new l(k,1)),j.instanceCount=0,j.boundingSphere=new n(new u,1e4),this.geometry=j,this.material=new t({transparent:!0,depthWrite:b,depthTest:!0,blending:1,side:2,toneMapped:!0,uniforms:i({uPaper:{value:new u(0,1,0)},uWidth:{value:.34},uDepth:{value:.035},uFerruleDepth:{value:0},uBristles:{value:this.bristles},uBristleWidth:{value:1.7},uSplay:{value:.18},uWobble:{value:.012},uFibreScale:{value:2.4},uFlowLength:{value:.65},uFlowDwell:{value:.35},uSpeedRef:{value:12},uEdgeStarve:{value:.55},uLoadJitter:{value:.35},uDryBand:{value:2.6},uDryThin:{value:.55},uSkipScale:{value:3.4},uSkipSoft:{value:.12},uSkipContrast:{value:1.8},uPoolSwell:{value:.45},uPoolCurve:{value:.35},uPigment:{value:1},uProgress:{value:1},uHeadTaper:{value:.05},uWetLength:{value:.9},uBleed:{value:.22},uFibreEdge:{value:.16},uDryPigment:{value:.7},uWetGain:{value:.3},uOpacity:{value:1},uFade:{value:1},uLit:{value:.35},uBackLit:{value:.72},uCeiling:{value:.62},uSoftFade:{value:.12},uColorA:{value:new f(`#b6a893`)},uColorB:{value:new f(`#544a41`)},uColorC:{value:new f(`#1b1815`)},uColorD:{value:new f(`#070605`)},uTint:{value:.04},uTintDensity:{value:.82},uTintJitter:{value:.08}}),vertexShader:g,fragmentShader:_}),this.mesh=new p(j,this.material),this.mesh.name=`${this.group.name}:mesh`,this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1,this.mesh.layers.set(x),this.mesh.renderOrder=S,this.mesh.visible=!1,this.group.add(this.mesh),this._strokes=[];for(let e=0;e<this.strokes;e++)this._strokes.push(new C(this,e));this._liveStrokes=this.strokes,this._liveInstances=0,this._paper=new u(0,1,0),this._tip=y,this.seed=0,this._p=T(),this.roll(0),this.retip(y)}get object3D(){return this.group}get uniforms(){return this.material.uniforms}get drawCalls(){return 1}get count(){return this._liveInstances}get strokeCount(){return this._liveStrokes}get tip(){return this._tip}setStrokeCount(e){return this._liveStrokes=Math.max(0,Math.min(this.strokes,Math.round(e))),this}stroke(e){return this._strokes[Math.max(0,Math.min(this.strokes-1,e|0))]}setPaper(e){return this._paper.copy(e),this._paper.lengthSq()<1e-8&&this._paper.set(0,1,0),this._paper.normalize(),this.material.uniforms.uPaper.value.copy(this._paper),this}setColors(e,t,n,r){let i=this.material.uniforms;i.uColorA.value.copy(typeof e==`string`?o(e):e),i.uColorB.value.copy(typeof t==`string`?o(t):t),i.uColorC.value.copy(typeof n==`string`?o(n):n);let a=r??n;return i.uColorD.value.copy(typeof a==`string`?o(a):a),this}roll(e=Math.random()*100){this.seed=e;let t=this._brushAttr.array;for(let e=0;e<this.capacity;e++)t[e*4+2]=Math.random(),t[e*4+3]=Math.random();this._brushAttr.needsUpdate=!0;for(let t=0;t<this.strokes;t++)this._strokes[t].seed=(e*.6180339887+t*.7548776662)%1*100;return this}retip(e){this._tip=e;let t=this._brushAttr.array,n=this.bristles;for(let r=0;r<n;r++){let i,a=0;if(e===m.ROUND){let e=Math.sqrt((r+.5)/n),t=r*2.399963229728653;i=e*Math.cos(t),a=e*Math.sin(t)}else if(e===m.SPLIT){let e=Math.max(1,Math.ceil(n/3)),t=Math.min(2,Math.floor(r/e)),a=e>1?(r%e/(e-1)-.5)*2:0;i=((t+.5)/3-.5)*2+.42/3*a}else i=n>1?((r+.5)/n-.5)*2:0;for(let e=0;e<this.strokes;e++){let o=e*n+r;t[o*4+0]=i,t[o*4+1]=a}}return this._brushAttr.needsUpdate=!0,this}reset(){this._liveInstances=0,this._liveStrokes=this.strokes,this.geometry.instanceCount=0,this.mesh.visible=!1;for(let e=0;e<this.strokes;e++){let t=this._strokes[e];t.active=!0,t.p0.set(0,0,0),t.p1.set(0,0,0),t.p2.set(0,0,0),t.p3.set(0,0,0),t.timing(0,1)}return this}_resolve(e){let t=this._p;for(let n in E){let r=e[n];t[n]=r===void 0?E[n]:r}return t}update(e,t){let n=this._resolve(t??E),r=this.material.uniforms,i=this.bristles,a=0;for(let e=0;e<this._liveStrokes;e++){let t=this._strokes[e],r=e*i,o=!t.active;for(let e=0;e<i;e++){let i=r+e,a=i*3,s=i*4;this._p0.array[a+0]=t.p0.x,this._p0.array[a+1]=t.p0.y,this._p0.array[a+2]=t.p0.z,this._p1.array[a+0]=t.p1.x,this._p1.array[a+1]=t.p1.y,this._p1.array[a+2]=t.p1.z,this._p2.array[a+0]=t.p2.x,this._p2.array[a+1]=t.p2.y,this._p2.array[a+2]=t.p2.z,this._p3.array[a+0]=t.p3.x,this._p3.array[a+1]=t.p3.y,this._p3.array[a+2]=t.p3.z,this._press.array[s+0]=t.pressEntry,this._press.array[s+1]=t.pressSwell,this._press.array[s+2]=t.pressHold,this._press.array[s+3]=t.pressExit,this._stroke.array[s+0]=o?1e4:t.drawStart,this._stroke.array[s+1]=Math.max(t.drawSpan,1e-4),this._stroke.array[s+2]=t.seed,this._stroke.array[s+3]=t.load*n.inkLoad}o||(a=r+i)}this._p0.needsUpdate=!0,this._p1.needsUpdate=!0,this._p2.needsUpdate=!0,this._p3.needsUpdate=!0,this._press.needsUpdate=!0,this._stroke.needsUpdate=!0,this._liveInstances=a,this.geometry.instanceCount=a,this.mesh.visible=a>0&&n.opacity>0&&n.fade>0&&n.width>0,r.uWidth.value=n.width,r.uDepth.value=n.depth,r.uFerruleDepth.value=n.ferruleDepth,r.uBristles.value=this.bristles,r.uBristleWidth.value=n.bristleWidth,r.uSplay.value=n.splay,r.uWobble.value=n.wobble,r.uFibreScale.value=n.fibreScale,r.uFlowLength.value=n.flowLength,r.uFlowDwell.value=n.flowDwell,r.uSpeedRef.value=n.speedRef,r.uEdgeStarve.value=n.edgeStarve,r.uLoadJitter.value=n.loadJitter,r.uDryBand.value=n.dryBand,r.uDryThin.value=n.dryThin,r.uSkipScale.value=n.skipScale,r.uSkipSoft.value=n.skipSoft,r.uSkipContrast.value=n.skipContrast,r.uPoolSwell.value=n.poolSwell,r.uPoolCurve.value=n.poolCurve,r.uPigment.value=n.pigment,r.uProgress.value=n.progress,r.uHeadTaper.value=n.headTaper,r.uWetLength.value=n.wetLength,r.uBleed.value=n.bleed,r.uFibreEdge.value=n.fibreEdge,r.uDryPigment.value=n.dryPigment,r.uWetGain.value=n.wetGain,r.uOpacity.value=n.opacity,r.uFade.value=n.fade,r.uLit.value=n.lit,r.uBackLit.value=n.backLit,r.uCeiling.value=n.ceiling,r.uSoftFade.value=n.softFade,r.uTint.value=n.tint,r.uTintDensity.value=n.tintDensity,r.uTintJitter.value=n.tintJitter,this.setColors(n.colorWash,n.colorBody,n.colorInk,n.colorPool),n.paper&&this.setPaper(n.paper)}pointAt(e,t,n){let r=this.stroke(e),i=1-t;return n.set(0,0,0),n.addScaledVector(r.p0,i*i*i),n.addScaledVector(r.p1,3*i*i*t),n.addScaledVector(r.p2,3*i*t*t),n.addScaledVector(r.p3,t*t*t),n}tangentAt(e,t,n){let r=this.stroke(e),i=1-t;return n.set(0,0,0),x.copy(r.p1).sub(r.p0),n.addScaledVector(x,3*i*i),x.copy(r.p2).sub(r.p1),n.addScaledVector(x,6*i*t),x.copy(r.p3).sub(r.p2),n.addScaledVector(x,3*t*t),n.lengthSq()<1e-10&&n.set(0,0,1),n.normalize()}headOf(e){return this.stroke(e).head}tipPoint(e,t){return this.pointAt(e,this.headOf(e),t)}pressureOf(e,t){let n=this.stroke(e),r=1-t;return r*r*r*n.pressEntry+3*r*r*t*n.pressSwell+3*r*t*t*n.pressHold+t*t*t*n.pressExit}widthAt(e,t){return Math.max(0,this.pressureOf(e,t))*this._p.width}dispose(){this.geometry.dispose(),this.material.dispose(),this.group.parent?.remove(this.group)}};function T(){return{width:.34,depth:.035,ferruleDepth:0,bristleWidth:1.7,splay:.18,wobble:.012,fibreScale:2.4,paper:null,inkLoad:1,flowLength:.65,flowDwell:.35,speedRef:12,edgeStarve:.55,loadJitter:.35,dryBand:2.6,dryThin:.55,skipScale:3.4,skipSoft:.12,skipContrast:1.8,poolSwell:.45,poolCurve:.35,pigment:1,progress:1,headTaper:.05,wetLength:.9,bleed:.22,fibreEdge:.16,dryPigment:.7,wetGain:.3,opacity:1,fade:1,lit:.35,backLit:.72,ceiling:.62,softFade:.12,tint:.04,tintDensity:.82,tintJitter:.08,colorWash:`#b6a893`,colorBody:`#544a41`,colorInk:`#1b1815`,colorPool:`#070605`}}var E=T();export{m as n,T as r,w as t};
//# sourceMappingURL=BrushStroke-CQvSyGcE.js.map