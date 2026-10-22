#!/usr/bin/env python3
"""Original procedural water/rain texture assets authored for Ateliê Arcano V12.
Only standard NumPy + Pillow used; no externally licensed textures, no AI assets.
"""
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
P = Path(__file__).resolve().parents[1]/'public'/'sprites'
P.mkdir(parents=True,exist_ok=True)
N=256
rng=np.random.default_rng(28319)
# Camera-facing rain streak: tapered teardrop glow with bright narrow core.
y,x=np.mgrid[0:256,0:96]; u=(x-47.5)/48; v=(y-127.5)/128
# target: longer tail at upper y and rounded droplet at lower y
width=.025 + .11*np.exp(-((v-.54)/.24)**2) + .023*(1-(v+1)/2)
width*=np.clip((1-v)*3,0,1)
core=np.exp(-((u/(width+.005))**2)*2.1)
bloom=np.exp(-((u/(width*1.9+.012))**2)*1.15)
fade=np.clip((v+1.0)*4.0,0,1)*np.clip((1-v)*4.0,0,1)
alpha=np.clip((.68*core+.16*bloom)*fade,0,1)
# bright head point near bottom, small cool edge halo
blue=np.clip(0.93+.07*np.exp(-((v-.48)/.3)**2),0,1)
rgba=np.stack([np.ones_like(alpha)*205, np.ones_like(alpha)*238, blue*255, alpha*255],axis=-1).astype('uint8')
Image.fromarray(rgba,'RGBA').save(P/'rain_streak.png')
# Round broken ripple line with soft edges: detailed embossed crest ring
N=256; y,x=np.mgrid[0:N,0:N]; u=(x-N/2)/(N/2);v=(y-N/2)/(N/2)
r=np.sqrt(u*u+v*v); ang=np.arctan2(v,u)
noise=0.019*np.sin(11*ang+0.32)+.011*np.cos(23*ang)+.009*np.sin(37*ang+1.9)
crest=.70+noise
alpha=np.exp(-((r-crest)/.035)**2)*(.62+.25*np.cos(5*ang)**2)
alpha*=np.clip((1-r)*8,0,1)
rgba=np.stack([np.ones_like(alpha)*196,np.ones_like(alpha)*244,np.ones_like(alpha)*242,np.clip(alpha*255,0,255)],axis=-1).astype('uint8')
Image.fromarray(rgba,'RGBA').save(P/'water_ripple.png')
# irregular foam boundary tile: 2D gradient with brokencell flecks; RGB noise LUT
N=256; y,x=np.mgrid[0:N,0:N];u=x/N;v=y/N
foam=(np.sin(2*np.pi*(u*7+np.sin(v*8)*.28))+.64*np.sin(2*np.pi*(v*12-u*4))+.55*np.cos(2*np.pi*(u*16+v*11)))
fleck=np.where(foam>.70,foam,0)
small=rng.random((N,N))
alpha=np.clip((foam+.25)*0.13 + fleck*.11+np.where(small>.993,.47,0),0,.75)
rgba=np.stack([np.ones_like(alpha)*225,np.ones_like(alpha)*253,np.ones_like(alpha)*244,np.clip(alpha*255,0,255)],axis=-1).astype('uint8')
Image.fromarray(rgba,'RGBA').save(P/'shore_foam.png')
# Tiled caustic pattern: diffuse light along softly warped Voronoi cell edges.
# Deliberately avoid hand-drawn spirals or sharp outlines on the water.
N=256
y,x=np.mgrid[0:N,0:N]
xx=x.astype(float)+7*np.sin(y*.031)+3*np.sin((x+y)*.043)
yy=y.astype(float)+5*np.sin(x*.043)-2*np.sin((x-y)*.038)
min1=np.full((N,N),np.inf,dtype=np.float32)
min2=np.full((N,N),np.inf,dtype=np.float32)
for gy in range(6):
 for gx in range(6):
  px=(gx+.4+rng.uniform(-.22,.22))*N/6
  py=(gy+.5+rng.uniform(-.22,.22))*N/6
  dx=np.minimum(np.abs(xx-px),N-np.abs(xx-px))
  dy=np.minimum(np.abs(yy-py),N-np.abs(yy-py))
  d2=dx*dx+dy*dy
  changed=d2<min1
  min2=np.where(changed,min1,np.minimum(min2,d2))
  min1=np.minimum(min1,d2)
sep=np.sqrt(min2)-np.sqrt(min1)
light=np.exp(-((sep/5.3)**2))
light=np.clip(light*.88+.07*np.sin(xx*.04+yy*.027),0,1)
a=np.uint8(np.clip(30+light*209,0,255))
rgba=np.stack([np.uint8(np.clip(23+a*.62,0,255)),np.uint8(np.clip(60+a*.69,0,255)),np.uint8(np.clip(85+a*.64,0,255)),np.full_like(a,255)],axis=-1)
Image.fromarray(rgba,'RGBA').filter(ImageFilter.GaussianBlur(.55)).save(P/'water_caustics.png')
# Raindrop corona: irregular fine splash ring with scattered airborne droplets.
N=256
y,x=np.mgrid[0:N,0:N]
u=(x-127.5)/127.5;v=(y-127.5)/127.5
r=np.hypot(u,v);ang=np.arctan2(v,u)
cr=.48+.025*np.sin(7*ang+1.3)+.028*np.sin(16*ang)+.016*np.sin(23*ang-1)
corona=np.exp(-((r-cr)/.036)**2)
noise=.78+.14*np.sin(17*ang)**2
alpha=corona*.67*noise
for k in range(24):
 a0=float(rng.uniform(0,np.pi*2));rad=float(rng.uniform(.52,.85));size=float(rng.uniform(.009,.023))
 alpha+=np.exp(-(((u-rad*np.cos(a0))**2+(v-rad*np.sin(a0))**2)/(size*size)))*float(rng.uniform(.14,.44))
alpha=np.clip(alpha,0,.83)
rgba=np.stack([np.ones_like(alpha)*206,np.ones_like(alpha)*241,np.ones_like(alpha)*251,alpha*255],axis=-1).astype('uint8')
Image.fromarray(rgba,'RGBA').save(P/'rain_splash.png')
for path in P.glob('*.png'):
 print(path.name, round(path.stat().st_size/1024,1),'KB')
