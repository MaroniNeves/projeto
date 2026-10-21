import{Br as e,G as t,Gr as n,K as r,Qt as i,R as a,Rt as o,Tn as s,V as c,X as l,Y as u,_t as d,at as f,ct as p,di as m,en as h,jn as g,o as _,ot as v,q as y,st as b,tt as x,vt as ee,xt as S,y as C,yn as w,zn as T}from"./settings-DdywqLlV.js";import{t as E}from"./ParticleSystem-BZTczMT8.js";import{n as D}from"./ParticleEngine-DLxipNH0.js";import{n as O}from"./GroundDecals-kYmr8HKl.js";import{n as k,t as te}from"./Ability-CYesB5Ur.js";function ne(e){let n=new s({color:16777215,roughness:.94,metalness:0,flatShading:!0}),r={uTime:t.uTime,uColorRock:{value:new S},uColorChar:{value:new S},uColorCrack:{value:new S},uColorHot:{value:new S},uCrackScale:{value:2.4},uCrackWidth:{value:.1},uCrackBranches:{value:.65},uCrackGlow:{value:3.2},uFlow:{value:.7},uFlowSpeed:{value:.9},uRockScale:{value:3.4},uFacetTint:{value:.35},uCavity:{value:.45},uSoot:{value:.8},uRimHeat:{value:1.1},uLead:{value:1.6},uLeadSharp:{value:2.6},uHeading:{value:new m(0,0,1)},uCharge:{value:0},uGlow:{value:1}};return e.registerShadowCasterWithPatch(n,e=>{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
         attribute float aSeed;
         attribute float aHeat;
         varying vec3  vRockLocal;
         varying vec3  vRockNormalW;
         varying float vRockSeed;
         varying float vRockHeat;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
         vRockLocal = transformed;
         vRockSeed = aSeed;
         vRockHeat = aHeat;
         #ifdef USE_INSTANCING
           vRockNormalW = normalize(mat3(modelMatrix) * (instanceMatrix * vec4(objectNormal, 0.0)).xyz);
         #else
           vRockNormalW = normalize(mat3(modelMatrix) * objectNormal);
         #endif`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
         uniform float uTime;
         uniform vec3  uColorRock;
         uniform vec3  uColorChar;
         uniform vec3  uColorCrack;
         uniform vec3  uColorHot;
         uniform float uCrackScale;
         uniform float uCrackWidth;
         uniform float uCrackBranches;
         uniform float uCrackGlow;
         uniform float uFlow;
         uniform float uFlowSpeed;
         uniform float uRockScale;
         uniform float uFacetTint;
         uniform float uCavity;
         uniform float uSoot;
         uniform float uRimHeat;
         uniform float uLead;
         uniform float uLeadSharp;
         uniform vec3  uHeading;
         uniform float uCharge;
         uniform float uGlow;
         varying vec3  vRockLocal;
         varying vec3  vRockNormalW;
         varying float vRockSeed;
         varying float vRockHeat;
         ${u}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
         {
           vec3  N   = normalize(normal);
           float ndv = clamp(dot(N, normalize(vViewPosition)), 0.0, 1.0);
           float rim = pow(1.0 - ndv, 2.2);

           /*
            * The seam, as a cross-section rather than as a line.
            *
            * "distance" is how far this fragment is from the nearest zero
            * crossing of the crack field, and the three bands cut out of it are
            * what make the crack read as a *split in stone* instead of a bright
            * worm painted over it:
            *
            *   fissure — the open gap. There is no rock here, so the albedo is
            *             killed and only the magma below shows.
            *   lip     — a much wider charred band either side of it. A crack is
            *             a shadow first and a light second; without this the
            *             glow just sits on top of the surface.
            *   core    — the middle of the gap, the only part hot enough to run
            *             white.
            *
            * Local space throughout, so the whole network is welded to the rock
            * and tumbles with it.
            */
           vec3  p  = vRockLocal * uCrackScale + vRockSeed * 19.0;
           float f1 = fbm3(p);
           float f2 = fbm3(p * 2.7 + 11.3);

           // The charge prises the seams open as the meteor heats up.
           float width = max(0.004, uCrackWidth * (1.0 + uCharge * 0.8));
           float distance = min(abs(f1), abs(f2) / max(uCrackBranches, 0.05));

           float fissure = 1.0 - smoothstep(width * 0.35, width, distance);
           float lip     = 1.0 - smoothstep(width, width * 2.0, distance);
           float core    = 1.0 - smoothstep(0.0, width * 0.45, distance);

           // Magma is not static: brightness crawls along the inside of a seam.
           float pulse = snoise(vRockLocal * 4.0 + vec3(0.0, uTime * uFlowSpeed, 0.0) + vRockSeed * 7.0);
           float flow  = mix(1.0, 0.45 + 0.75 * (pulse * 0.5 + 0.5), uFlow);

           /* --- the rock itself --- */
           float mottle = fbm3(vRockLocal * uRockScale + vRockSeed * 31.0) * 0.5 + 0.5;
           vec3  rock   = mix(uColorRock, uColorChar, smoothstep(0.3, 0.85, mottle));

           // Per-facet value break-up. The geometric normal in *object* space is
           // constant across a triangle, so hashing it gives every flat face its
           // own shade — the thing that separates cut stone from a noise-painted
           // ball, and it costs two derivatives.
           vec3  faceN = normalize(cross(dFdx(vRockLocal), dFdy(vRockLocal)));
           float facet = hash13(faceN * 37.0 + vRockSeed + 0.5);
           rock *= 1.0 + (facet - 0.5) * uFacetTint;

           // Cheap curvature occlusion: craters and cut faces sit closer to the
           // centre than the lumps do, so radius doubles as a cavity term.
           float cavity = smoothstep(0.55, 1.0, length(vRockLocal));
           rock *= mix(1.0 - uCavity, 1.0, cavity);

           // Charred around every seam, and gone entirely inside one.
           rock = mix(rock, uColorChar, lip * uSoot);
           rock *= 1.0 - fissure * 0.92;

           // Hard lighting contrast across the facets, so the silhouette reads
           // as a bundle of planes rather than one smooth mass.
           rock *= mix(0.55, 1.15, ndv);
           diffuseColor.rgb *= rock;

           /* --- what is burning --- */
           // The gap is the only thing that emits, and only its middle runs
           // white. Everything else is rock.
           float heat = fissure * flow * vRockHeat;
           vec3  glow = mix(uColorCrack, uColorHot, core * core) * heat * uCrackGlow;

           // A sheath of heat around the silhouette, and the compression heat on
           // the leading facets. Both are squared against the charge: at launch
           // this is a cold rock with lit cracks, and it is only on the way down
           // that the whole thing starts to burn.
           float charge2 = uCharge * uCharge;
           glow += uColorCrack * rim * uRimHeat * vRockHeat * charge2;

           float lead = pow(clamp(dot(normalize(vRockNormalW), uHeading), 0.0, 1.0), uLeadSharp);
           glow += uColorHot * lead * uLead * vRockHeat * charge2;

           glow *= uGlow;

           // The same soft ceiling the ice uses: these terms are independent and
           // stack, and without it a seam crossing the rim sums past 10 and the
           // bloom pass smears the whole rock into a white blob.
           glow /= 1.0 + glow * 0.22;

           totalEmissiveRadiance += glow;
         }`)}),n.userData.uniforms=r,n.userData.sync=(e=0,t=null)=>{let i=_.meteor,o=_.global;r.uColorRock.value.copy(a(i.colorRock)),r.uColorChar.value.copy(a(i.colorChar)),r.uColorCrack.value.copy(a(i.colorCrack)),r.uColorHot.value.copy(a(i.colorHot)),r.uCrackScale.value=i.crackScale*o.noiseFrequency,r.uCrackWidth.value=i.crackWidth,r.uCrackBranches.value=i.crackBranches,r.uCrackGlow.value=i.crackGlow*o.shaderIntensity,r.uFlow.value=i.crackFlow,r.uFlowSpeed.value=i.crackFlowSpeed*o.noiseSpeed,r.uRockScale.value=i.rockScale*o.noiseFrequency,r.uFacetTint.value=i.facetTint*o.randomness,r.uCavity.value=i.cavity,r.uSoot.value=i.soot,r.uRimHeat.value=i.rimHeat*o.fresnel,r.uLead.value=i.leadGlow,r.uLeadSharp.value=i.leadSharp,r.uCharge.value=e,r.uGlow.value=i.glow*o.glow,t&&r.uHeading.value.copy(t),n.envMapIntensity=i.envIntensity},n.userData.sync(),n}var re=1.55;function ie(){return re*(1+_.meteor.trailBulge)*1.3}var A=`
  uniform float uWakeSpread;
  float flameProfile(float u) {
    return (0.34 + 0.66 * pow(u, 0.55)) * (1.0 + uWakeSpread * pow(1.0 - u, 1.8));
  }
`,ae=class extends e{constructor(){super({transparent:!0,depthWrite:!1,depthTest:!1,blending:5,blendEquation:100,blendSrc:201,blendDst:205,blendSrcAlpha:201,blendDstAlpha:205,side:2,toneMapped:!1,uniforms:r({uRadius:{value:.95},uHeadSize:{value:2.1},uPlume:{value:1.8},uWakeSpread:{value:1.1},uStreamLength:{value:6},uArcLength:{value:7},uTailPad:{value:.3},uDetachment:{value:.5},uSoftness:{value:.45},uShred:{value:1.35},uBulge:{value:.28},uBulgeScale:{value:.5},uFlow:{value:2.4},uBuoyancy:{value:2.6},uSwirl:{value:.45},uSwirlSpeed:{value:.9},uVortex:{value:1.15},uRingFreq:{value:.55},uRingSpeed:{value:1.6},uNoiseFrequency:{value:3.2},uNoiseStrength:{value:.9},uWarp:{value:.2},uTongue:{value:.5},uStreamStretch:{value:.3},uWisp:{value:0},uFlicker:{value:.45},uLick:{value:3.2},uOctaves:{value:5},uTempCore:{value:3500},uTempEdge:{value:1550},uEmissionCurve:{value:2.6},uHeatFocus:{value:1},uHeatFalloff:{value:1.15},uHeatFollow:{value:.2},uTailHeat:{value:.5},uPalette:{value:0},uScatter:{value:.9},uScatterFalloff:{value:2.2},uDensity:{value:1.35},uSoot:{value:1.5},uCoreClarity:{value:.62},uEmission:{value:6.5},uOpacity:{value:1},uSteps:{value:44},uSeed:{value:Math.random()*20},uHeadFade:{value:0},uTailFade:{value:.1},uColorCore:{value:new S(1,.96,.82)},uColorMid:{value:new S(1,.69,.18)},uColorEdge:{value:new S(1,.24,.06)},uColorSmoke:{value:new S(.14,.1,.09)}}),vertexShader:`
        uniform float uArcLength;
        uniform float uTailPad;
        uniform float uStreamLength;
        uniform float uRadius;
        uniform float uHeadSize;

        attribute float aDist;
        attribute float aRandom;
        attribute vec3  aCenter;
        attribute vec3  aTangent;

        varying vec3  vCenter;
        varying vec3  vTangent;
        varying float vS;
        varying float vRadius;
        varying vec3  vWorld;
        varying float vRandom;

        ${A}

        void main() {
          vCenter = aCenter;
          vTangent = normalize(aTangent);
          // Metres from the tail of the *stream* (the hull is padded at both
          // ends so its end caps are covered).
          vS = aDist * uArcLength - uTailPad;
          vRandom = aRandom;

          // Local tube radius, so the fragment can size its march window to the
          // flame in front of it instead of to the fattest part of the stream —
          // the thin tail gets fine steps rather than mostly empty ones.
          float u = clamp(vS / max(uStreamLength, 0.01), 0.0, 1.0);
          vRadius = uRadius * flameProfile(u)
                  * (1.0 + (uHeadSize - 1.0) * smoothstep(0.62, 1.0, u));

          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,fragmentShader:`
        uniform float uTime;
        uniform float uRadius;
        uniform float uHeadSize;
        uniform float uPlume;
        uniform float uStreamLength;
        uniform float uDetachment;
        uniform float uSoftness;
        uniform float uShred;
        uniform float uBulge;
        uniform float uBulgeScale;
        uniform float uFlow;
        uniform float uBuoyancy;
        uniform float uSwirl;
        uniform float uSwirlSpeed;
        uniform float uVortex;
        uniform float uRingFreq;
        uniform float uRingSpeed;
        uniform float uNoiseFrequency;
        uniform float uNoiseStrength;
        uniform float uWarp;
        uniform float uTongue;
        uniform float uStreamStretch;
        uniform float uWisp;
        uniform float uFlicker;
        uniform float uLick;
        uniform float uOctaves;
        uniform float uTempCore;
        uniform float uTempEdge;
        uniform float uEmissionCurve;
        uniform float uHeatFocus;
        uniform float uHeatFalloff;
        uniform float uHeatFollow;
        uniform float uTailHeat;
        uniform float uPalette;
        uniform float uScatter;
        uniform float uScatterFalloff;
        uniform float uDensity;
        uniform float uSoot;
        uniform float uCoreClarity;
        uniform float uEmission;
        uniform float uOpacity;
        uniform float uSteps;
        uniform float uSeed;
        uniform float uHeadFade;
        uniform float uTailFade;
        uniform vec3  uColorCore;
        uniform vec3  uColorMid;
        uniform vec3  uColorEdge;
        uniform vec3  uColorSmoke;
        uniform float uShaderIntensity;
        uniform float uGlobalGlow;
        uniform vec2  uResolution;
        uniform sampler2D uSceneDepth;
        uniform float uCameraNear;
        uniform float uCameraFar;

        varying vec3  vCenter;
        varying vec3  vTangent;
        varying float vS;
        varying float vRadius;
        varying vec3  vWorld;
        varying float vRandom;

        ${u}
        ${y}
        ${A}

        /* Where the fringe shred starts and stops. REACH_HI bounds how far
           outside the nominal tube the noise can push density, and therefore how
           wide the proxy hull has to be — it is mirrored by FIRE_SHRED_REACH on
           the JS side. */
        const float REACH_LO = 1.15;
        const float REACH_HI = 1.55;

        /* A volume march needs a *cheap* field: this is trilinear value noise on
           a hashed lattice, roughly a third of the cost of the simplex noise the
           surface shaders use, and indistinguishable once five octaves of it are
           being advected, warped and rolled. */
        float vnoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash13(i);
          float b = hash13(i + vec3(1.0, 0.0, 0.0));
          float c = hash13(i + vec3(0.0, 1.0, 0.0));
          float d = hash13(i + vec3(1.0, 1.0, 0.0));
          float e = hash13(i + vec3(0.0, 0.0, 1.0));
          float g = hash13(i + vec3(1.0, 0.0, 1.0));
          float h = hash13(i + vec3(0.0, 1.0, 1.0));
          float k = hash13(i + vec3(1.0, 1.0, 1.0));

          return mix(
            mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
            mix(mix(e, g, f.x), mix(h, k, f.x), f.y),
            f.z
          );
        }

        /* Unit-determinant rotation applied between octaves. Value noise is
           built on an axis-aligned lattice, so stacking octaves along the same
           axes lines their features up into a visible grid; rotating the domain
           between them scatters that structure. */
        const mat3 OCTAVE_ROT = mat3(
           0.00,  0.80,  0.60,
          -0.80,  0.36, -0.48,
          -0.60, -0.48,  0.64
        );

        /**
         * Turbulent flame field, normalised to 0..1.
         *
         * Three things separate this from a plain fbm, and two of them are free —
         * they reuse octave values that have already been paid for:
         *
         *  - *progressive domain warping*: each octave is displaced by the one
         *    before it, which folds the field over itself. Straight fbm gives
         *    round, cloud-like blobs; warped fbm gives the curling, billowing
         *    sheets fire actually makes.
         *  - *buoyant shear*: every octave also drifts upward faster than the
         *    last, so fine detail outruns the coarse shapes it sits on and the
         *    structures tear into upward-licking tongues.
         *  - *inter-octave rotation*: see OCTAVE_ROT.
         *
         * @param ridge out — sharp ridged filaments from the two finest octaves,
         *              0..1, used to shred the fringe into strands.
         * @param coarse out — the field truncated to its two largest scales,
         *              0..1. Temperature is read off *this* rather than off the
         *              full field; see the note where it is used.
         */
        float flameFbm(vec3 p, float rise, out float ridge, out float coarse) {
          float v = 0.0;
          float a = 0.5;
          float norm = 0.0;
          float scale = 1.0;
          ridge = 0.0;
          coarse = 0.5;

          for (int i = 0; i < 5; i++) {
            if (float(i) >= uOctaves) break;

            float n = vnoise(p);
            v += a * n;
            norm += a;
            if (i == 1) coarse = v / norm;
            // Ridges come from the finest octaves alone. Averaging the coarse
            // octaves in as well produces broad, smooth ridges that trace the
            // iso-lines of the field, and those read as contour lines drawn on
            // the flame rather than as strands in it.
            if (i >= 3) ridge = max(ridge, 1.0 - abs(n * 2.0 - 1.0));

            p = OCTAVE_ROT * p * 2.17 + (n - 0.5) * uWarp * vec3(1.7, 0.9, 1.3);
            scale *= 2.17;
            p.y -= rise * scale * (1.0 + 0.6 * float(i));
            a *= 0.55;
          }

          return v / max(norm, 1e-4);
        }

        /**
         * Planckian radiator, converted to the linear working space.
         *
         * Fire is not a palette, it is a temperature. The reason a real flame
         * runs deep red at its fringe, orange through its body and white in its
         * core is that those are the colours a grey body emits between roughly
         * 1200 K and 3300 K — and the reason the core blows out while the fringe
         * stays dim is that the power emitted scales as T^4. Both fall out of the
         * physics here instead of having to be dialled in by hand, which is why
         * the result holds together at any exposure.
         *
         * Fit: Tanner Helland's piecewise approximation, valid 1000-40000 K.
         */
        vec3 blackbody(float kelvin) {
          float t = clamp(kelvin, 1000.0, 12000.0) * 0.01;
          vec3 c;
          if (t <= 66.0) {
            c.r = 1.0;
            c.g = 0.3900816 * log(t) - 0.6318414;
            c.b = t <= 19.0 ? 0.0 : 0.5432068 * log(t - 10.0) - 1.1962540;
          } else {
            c.r = 1.2929362 * pow(t - 60.0, -0.1332047);
            c.g = 1.1298909 * pow(t - 60.0, -0.0755148);
            c.b = 1.0;
          }
          c = clamp(c, 0.0, 1.0);
          return c * c * (0.6 + 0.4 * c); // cheap, accurate-enough sRGB -> linear
        }

        /**
         * Density of the flame at a world point.
         *
         * @param heat out — normalised temperature, 0 at the perturbed surface,
         *             1 in the burning core.
         * @param bath out — how strongly this point is lit by the flame around
         *             it, for the single-scatter term.
         */
        float flameSample(vec3 p, out float heat, out float bath) {
          heat = 0.0;
          bath = 0.0;

          vec3 rel = p - vCenter;
          float ax = dot(rel, vTangent);
          vec3 perp = rel - vTangent * ax;

          float s = vS + ax;                                  // metres from the tail
          float u = clamp(s / max(uStreamLength, 0.01), 0.0, 1.0);
          float age = 1.0 - u;

          // Billowing wake behind a fireball at the nose.
          float radius = uRadius * flameProfile(u)
                       * (1.0 + (uHeadSize - 1.0) * smoothstep(0.62, 1.0, u));

          // A local frame whose "up" is world up (projected off the tangent), so
          // buoyancy, the teardrop stretch and the vertical elongation of the
          // noise all pull in the direction gravity actually cares about.
          vec3 upAxis = vec3(0.0, 1.0, 0.0) - vTangent * vTangent.y;
          float upLen = length(upAxis);
          upAxis = upLen > 1e-3 ? upAxis / upLen : vec3(1.0, 0.0, 0.0);
          vec3 sideAxis = cross(vTangent, upAxis);

          float py = dot(perp, upAxis);
          float px = dot(perp, sideAxis);

          // Buoyant stretch: mostly upward, so the cross-section is a teardrop
          // rather than a symmetric tube. The underside gets a quarter of it —
          // enough that the flame drapes instead of ending on a flat horizontal
          // cut, which is what an unstretched underside reads as.
          float plume = max(uPlume, 0.05);
          float shapedY = py > 0.0 ? py / plume : py / (1.0 + (plume - 1.0) * 0.25);
          float rad = length(vec2(px, shapedY));

          // Fold the axial overshoot past either end into the radius: a capsule,
          // so the stream ends in round caps instead of being sliced flat.
          float over = s - clamp(s, 0.0, uStreamLength);
          rad = sqrt(rad * rad + over * over);

          // Conservative reject *before* paying for any noise: even with the
          // bulge pushed fully outward the field cannot reach past this. Most
          // samples along most rays land here, so this test is what pays for the
          // headroom the hull needs.
          float qNominal = rad / max(radius, 1e-3);
          if (qNominal > REACH_HI * (1.0 + uBulge)) return 0.0;

          float sFlow = s - uTime * uFlow;                    // streams backwards

          // ---- 1. silhouette: metre-scale lobes -------------------------
          // One octave, wavelength of order the flame's own width. A fireball's
          // outline is dominated by lobes this size; turbulence at flame-detail
          // frequency can only nibble the edge of a capsule and the result still
          // reads as a shaded tube.
          float lobe = vnoise(vec3(px, py * 0.8, sFlow * 0.7) * uBulgeScale
                              + vec3(uSeed, uTime * 0.25, 0.0)) * 2.0 - 1.0;
          radius *= 1.0 + uBulge * lobe;

          float q = rad / max(radius, 1e-3);
          float edge = 1.0 - q;
          if (edge < -1.2) return 0.0;

          // ---- 2. vortex roll-up ----------------------------------------
          // Noise domain attached to the stream (a local frame around the axis)
          // so the fire is carried along instead of swimming through the world.
          vec2 rp = rot2(s * uSwirl * 0.3 + uTime * uSwirlSpeed + uSeed) * vec2(px, py);

          // Hot gas sheds ring vortices that travel back down the wake and grow
          // as they age. Rotating the domain in the (streamwise, vertical) plane
          // by that travelling wave folds the field over on itself — this is what
          // produces curling, mushrooming billows. Plain fbm, at any octave
          // count, makes clouds; it never makes curls. The rotation is strongest
          // on the axis and dies off outside the tube, so the fringe is sheared
          // past the core rather than rotating rigidly with it.
          float phase = s * uRingFreq - uTime * uRingSpeed + uSeed;
          float roll = uVortex * sin(phase * 6.2831853)
                     * smoothstep(0.0, 0.32, age) * exp(-q * q * 0.7);
          vec2 rolled = rot2(roll) * vec2(sFlow * uStreamStretch, rp.y * uTongue);

          // ---- 3. turbulence --------------------------------------------
          // Anisotropic on purpose: a lower frequency vertically and along the
          // flow draws every structure out into a tall, streamwise tongue.
          vec3 np = vec3(rp.x, rolled.y, rolled.x) * uNoiseFrequency;
          np.y -= uTime * uBuoyancy;                          // hot gas climbs

          // Radial shear. Gas at the fringe is unconfined and has been climbing
          // and falling behind for longer than gas on the axis, so the domain is
          // dragged upward and backward in proportion to how far out it sits.
          // This is what turns rounded blobs into the tongues that lick up off a
          // flame's edge: without a shear the structures are the same shape
          // everywhere and only their size changes.
          np.y -= uLick * q * q;
          np.z += uLick * 0.45 * q * q;

          float ridge, coarse;
          float n = flameFbm(np, uTime * uBuoyancy * 0.06, ridge, coarse) * 2.0 - 1.0;
          coarse = coarse * 2.0 - 1.0;

          // Filaments belong to the fringe. In the body they only mottle a core
          // that should read as one continuous sheet of burning gas.
          //
          // Note the sign: the ridge peaks *on* an iso-line of the noise, so
          // adding it thickens the iso-lines and the flame ends up drawn in
          // bright closed loops, like a contour map. Subtracting it instead
          // deepens the gaps between lobes, which is what actually separates the
          // fringe into strands.
          float fringe = smoothstep(0.3, 1.05, q);
          float turbulent = n * 0.75 + (0.5 - ridge) * uWisp * fringe;

          // ---- 4. shred --------------------------------------------------
          // The heart of the flame is barely touched by the noise while the
          // fringe is torn apart by it. That contrast — solid burning core, an
          // edge dissolving into wisps — is most of what reads as "fire".
          //
          // The falloff past REACH_LO is not cosmetic: it is what bounds how far
          // outside the nominal tube the noise can push density. Without it the
          // volume reaches well past the proxy hull and the flame is sliced off
          // along a visibly straight edge.
          // The coherent burning core belongs to the head. By the far end of the
          // wake the gas has been churning for the whole flight and there is no
          // quiet axis left, so the erosion floor climbs with age.
          float shred = mix(mix(0.26, 1.0, age), 1.8 * uShred, smoothstep(0.06, 1.05, q))
                      * (1.0 - smoothstep(REACH_LO, REACH_HI, q));
          // Turbulence is *fully developed* in the wake and still growing at the
          // head: the gas at the far end has had the whole flight to break up.
          // Without this the tail is the smoothest part of the volume, and a
          // smooth field marched with a hard density threshold renders its own
          // iso-surfaces as concentric shells — the flame ends up wearing
          // contour rings exactly where it should look most chaotic.
          float erosion = uNoiseStrength * shred * (1.0 + 1.3 * age);
          float field = edge + turbulent * erosion;
          field -= uDetachment * age * 0.55;                  // the tail tears into puffs

          // Temperature gets its own, deliberately blunter field, and the reason
          // is the single least obvious thing in this shader.
          //
          // Radiated power goes as a high power of temperature, so whatever
          // drives the temperature gets its contrast multiplied several-fold on
          // screen. Drive it from the full density field and that amplification
          // lands on the level sets of turbulent noise — which are nested closed
          // loops — and the flame comes out looking like polished agate: dense
          // parallel contour lines wrapping every blob. It is unmistakable once
          // seen and impossible to tune away from the colour end.
          //
          // So the contrast is carried by the capsule falloff, i.e. geometry: hot on the
          // axis, cooling outward, no level sets of its own. The noise only
          // *displaces* that profile — enough that a tongue stays hot along its
          // spine, not enough to draw itself. And it is the two coarsest octaves
          // that do the displacing, since a reaction zone is thick compared with
          // the smallest turbulent scales.
          // Deliberately not the age-amplified erosion the density uses: letting
          // the wake's extra churn into the temperature brings the agate straight
          // back, and only in the tail, which is the last place it is wanted.
          float heatField = edge + coarse * uHeatFollow * uNoiseStrength * shred
                          - uDetachment * age * 0.55;

          float d = smoothstep(0.0, clamp(uSoftness, 0.05, 1.0), field);
          if (d <= 0.0) return 0.0;

          d *= smoothstep(0.0, max(uTailFade, 0.01), u);
          d *= 1.0 - smoothstep(1.0 - uHeadFade, 1.0, u) * step(0.001, uHeadFade);

          // ---- temperature ------------------------------------------------
          // Follows the *perturbed* shape rather than the distance to the axis, so
          // a tongue the large eddies pushed outward stays hot along its own spine
          // and cools toward its own tip — the difference between filaments that
          // are burning and filaments that have been painted orange onto a
          // cylinder. Reading it off the density instead would clamp to 1 across
          // the whole core and flatten the flame into a single white blob.
          float interior = clamp(heatField * uHeatFocus, 0.0, 1.0);
          // Spent gas has mixed. It no longer has a hot axis and a cool skin —
          // it is all roughly one temperature, simply dimming. Flattening the
          // radial profile with age is also what keeps the thin tail from
          // rendering as a stack of nested rings: that is where the radial
          // gradient is steepest, so that is where equal steps of temperature
          // are packed closest together and the high radiance exponent turns
          // them into visible bands.
          interior = mix(interior, 0.55, age * age * 0.65);
          // ...and behind the head it has also had time to radiate away.
          float cool = mix(uTailHeat, 1.0, pow(u, 0.55));
          heat = clamp(pow(interior, max(uHeatFalloff, 0.05)) * cool, 0.0, 1.0);

          // Cool gas close to the burning core is bathed in its light.
          bath = exp(-max(q - 0.5, 0.0) * uScatterFalloff) * (1.0 - heat);

          return d * uDensity;
        }

        void main() {
          vec3 ro = cameraPosition;
          vec3 rd = normalize(vWorld - ro);

          // The hull is a camera-facing strip through the axis, so every pixel
          // gets exactly one fragment and that fragment has to march the whole
          // volume along its ray. Bounding it with a sphere is what the obvious
          // implementation does, and it is ruinous here: the flame is stretched
          // two-and-a-half times taller than it is wide, so a sphere big enough
          // to hold it is two-and-a-half times too long in the direction almost
          // every ray actually travels — the fixed step budget gets spread over
          // a slab that is mostly empty and the volume samples at a fraction of
          // the resolution it should.
          //
          // Bounding with the *ellipsoid* the volume actually occupies instead
          // costs one extra dot product and buys back that factor directly as
          // step density. Solve it as a unit sphere in the squashed frame.
          float reach = REACH_HI * (1.0 + uBulge);
          vec3 up = vec3(0.0, 1.0, 0.0) - vTangent * vTangent.y;
          float upLen = length(up);
          up = upLen > 1e-3 ? up / upLen : vec3(1.0, 0.0, 0.0);
          vec3 side = cross(vTangent, up);

          float rPerp = max(vRadius * reach, uRadius * 0.2);
          float rUp   = rPerp * max(uPlume, 1.0);
          float rDown = rPerp * (1.0 + (max(uPlume, 1.0) - 1.0) * 0.25);
          // The plume only stretches upward, so the bound is an ellipsoid lifted
          // off the axis rather than centred on it.
          float rVert = (rUp + rDown) * 0.5;
          vec3 origin = vCenter + up * (rUp - rDown) * 0.5;
          // Looking down the barrel of the stream, a ray stays inside the volume
          // for its whole length; broadside, it is through in one diameter.
          float axial = abs(dot(rd, vTangent));
          float rLong = mix(rPerp, max(uStreamLength * 0.6, rPerp), axial * axial);

          vec3 o = ro - origin;
          vec3 eo = vec3(dot(o, side) / rPerp, dot(o, up) / rVert, dot(o, vTangent) / rLong);
          vec3 ed = vec3(dot(rd, side) / rPerp, dot(rd, up) / rVert, dot(rd, vTangent) / rLong);
          float ea = dot(ed, ed);
          float eb = dot(eo, ed);
          float ec = dot(eo, eo) - 1.0;
          float disc = eb * eb - ea * ec;
          if (disc <= 0.0) discard;
          float esq = sqrt(disc);
          float maxRadius = rPerp;
          float t0 = max((-eb - esq) / ea, 0.02);
          float t1 = (-eb + esq) / ea;

          // Clip the march on the opaque scene: correct occlusion by the ground
          // and the character, for free.
          float dzdt = (viewMatrix * vec4(rd, 0.0)).z;
          float packed = unpackRGBAToDepth(texture2D(uSceneDepth, gl_FragCoord.xy / uResolution));
          float sceneViewZ = perspectiveDepthToViewZ(packed, uCameraNear, uCameraFar);
          float tScene = dzdt < -1e-5 ? sceneViewZ / dzdt : 1e6;
          t1 = min(t1, tScene);
          if (t1 <= t0) discard;

          float steps = clamp(uSteps, 6.0, 72.0);
          float baseStep = (t1 - t0) / steps;
          // Dither the entry point: a fixed start turns the slices into visible
          // onion rings, a per-pixel offset turns them into grain the bloom eats.
          float t = t0 + baseStep * hash13(vec3(gl_FragCoord.xy, fract(uTime) * 64.0));

          // One flicker value for the whole ray — the flame brightens and dims
          // as a body, not per sample. Two rates: a slow roll from the bulk of
          // the gas, a fast tremor from the burn itself.
          // Amplitude deliberately modest and clamped. This multiplies the whole
          // ray, so a swing wide enough to look dramatic on paper reads on screen
          // as the fireball guttering out for a frame at a time.
          float flickN = vnoise(vec3(uTime * 5.3, uSeed, 0.0)) * 0.7
                       + vnoise(vec3(uTime * 13.1, uSeed * 2.0, 5.0)) * 0.3;
          float flick = clamp(1.0 + uFlicker * 0.6 * (flickN * 2.0 - 1.0), 0.4, 1.7);

          vec3 acc = vec3(0.0);
          float transmittance = 1.0;
          // The hull has to be wide enough for the noise to push the volume out
          // to its full reach, which leaves most rays crossing a lot of empty
          // space. Coasting through it at a coarser stride — and dropping back
          // to the fine one the moment anything is hit — buys back the cost of
          // that headroom without thinning the samples where they matter.
          float stride = 1.0;

          for (int i = 0; i < 72; i++) {
            if (t >= t1 || transmittance < 0.012) break;

            float heat, bath;
            float d = flameSample(ro + rd * t, heat, bath);
            float stepSize = baseStep * stride;

            if (d > 0.002) {
              stride = 1.0;
              stepSize = baseStep;
              // Soften the contact with whatever the march ran into.
              d *= clamp((tScene - t) / max(maxRadius * 0.6, 1e-3), 0.0, 1.0);

              float kelvin = mix(uTempEdge, uTempCore, heat);
              // The palette blend keeps the editor's four colour stops meaningful
              // without letting them fight the physics: at 0 the flame is a pure
              // radiator, at 1 it is the hand-authored ramp.
              vec3 artistic = gradient4(uColorCore, uColorMid, uColorEdge, uColorSmoke,
                                        pow(1.0 - heat, 0.85));
              vec3 tint = mix(blackbody(kelvin), artistic, clamp(uPalette, 0.0, 1.0));

              // Stefan-Boltzmann. This single exponent is what gives the volume
              // its enormous internal dynamic range: a white-hot core forty times
              // brighter than the red gas two centimetres outside it.
              float power = pow(kelvin / max(uTempCore, 1.0), uEmissionCurve);
              vec3 emission = tint * power;

              // Single scatter: the sooty gas wrapped around the burn does not
              // radiate on its own, it reflects. Without this term the fringe
              // and the smoky underside collapse to flat black and the flame
              // loses the halo that sits between it and the smoke.
              emission += mix(uColorEdge, uColorMid, bath) * uScatter * bath * bath * 0.06;

              acc += emission * uEmission * flick * d * transmittance * stepSize;

              // Soot extinction: the cool fringe blocks the background hard, and
              // even the hot gas keeps enough of it to occlude its own far side,
              // which is what leaves visible structure in the fireball instead
              // of one integrated white disc.
              // Squared, so only the genuinely white-hot gas turns clear. Fading
              // the soot away linearly with temperature thins the merely warm
              // gas on the near face too, and that gas is exactly what draws the
              // dark filaments across a real fireball's bright interior.
              transmittance *= exp(-d * uSoot * mix(1.0, uCoreClarity, heat * heat) * stepSize);
            } else {
              stride = min(stride * 1.6, 2.2);
            }

            t += stepSize;
          }

          float alpha = clamp((1.0 - transmittance) * uOpacity, 0.0, 1.0);
          vec3 color = acc * uOpacity * uGlobalGlow * mix(0.65, 1.0, uShaderIntensity);
          if (alpha < 0.002 && max(color.r, max(color.g, color.b)) < 0.002) discard;

          gl_FragColor = vec4(color, alpha);
        }
      `})}sync(){let e=_.meteor,t=_.global,n=this.uniforms;n.uRadius.value=e.trailWidth,n.uHeadSize.value=e.trailHeadSize,n.uPlume.value=e.trailPlume,n.uWakeSpread.value=e.trailWakeSpread,n.uDetachment.value=e.trailDetachment,n.uSoftness.value=e.trailSoftness,n.uShred.value=e.trailShred,n.uBulge.value=e.trailBulge,n.uBulgeScale.value=e.trailBulgeScale,n.uFlow.value=e.trailSpeed*t.noiseSpeed,n.uBuoyancy.value=e.trailBuoyancy*t.noiseSpeed,n.uSwirl.value=e.trailCurl*t.turbulence,n.uSwirlSpeed.value=e.trailSpeed*.35*t.noiseSpeed,n.uVortex.value=e.trailVortex*t.turbulence,n.uRingFreq.value=e.trailRingFrequency,n.uRingSpeed.value=e.trailRingSpeed*t.noiseSpeed,n.uNoiseFrequency.value=e.trailNoiseFrequency*t.noiseFrequency,n.uNoiseStrength.value=.28*e.trailTurbulence*e.trailNoiseStrength*t.turbulence*t.noiseStrength,n.uWarp.value=e.trailWarp*t.turbulence,n.uTongue.value=e.trailTongue,n.uStreamStretch.value=e.trailStreamStretch,n.uWisp.value=e.trailWisps,n.uFlicker.value=e.trailFlicker,n.uLick.value=e.trailLick,n.uOctaves.value=e.trailOctaves,n.uTempCore.value=e.trailTempCore,n.uTempEdge.value=e.trailTempEdge,n.uEmissionCurve.value=e.trailEmissionCurve,n.uHeatFocus.value=e.trailHeatFocus,n.uHeatFalloff.value=e.trailHeatFalloff,n.uHeatFollow.value=e.trailHeatFollow,n.uTailHeat.value=e.trailTailHeat,n.uPalette.value=e.trailPalette,n.uScatter.value=e.trailScatter,n.uScatterFalloff.value=e.trailScatterFalloff,n.uDensity.value=e.trailDensity,n.uSoot.value=e.trailSoot,n.uCoreClarity.value=e.trailCoreClarity,n.uEmission.value=e.trailGlow*2.4,n.uOpacity.value=e.trailOpacity*t.opacity,n.uSteps.value=e.trailSteps,n.uTailFade.value=e.trailTailFade,n.uColorCore.value.copy(a(e.colorHot)),n.uColorMid.value.copy(a(e.colorFlameMid)),n.uColorEdge.value.copy(a(e.colorFlameEdge)),n.uColorSmoke.value.copy(a(e.colorFlameSmoke))}},j=new m,M=new m,N=new m,P=new m(0,1,0),F=new m,I=new m,L=Object.freeze({FLAT:`flat`,BILLBOARD:`billboard`,ORIENTED:`oriented`,UPRIGHT:`upright`}),R=class{constructor(e=128,{frame:t=!1}={}){this.maxSegments=e,this.hasFrame=t;let r=(e+1)*2;this.geometry=new ee,this.positions=new Float32Array(r*3),this.normals=new Float32Array(r*3),this.uvs=new Float32Array(r*2),this.dists=new Float32Array(r),this.sides=new Float32Array(r),this.randoms=new Float32Array(r),this.centers=t?new Float32Array(r*3):null,this.tangents=t?new Float32Array(r*3):null;for(let e=0;e<r;e++)this.sides[e]=e%2==0?-1:1,this.randoms[e]=Math.random();let i=new Uint16Array(e*6);for(let t=0;t<e;t++){let e=t*2;i.set([e,e+1,e+2,e+2,e+1,e+3],t*6)}this.geometry.setAttribute(`position`,new d(this.positions,3).setUsage(o)),this.geometry.setAttribute(`aNormal`,new d(this.normals,3).setUsage(o)),this.geometry.setAttribute(`uv`,new d(this.uvs,2).setUsage(o)),this.geometry.setAttribute(`aDist`,new d(this.dists,1).setUsage(o)),this.geometry.setAttribute(`aSide`,new d(this.sides,1)),this.geometry.setAttribute(`aRandom`,new d(this.randoms,1)),t&&(this.geometry.setAttribute(`aCenter`,new d(this.centers,3).setUsage(o)),this.geometry.setAttribute(`aTangent`,new d(this.tangents,3).setUsage(o))),this.geometry.setIndex(new d(i,1)),this.geometry.setDrawRange(0,0),this.geometry.boundingSphere=new n(new m,1e3),this.segmentCount=0}build(e,t){let n=Math.min(t.count??e.length,this.maxSegments+1);if(n<2)return this.segmentCount=0,this.geometry.setDrawRange(0,0),this;let{width:r=.5,mode:i=L.BILLBOARD,cameraPosition:a=null,normal:o=null,widthProfile:s=null,twist:c=0,twistPhase:l=0}=t,u=0;for(let t=1;t<n;t++)u+=e[t].distanceTo(e[t-1]);let d=u>1e-5?1/u:0,f=0;for(let t=0;t<n;t++){let u=e[t];t>0&&(f+=u.distanceTo(e[t-1]));let p=f*d;t===0?j.copy(e[1]).sub(e[0]):t===n-1?j.copy(e[n-1]).sub(e[n-2]):j.copy(e[t+1]).sub(e[t-1]),j.lengthSq()<1e-10&&j.set(0,0,1),j.normalize();let m=i===L.UPRIGHT;m?M.copy(P):i===L.FLAT?M.crossVectors(j,P):i===L.ORIENTED&&o?M.crossVectors(j,o):(N.copy(a??P).sub(u),M.crossVectors(j,N)),M.lengthSq()<1e-10&&M.set(1,0,0),M.normalize(),c!==0&&M.applyAxisAngle(j,c*p+l),I.crossVectors(j,M).normalize();let h=r*(s?s(p,t):1),g=m?0:-h*.5,_=m?h:h*.5,v=t*2;F.copy(u).addScaledVector(M,g),this.positions[v*3+0]=F.x,this.positions[v*3+1]=F.y,this.positions[v*3+2]=F.z,F.copy(u).addScaledVector(M,_),this.positions[(v+1)*3+0]=F.x,this.positions[(v+1)*3+1]=F.y,this.positions[(v+1)*3+2]=F.z;for(let e=0;e<2;e++)this.normals[(v+e)*3+0]=I.x,this.normals[(v+e)*3+1]=I.y,this.normals[(v+e)*3+2]=I.z;if(this.hasFrame)for(let e=0;e<2;e++){let t=(v+e)*3;this.centers[t+0]=u.x,this.centers[t+1]=u.y,this.centers[t+2]=u.z,this.tangents[t+0]=j.x,this.tangents[t+1]=j.y,this.tangents[t+2]=j.z}this.uvs[v*2+0]=p,this.uvs[v*2+1]=0,this.uvs[(v+1)*2+0]=p,this.uvs[(v+1)*2+1]=1,this.dists[v]=p,this.dists[v+1]=p}this.segmentCount=n-1;let p=n*2,{position:m,uv:h,aDist:g,aNormal:_,aCenter:v,aTangent:y}=this.geometry.attributes,b=[[m,3],[_,3],[h,2],[g,1]];this.hasFrame&&b.push([v,3],[y,3]);for(let[e,t]of b)e.needsUpdate=!0,e.clearUpdateRanges?.(),e.addUpdateRange?.(0,p*t);return this.geometry.setDrawRange(0,this.segmentCount*6),this}clear(){this.segmentCount=0,this.geometry.setDrawRange(0,0)}dispose(){this.geometry.dispose()}},z=28,B=29,oe=3,se=48,V=Math.PI*2;function H(e,t,n){return(.34+.66*e**.55)*(1+n*(1-e)**1.8)*(1+(t-1)*p(.62,1,e))}var U={},W=new m,G=new m,K=new m,q=new m,J=new m,Y=new m,X=new m,Z=new m,Q=new g,$=new T,ce=class extends te{constructor(e){super(`meteor`,e)}createShaders(){this.material=ne(this.ctx.environment),this._shapeKey=``,this.geometry=this._buildGeometry(),this.seeds=new i(new Float32Array(B),1),this.heats=new i(new Float32Array(B),1);for(let e=0;e<B;e++)this.seeds.array[e]=Math.random()*10;this.geometry.setAttribute(`aSeed`,this.seeds),this.geometry.setAttribute(`aHeat`,this.heats),this.rock=new h(this.geometry,this.material,B),this.rock.castShadow=!0,this.rock.receiveShadow=!0,this.rock.frustumCulled=!1,this.rock.count=0,this.rock.layers.set(c.WORLD),this.rock.renderOrder=2,this.group.add(this.rock),this.ribbon=new R(50,{frame:!0}),this.trailPoints=[];for(let e=0;e<=se;e++)this.trailPoints.push(new m);this.hullPoints=[];for(let e=0;e<=50;e++)this.hullPoints.push(new m);this.trailCount=0,this.trailMaterial=new ae,this.trailMesh=new w(this.ribbon.geometry,this.trailMaterial),this.trailMesh.frustumCulled=!1,this.trailMesh.matrixAutoUpdate=!1,this.trailMesh.layers.set(c.VFX),this.trailMesh.renderOrder=11,this.group.add(this.trailMesh),this.chunks=[];for(let e=0;e<z;e++)this.chunks.push({angle:0,elevation:0,speed:0,size:0,spin:0,spinAxis:new m(0,1,0)});this._chunkCount=0,this._used=0,this._seed=0,this._tumbleAxis=new m(0,1,0),this._lastU=0}_buildGeometry(){let e=_.meteor;return l({seed:11.7,detail:e.facets,lumpiness:e.lumpiness,noiseScale:e.lumpScale,roughness:e.surfaceRoughness,cuts:e.cuts,cutDepth:e.cutDepth,craters:e.craters,craterDepth:e.craterDepth,craterSize:e.craterSize})}_syncGeometry(){let e=_.meteor,t=[Math.round(e.facets),e.lumpiness.toFixed(3),e.lumpScale.toFixed(3),e.surfaceRoughness.toFixed(3),Math.round(e.cuts),e.cutDepth.toFixed(3),Math.round(e.craters),e.craterDepth.toFixed(3),e.craterSize.toFixed(3)].join(`|`);if(t===this._shapeKey)return;this._shapeKey=t;let n=this.geometry;this.geometry=this._buildGeometry(),this.geometry.setAttribute(`aSeed`,this.seeds),this.geometry.setAttribute(`aHeat`,this.heats),this.rock.geometry=this.geometry,n.dispose()}createParticles(){let e=this.ctx.particles;this.embers=e.get(`meteor.embers`,{capacity:4e3,shape:E.SOFT,additive:!0,curl:!0,softFade:.4}),this.embers.uniforms.uDrag.value=1.2,this.embers.uniforms.uEndSize.value=.06,this.embers.uniforms.uSizeIn.value=.05,this.embers.uniforms.uFadeIn.value=.05,this.embers.uniforms.uFadeOut.value=.3,this.sparks=e.get(`meteor.sparks`,{capacity:3e3,shape:E.STREAK,additive:!0,stretch:!0,softFade:.25}),this.sparks.uniforms.uDrag.value=.7,this.sparks.uniforms.uEndSize.value=.25,this.sparks.uniforms.uSizeIn.value=.02,this.sparks.uniforms.uFadeOut.value=.5,this.smoke=e.get(`meteor.smoke`,{capacity:2600,shape:E.SMOKE,additive:!1,curl:!0,softFade:1.2}),this.smoke.uniforms.uDrag.value=1.7,this.smoke.uniforms.uEndSize.value=3.6,this.smoke.uniforms.uSizeIn.value=.12,this.smoke.uniforms.uFadeIn.value=.18,this.smoke.uniforms.uFadeOut.value=.32,this.debris=e.get(`meteor.debris`,{capacity:1800,shape:E.CHIP,additive:!1,lit:!0,softFade:.25}),this.debris.uniforms.uDrag.value=.25,this.debris.uniforms.uEndSize.value=.85,this.debris.uniforms.uFadeOut.value=.72,this.emberEmitter=new D,this.sparkEmitter=new D,this.smokeEmitter=new D}get instanceCount(){return this._used}get impactDuration(){return Math.max(.2,_.meteor.lifetime*_.global.lifetime)}get fadeDuration(){return Math.max(.2,_.meteor.fadeTime)}lightShimmer(){let e=_.meteor,t=Math.max(.1,e.lightFlickerSpeed),n=Math.sin(this.age*t)*Math.sin(this.age*t*.37+1.7);return 1-b(e.lightFlicker)*(.5+.5*n)}_launchPoint(e){let t=_.meteor;return e.copy(this.origin).addScaledVector(this.direction,t.handForward).addScaledVector(this.side,t.handSide),e.y=t.handHeight,e}_arcPoint(e,t){let n=_.meteor,r=b(e);return t.copy(this.origin).addScaledVector(this.direction,f(n.handForward,this.length,r)).addScaledVector(this.side,n.handSide*(1-r)),t.y=f(n.handHeight,n.endHeight,r)+n.arc*Math.sin(r*Math.PI)**+Math.max(.05,n.arcCurve),t}_headingAt(e,t){let n=.01;return this._arcPoint(e+n,Y),this._arcPoint(e-n,X),t.subVectors(Y,X),t.lengthSq()<1e-8?t.copy(this.direction):t.normalize()}_radius(){return Math.max(.02,_.meteor.radius)}_charge(){let e=_.meteor;return this.phase===k.TRAVEL?b(this.u)**+Math.max(.05,e.chargeCurve):1}_chunkRadius(e,t){return Math.max(.01,this._radius()*t.chunkScale*f(.45,1.15,e.size))}_chunkDirection(e,t,n){let r=f(.12,1.4,e.elevation)*Math.max(0,t.chunkLoft),i=Math.cos(r);return n.set(0,Math.sin(r),0),n.addScaledVector(this.side,Math.cos(e.angle)*i),n.addScaledVector(this.direction,Math.sin(e.angle)*i+t.chunkForward),n.lengthSq()<1e-8&&n.set(0,1,0),n.normalize()}_chunkFlight(e,t,n,r){let i=t.chunkSpeed*f(.45,1.35,e.speed)*_.global.particleSpeed,a=Math.min(-.01,t.chunkGravity),o=this._chunkRadius(e,t)*.8;this._chunkDirection(e,t,G),this._arcPoint(1,J);let s=G.y*i,c=J.y,l=Math.max(0,s*s-2*a*(c-o)),u=(s+Math.sqrt(l))/-a,d=Math.min(n,u);return r.copy(J).addScaledVector(G,i*d),r.y=Math.max(o,c+s*d+.5*a*d*d),d}get _sinceImpact(){return this.phase===k.FADE?this.impactDuration+this.fadeTime:this.phase===k.IMPACT?this.impactTime:0}onSpawn(){this.emberEmitter.reset(),this.sparkEmitter.reset(),this.smokeEmitter.reset(),this._lastU=0,this._chunkCount=0,this._used=1,this._seed=Math.random()*100,this.trailMaterial.uniforms.uSeed.value=this._seed*.2,this.trailMaterial.uniforms.uHeadFade.value=0;let e=Math.acos(v(-1,1)),t=Math.random()*V,n=Math.sin(e);this._tumbleAxis.set(n*Math.cos(t),Math.cos(e),n*Math.sin(t));for(let e of this.chunks){e.angle=Math.random()*V,e.elevation=Math.random(),e.speed=Math.random(),e.size=Math.random(),e.spin=v(-1,1);let t=Math.acos(v(-1,1)),n=Math.random()*V,r=Math.sin(t);e.spinAxis.set(r*Math.cos(n),Math.cos(t),r*Math.sin(n))}this.rock.count=1,this._syncUniforms(0),this._updateRock(0),this._updateTrail(0),this._launchFx()}_syncUniforms(e){let t=_.meteor,n=_.global;this._syncGeometry();let r=this.phase===k.TRAVEL?this.u:1;this._headingAt(r,q),this.material.userData.sync(this._charge(),q),this.trailMaterial.sync();let i=this.trailMaterial.uniforms;i.uOpacity.value=f(t.trailOpacity*n.opacity,0,e),i.uHeadFade.value=e*.35,i.uDetachment.value=f(t.trailDetachment,1.1,e),this.embers.setGradient(a(t.colorEmberA),a(t.colorEmberB),a(t.colorEmberC),a(t.colorEmberD)),this.embers.uniforms.uGravity.value.set(0,t.emberRise,0),this.embers.uniforms.uSizeScale.value=t.emberSize*n.particleSize*7,this.embers.uniforms.uLifeScale.value=t.emberLifetime*.5*n.particleLifetime,this.embers.uniforms.uSpeedScale.value=n.particleSpeed,this.embers.uniforms.uOpacity.value=n.opacity,this.embers.uniforms.uGlow.value=t.emberGlow*n.glow,this.embers.uniforms.uTurbulence.value=t.emberTurbulence*n.turbulence,this.sparks.setGradient(a(t.colorSparkA),a(t.colorSparkB),a(t.colorSparkC),a(t.colorSparkD)),this.sparks.uniforms.uGravity.value.set(0,t.sparkGravity,0),this.sparks.uniforms.uSizeScale.value=t.sparkSize*n.particleSize*7,this.sparks.uniforms.uLifeScale.value=t.sparkLifetime*.5*n.particleLifetime,this.sparks.uniforms.uSpeedScale.value=n.particleSpeed,this.sparks.uniforms.uOpacity.value=n.opacity,this.sparks.uniforms.uGlow.value=t.emberGlow*.8*n.glow,this.sparks.uniforms.uStretch.value=t.sparkStretch,this.smoke.setGradient(a(t.colorSmokeA),a(t.colorSmokeB),a(t.colorSmokeC),a(t.colorSmokeD)),this.smoke.uniforms.uGravity.value.set(0,t.smokeRise,0),this.smoke.uniforms.uSizeScale.value=t.smokeSize*n.particleSize,this.smoke.uniforms.uLifeScale.value=t.smokeLifetime*.5*n.particleLifetime,this.smoke.uniforms.uSpeedScale.value=t.smokeSpeed*n.particleSpeed,this.smoke.uniforms.uOpacity.value=t.smokeOpacity*n.opacity,this.smoke.uniforms.uTurbulence.value=.45*n.turbulence,this.debris.setGradient(a(t.colorDebrisA),a(t.colorDebrisB),a(t.colorDebrisC),a(t.colorDebrisD)),this.debris.uniforms.uGravity.value.set(0,t.debrisGravity,0),this.debris.uniforms.uSizeScale.value=t.debrisSize*n.particleSize*7,this.debris.uniforms.uLifeScale.value=n.particleLifetime,this.debris.uniforms.uSpeedScale.value=n.particleSpeed,this.debris.uniforms.uOpacity.value=n.opacity}_updateRock(e){let t=_.meteor,n=this.phase===k.TRAVEL;n?(this._arcPoint(this.u,Q.position),Z.copy(this._tumbleAxis),$.setFromAxisAngle(Z,this.age*t.spin),Q.quaternion.copy($),Q.scale.setScalar(this._radius()),this.heats.array[0]=1):(Q.position.set(0,-999,0),Q.quaternion.identity(),Q.scale.setScalar(1e-4),this.heats.array[0]=0),Q.updateMatrix(),this.rock.setMatrixAt(0,Q.matrix);let r=this._sinceImpact,i=Math.max(.05,t.chunkCool);for(let n=0;n<this._chunkCount;n++){let a=this.chunks[n],o=this._chunkRadius(a,t),s=this._chunkFlight(a,t,r,W);e>0&&(W.y-=x.inCubic(e)*(o*2+.5)),Q.position.copy(W),Z.copy(a.spinAxis),$.setFromAxisAngle(Z,a.spin*t.chunkSpin*s),Q.quaternion.copy($),Q.scale.setScalar(o),Q.updateMatrix(),this.rock.setMatrixAt(1+n,Q.matrix),this.heats.array[1+n]=b(1-r/i)}this._used=n?1:1+this._chunkCount,this.rock.count=this._used,this.rock.instanceMatrix.needsUpdate=!0,this.heats.needsUpdate=!0}_updateTrail(e){let t=_.meteor,n=this.phase===k.TRAVEL?this.u:1,r=b(n-Math.max(.05,t.trailSpan)/Math.max(.1,this.length)*(1-e)),i=(n-r)*this.length>.06;if(this.trailMesh.visible=i,!i){this.ribbon.clear(),this.trailCount=0;return}for(let e=0;e<49;e++)this._arcPoint(f(r,n,e/48),this.trailPoints[e]);this.trailCount=49;let a=0;for(let e=1;e<49;e++)a+=this.trailPoints[e].distanceTo(this.trailPoints[e-1]);if(a<.001){this.trailMesh.visible=!1,this.ribbon.clear(),this.trailCount=0;return}let o=Math.max(.01,t.trailWidth)*(1-e*.65),s=t.trailHeadSize,c=t.trailWakeSpread,l=o*s,u=ie(),d=o*H(0,1,c)*u,p=l*u,m=this.hullPoints;this._headingAt(r,q),m[0].copy(this.trailPoints[0]).addScaledVector(q,-d);for(let e=0;e<49;e++){let n=1-e/48;m[e+1].copy(this.trailPoints[e]),m[e+1].y+=t.trailRise*n**1.5}m[0].y+=t.trailRise,this._headingAt(n,q),m[50].copy(this.trailPoints[48]).addScaledVector(q,p);let h=d+a+p,g=this.trailMaterial.uniforms;g.uRadius.value=o,g.uStreamLength.value=a,g.uArcLength.value=h,g.uTailPad.value=d;let v=1.08*u*Math.max(1,t.trailPlume);this.ribbon.build(m,{count:51,width:2*l*v,mode:L.BILLBOARD,cameraPosition:this.ctx.camera.position,widthProfile:e=>H(b((e*h-d)/a),s,c)/s})}_launchFx(){let e=_.meteor,n=_.global;this._launchPoint(W),e.muzzleSize>0&&this.ctx.bursts.spawn(C.FIRE,W,{radius:e.muzzleSize*.25,endRadius:e.muzzleSize*n.explosionIntensity,life:.4,intensity:e.muzzleIntensity,opacity:.85,fresnel:1.2,displace:.45,colorA:a(e.colorHot),colorB:a(e.colorFlameMid),colorC:a(e.colorFlameEdge)}),U.position=W,U.radius=.22,U.direction=G.copy(this.direction).multiplyScalar(.5).setY(.7).normalize(),U.speed=e.sparkSpeed*.9,U.speedVariance=.8,U.spread=.9,U.inherit=null,U.anchor=null,U.size=.16,U.sizeVariance=.7,U.life=e.sparkLifetime*.8,U.lifeVariance=.5,U.spin=0,U.tint=null,U.time=t.uTime.value,this.sparks.emit(Math.round(30*n.particleCount),U),this.ctx.flash.trigger(a(e.colorCastFlash),e.castFlash*n.explosionIntensity),this.lightBoost=e.lightIntensity*.6*n.explosionIntensity}_trailFx(e){let n=_.meteor,r=_.global,i=t.uTime.value,a=this._radius();this._headingAt(this.u,q),K.copy(q).multiplyScalar(-1);let o=Math.round(this.emberEmitter.tick(e,n.emberRate)*r.particleCount);if(o>0){U.direction=G.copy(K).setY(K.y+.35).normalize(),U.speed=n.emberSpeed,U.speedVariance=.7,U.spread=.85,U.inherit=null,U.anchor=null,U.size=.13,U.sizeVariance=.6,U.life=n.emberLifetime,U.lifeVariance=.45,U.spin=0,U.tint=null,U.time=i;let e=Math.ceil(o/Math.min(o,oe));for(;o>0;)this._arcPoint(f(this._lastU,this.u,Math.random()),W),U.position=W,U.radius=a*.9,this.embers.emit(Math.min(e,o),U),o-=e}let s=Math.round(this.sparkEmitter.tick(e,n.sparkRate)*r.particleCount);s>0&&(this._arcPoint(f(this._lastU,this.u,Math.random()),W),U.position=W,U.radius=a*.7,U.direction=G.copy(K).setY(K.y+.2).normalize(),U.speed=n.sparkSpeed,U.speedVariance=.85,U.spread=.95,U.size=.15,U.sizeVariance=.7,U.life=n.sparkLifetime,U.lifeVariance=.55,U.spin=0,U.time=i,this.sparks.emit(s,U));let c=Math.round(this.smokeEmitter.tick(e,n.smokeRate)*r.particleCount);c>0&&(this._arcPoint(f(this._lastU,this.u,Math.random()),W),U.position=W,U.radius=a*1.1,U.direction=G.copy(K),U.speed=n.smokeSpeed,U.speedVariance=.6,U.spread=.75,U.size=.85,U.sizeVariance=.5,U.life=n.smokeLifetime,U.lifeVariance=.4,U.spin=.5,U.time=i,this.smoke.emit(c,U))}_craterFx(e,n){let r=_.meteor,i=_.global,a=t.uTime.value;this._arcPoint(1,J);let o=Math.round(this.emberEmitter.tick(e,r.emberRate*.5*n)*i.particleCount);o>0&&(U.position=W.copy(J).setY(.25),U.radius=r.scorchRadius*.9,U.direction=G.set(0,1,0),U.speed=r.emberSpeed*.8,U.speedVariance=.75,U.spread=.9,U.inherit=null,U.anchor=null,U.size=.14,U.sizeVariance=.6,U.life=r.emberLifetime*1.2,U.lifeVariance=.5,U.spin=0,U.tint=null,U.time=a,this.embers.emit(o,U));let s=Math.round(this.smokeEmitter.tick(e,r.smokeRate*.8*n)*i.particleCount);s>0&&(U.position=W.copy(J).setY(.2),U.radius=r.scorchRadius*1.1,U.direction=G.set(0,1,0),U.speed=r.smokeSpeed*1.2,U.speedVariance=.6,U.spread=.85,U.size=1.3,U.sizeVariance=.5,U.life=r.smokeLifetime*1.4,U.lifeVariance=.4,U.spin=.6,U.time=a,this.smoke.emit(s,U))}onTravel(e){this._syncUniforms(0),this._arcPoint(this.u,this.position),this._updateRock(0),this._updateTrail(0),this._trailFx(e),this._lastU=this.u,this.ctx.shake.rumble(_.meteor.rumble*_.global.cameraShake,e)}onImpact(){let e=_.meteor,n=_.global,r=t.uTime.value,i=e.burstSize*n.explosionIntensity;this._chunkCount=Math.min(z,Math.max(0,Math.round(e.chunkCount)));let o=a(e.colorHot),s=a(e.colorFlameMid),c=a(e.colorFlameEdge);this._arcPoint(1,J),W.copy(J).setY(J.y+i*.28),this.ctx.bursts.spawn(C.FIRE,W,{radius:i*.22,endRadius:i,life:.9,intensity:e.burstIntensity,opacity:.95,fresnel:1.1,displace:.55,turbulence:e.burstTurbulence*.6,colorA:o,colorB:s,colorC:c}),this.ctx.bursts.spawn(C.FIRE,W,{radius:i*.1,endRadius:i*.55,life:.35,intensity:e.burstIntensity*2.2,opacity:1,displace:.2,colorA:o,colorB:o,colorC:s}),this.ctx.decals.spawn(O.SHOCKWAVE,J,{radius:e.shockRadius*n.explosionIntensity,life:.65,width:.07,intensity:1.2,colorA:a(e.colorShockA),colorB:a(e.colorShockB)}),this.ctx.fissures.spawn(J,{radius:e.fissureRadius*n.explosionIntensity,life:e.fissureLife}),this.ctx.decals.spawn(O.SCORCH,J,{radius:e.scorchRadius*n.explosionIntensity,life:e.scorchLife,intensity:e.scorchIntensity,colorA:a(e.colorScorch),colorB:a(e.colorCrack),height:.015}),U.position=W,U.radius=i*.22,U.direction=G.set(0,.6,0),U.speed=e.emberSpeed*2.6,U.speedVariance=.8,U.spread=1,U.inherit=null,U.anchor=null,U.size=.2,U.sizeVariance=.7,U.life=e.emberLifetime*1.5,U.lifeVariance=.55,U.spin=0,U.tint=null,U.time=r,this.embers.emit(Math.round(e.burstEmbers*n.particleCount),U),U.speed=e.sparkSpeed*2.4,U.size=.22,U.life=e.sparkLifetime*1.6,this.sparks.emit(Math.round(e.burstSparks*n.particleCount),U),U.position=W.copy(J).setY(.25),U.radius=e.scorchRadius*.7,U.direction=G.set(0,1,0),U.speed=e.debrisSpeed,U.speedVariance=.75,U.spread=.85,U.size=.15,U.life=e.debrisLifetime,U.spin=9,this.debris.emit(Math.round(e.burstDebris*n.particleCount),U),U.speed=e.smokeSpeed*2.6,U.spread=1,U.size=1.7,U.sizeVariance=.5,U.life=e.smokeLifetime*1.6,U.spin=.6,this.smoke.emit(Math.round(e.burstSmoke*n.particleCount),U),this.ctx.shake.add(e.impactShake*n.explosionIntensity*n.cameraShake,1/Math.max(.1,e.shakeDuration),22),this.ctx.flash.trigger(a(e.colorFlash),e.impactFlash*n.explosionIntensity),this.lightBoost=e.lightIntensity*2.4*n.explosionIntensity,this._updateRock(0),this._updateTrail(0)}onFade(e,t){let n=_.meteor,r=b(this._sinceImpact/Math.max(.05,n.trailBurnout));this._syncUniforms(r),this._arcPoint(1,this.position);let i=0;this.phase===k.FADE&&(i=b((this.fadeTime-n.chunkLinger)/Math.max(.05,n.chunkSink))),this._updateRock(i),this._updateTrail(r),i<.6&&this._craterFx(e,t<=1?1-t*.5:.25)}onDestroy(){this._chunkCount=0,this._used=0,this.trailCount=0,this.rock.count=0,this.ribbon.clear(),this.trailMesh.visible=!1}dispose(){this.geometry.dispose(),this.ribbon.dispose(),this.rock.dispose(),this.material.dispose(),this.trailMaterial.dispose(),super.dispose()}};export{ce as MeteorAbility};
//# sourceMappingURL=MeteorAbility-DayjJBhU.js.map