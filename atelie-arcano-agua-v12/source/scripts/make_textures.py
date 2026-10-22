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
# animated-caustic source tile; shader scrolls 2 layers and mixes with water
from PIL import ImageDraw
N=256
im=Image.new('L',(N,N),35);d=ImageDraw.Draw(im)
for i in range(210):
    cx=float(rng.uniform(-25,N+25));cy=float(rng.uniform(-25,N+25));rx=float(rng.uniform(5,28));ry=float(rng.uniform(4,18))
    # transparent curvy caustic cells
    for j in (0,1):
        off=j*N/2
        box=[int(cx-rx),int(cy-ry),int(cx+rx),int(cy+ry)]
        d.arc(box,start=int(rng.uniform(0,60)),end=int(rng.uniform(150,360)),fill=210,width=1)
im=im.filter(ImageFilter.GaussianBlur(.8)); a=np.array(im,dtype=float)
rgba=np.stack([np.clip(42+a*.35,0,255),np.clip(95+a*.54,0,255),np.clip(117+a*.53,0,255),np.ones_like(a)*255],axis=-1).astype('uint8')
Image.fromarray(rgba,'RGBA').save(P/'water_caustics.png')
# Splash impact corona sprite: irregular broken ring with soft central highlights
N=256; y,x=np.mgrid[0:N,0:N];u=(x-127.5)/127.5;v=(y-127.5)/127.5;r=np.hypot(u,v);ang=np.arctan2(v,u)
cr=(.50+.055*np.sin(9*ang)+.024*np.sin(21*ang+1))
corona=np.exp(-((r-cr)/.048)**2)
spurs=np.maximum(0,np.sin(13*ang+.4))**9*np.exp(-((r-.61)/.22)**2)
alpha=np.clip(corona*.64+spurs*.38,0,1)
rgba=np.stack([np.ones_like(alpha)*212,np.ones_like(alpha)*246,np.ones_like(alpha)*250,alpha*255],axis=-1).astype('uint8')
Image.fromarray(rgba,'RGBA').save(P/'rain_splash.png')
for path in P.glob('*.png'):
 print(path.name, round(path.stat().st_size/1024,1),'KB')
