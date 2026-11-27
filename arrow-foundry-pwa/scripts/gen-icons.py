#!/usr/bin/env python3
"""Generate Arrow Foundry PNG icons with the Python standard library only."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "icons"


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)


def blend(px, py, color, alpha=1.0):
    if not (0 <= px < WIDTH and 0 <= py < HEIGHT): return
    i = (py * WIDTH + px) * 4; src = color[:3]; dst = pixels[i:i+3]; da = pixels[i+3]/255
    oa = alpha + da*(1-alpha)
    if oa <= 0: return
    for c in range(3): pixels[i+c] = round((src[c]*alpha + dst[c]*da*(1-alpha))/oa)
    pixels[i+3] = round(oa*255)


def rounded_rect(x,y,w,h,r,color):
    cx0,cx1,cy0,cy1=x+r,x+w-r,y+r,y+h-r
    for py in range(max(0,int(y)),min(HEIGHT,int(y+h)+1)):
        for px in range(max(0,int(x)),min(WIDTH,int(x+w)+1)):
            qx=max(cx0-px,0,px-cx1); qy=max(cy0-py,0,py-cy1)
            if qx*qx+qy*qy<=r*r: blend(px,py,color)


def polygon(points,color):
    ys=[p[1] for p in points]; y0,y1=int(min(ys)),int(max(ys))+1
    for y in range(max(0,y0),min(HEIGHT,y1)):
        xs=[]
        for i in range(len(points)):
            x1,y1=points[i]; x2,y2=points[(i+1)%len(points)]
            if (y1<=y<y2) or (y2<=y<y1): xs.append(x1+(y-y1)*(x2-x1)/(y2-y1))
        xs.sort()
        for i in range(0,len(xs)-1,2):
            for x in range(max(0,int(xs[i])),min(WIDTH,int(xs[i+1])+1)): blend(x,y,color)


def arrow(cx,cy,s,dir,color):
    dark=(9,16,28); t=s*.16; L=s*.34
    if dir==0:
        polygon([(cx,cy-L),(cx-t,cy-t*.4),(cx-t*.45,cy-t*.4),(cx-t*.45,cy+L),(cx+t*.45,cy+L),(cx+t*.45,cy-t*.4),(cx+t,cy-t*.4)],dark)
    elif dir==1:
        polygon([(cx+L,cy),(cx+t*.4,cy-t),(cx+t*.4,cy-t*.45),(cx-L,cy-t*.45),(cx-L,cy+t*.45),(cx+t*.4,cy+t*.45),(cx+t*.4,cy+t)],dark)
    elif dir==2:
        polygon([(cx,cy+L),(cx-t,cy+t*.4),(cx-t*.45,cy+t*.4),(cx-t*.45,cy-L),(cx+t*.45,cy-L),(cx+t*.45,cy+t*.4),(cx+t,cy+t*.4)],dark)
    else:
        polygon([(cx-L,cy),(cx-t*.4,cy-t),(cx-t*.4,cy-t*.45),(cx+L,cy-t*.45),(cx+L,cy+t*.45),(cx-t*.4,cy+t*.45),(cx-t*.4,cy+t)],dark)


def make_icon(size,maskable=False,apple=False):
    global WIDTH,HEIGHT,pixels
    WIDTH=HEIGHT=size; pixels=bytearray(WIDTH*HEIGHT*4); scale=size/512; radius=0 if maskable else size*(.22 if not apple else .18)
    for py in range(HEIGHT):
        t=py/max(1,HEIGHT-1); color=(round(24*(1-t)+6*t),round(34*(1-t)+9*t),round(56*(1-t)+18*t))
        for px in range(WIDTH):
            if radius:
                inside=radius<=px<WIDTH-radius or radius<=py<HEIGHT-radius
                corners=[(px-radius)**2+(py-radius)**2,(px-(WIDTH-radius))**2+(py-radius)**2,(px-radius)**2+(py-(HEIGHT-radius))**2,(px-(WIDTH-radius))**2+(py-(HEIGHT-radius))**2]
                if not inside and min(corners)>radius*radius: continue
            blend(px,py,color)
    colors=[(168,230,207),(169,201,245),(244,167,181),(247,227,161),(52,64,90),(213,185,236),(169,201,245),(168,230,207),(247,227,161)]
    dirs=[0,1,2,3,-1,-1,0,2,1]
    cell=104*scale; gap=14*scale; start=256-104*scale-gap
    for i,color in enumerate(colors):
        row,col=divmod(i,3); x=(start+col*(104*scale+gap)); y=(start+row*(104*scale+gap))
        rounded_rect(x,y,cell,cell,24*scale,color)
        if dirs[i]>=0: arrow(x+cell/2,y+cell/2,cell*.8,dirs[i],color)
    raw=b"".join(b"\x00"+bytes(pixels[y*WIDTH*4:(y+1)*WIDTH*4]) for y in range(HEIGHT))
    png=b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",WIDTH,HEIGHT,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(raw,9))+chunk(b"IEND",b"")
    return png

ROOT.mkdir(parents=True,exist_ok=True)
for name,size,maskable,apple in [("icon-192.png",192,False,False),("icon-512.png",512,False,False),("icon-maskable-512.png",512,True,False),("apple-touch-icon.png",180,False,True)]:
    (ROOT/name).write_bytes(make_icon(size,maskable,apple)); print("wrote",name)
