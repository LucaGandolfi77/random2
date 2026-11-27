#!/usr/bin/env python3
"""Generate Ring Atlas PNG icons with the Python standard library only."""
from pathlib import Path
import math,struct,zlib
ROOT=Path(__file__).resolve().parents[1]/"icons"
def chunk(k,d):return struct.pack(">I",len(d))+k+d+struct.pack(">I",zlib.crc32(k+d)&0xffffffff)
def blend(px,py,c,a=1):
 if not(0<=px<WIDTH and 0<=py<HEIGHT):return
 i=(py*WIDTH+px)*4;src=c[:3];dst=pixels[i:i+3];da=pixels[i+3]/255;oa=a+da*(1-a)
 if oa<=0:return
 for j in range(3):pixels[i+j]=round((src[j]*a+dst[j]*da*(1-a))/oa)
 pixels[i+3]=round(oa*255)
def make_icon(size,maskable=False,apple=False):
 global WIDTH,HEIGHT,pixels
 WIDTH=HEIGHT=size;pixels=bytearray(WIDTH*HEIGHT*4);s=size/512;radius=0 if maskable else size*(.22 if not apple else .18)
 for y in range(HEIGHT):
  for x in range(WIDTH):
   if radius:
    inside=radius<=x<WIDTH-radius or radius<=y<HEIGHT-radius
    corners=[(x-radius)**2+(y-radius)**2,(x-(WIDTH-radius))**2+(y-radius)**2,(x-radius)**2+(y-(HEIGHT-radius))**2,(x-(WIDTH-radius))**2+(y-(HEIGHT-radius))**2]
    if not inside and min(corners)>radius*radius:continue
   t=y/max(1,HEIGHT-1);blend(x,y,(round(24*(1-t)+6*t),round(34*(1-t)+9*t),round(56*(1-t)+18*t)))
 cx=cy=size/2
 rings=[(196,22,(244,167,181),20),(150,20,(168,230,207),150),(104,18,(169,201,245),260),(58,16,(247,227,161),60)]
 for y in range(HEIGHT):
  for x in range(WIDTH):
   dx=(x-cx)/s;dy=(y-cy)/s;dist=math.hypot(dx,dy);angle=(math.degrees(math.atan2(dy,dx))+90)%360
   for r,w,c,rot in rings:
    if abs(dist-r)<=w/2:
     gap_center=(rot+40)%360
     diff=abs((angle-gap_center+180)%360-180)
     if diff>28:blend(x,y,c)
     break
 core=30*s
 for y in range(max(0,int(cy-core)),min(HEIGHT,int(cy+core)+1)):
  for x in range(max(0,int(cx-core)),min(WIDTH,int(cx+core)+1)):
   if (x-cx)**2+(y-cy)**2<=core*core:blend(x,y,(213,185,236))
 raw=b"".join(b"\x00"+bytes(pixels[y*WIDTH*4:(y+1)*WIDTH*4]) for y in range(HEIGHT))
 return b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",WIDTH,HEIGHT,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(raw,9))+chunk(b"IEND",b"")
ROOT.mkdir(parents=True,exist_ok=True)
for name,size,maskable,apple in [("icon-192.png",192,False,False),("icon-512.png",512,False,False),("icon-maskable-512.png",512,True,False),("apple-touch-icon.png",180,False,True)]:
 (ROOT/name).write_bytes(make_icon(size,maskable,apple));print("wrote",name)
