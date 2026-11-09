"""Slice a generated sprite sheet into transparent glyphs.
mode 'light': bright art on black -> alpha from brightness, colour kept.
mode 'ink': dark art on white -> alpha from darkness, colour set to ink.
Cells are found from the brightness/darkness profile, frames are trimmed by an inset."""
import sys,json
import numpy as np
from PIL import Image
def cells(mask,cols,rows):
    H,W=mask.shape
    def bands(profile,n):
        # split into n bands at the n-1 widest low-activity gaps
        thr=profile.max()*0.02;low=profile<=thr
        gaps=[];s=None
        for i,v in enumerate(low):
            if v and s is None:s=i
            if not v and s is not None:gaps.append((s,i));s=None
        if s is not None:gaps.append((s,len(low)))
        inner=[g for g in gaps if g[0]>0 and g[1]<len(low)]
        inner=sorted(inner,key=lambda g:g[1]-g[0],reverse=True)[:n-1]
        cuts=sorted([(a+b)//2 for a,b in inner])
        edges=[0]+cuts+[len(low)]
        return [(edges[k],edges[k+1]) for k in range(n)]
    return bands(mask.sum(0),cols),bands(mask.sum(1),rows)
def run(src,mode,cols,rows,names,out,inset,size,color=None):
    im=np.asarray(Image.open(src).convert('RGB')).astype(np.float32)/255
    lum=im.max(2) if mode=='light' else 1-im.min(2)
    mask=(lum>0.25).astype(np.float32)
    xs,ys=cells(mask,cols,rows)
    k=0
    for (y0,y1) in ys:
        for (x0,x1) in xs:
            if k>=len(names):break
            nm=names[k];k+=1
            if not nm:continue
            sub=lum[y0:y1,x0:x1];col=im[y0:y1,x0:x1]
            # find the content box, then trim a frame by an inset when asked
            m=sub>0.25;yy,xx=np.where(m)
            if len(yy)==0:continue
            by0,by1,bx0,bx1=yy.min(),yy.max(),xx.min(),xx.max()
            if inset:
                by0+=inset;by1-=inset;bx0+=inset;bx1-=inset
                s2=sub[by0:by1,bx0:bx1]>0.25;y2,x2=np.where(s2)
                by0,by1,bx0,bx1=by0+y2.min(),by0+y2.max(),bx0+x2.min(),bx0+x2.max()
            a=np.clip((sub[by0:by1+1,bx0:bx1+1]-0.12)/0.6,0,1)
            if color is None:rgb=np.clip(col[by0:by1+1,bx0:bx1+1]/np.maximum(a[...,None],1e-3)*0+col[by0:by1+1,bx0:bx1+1],0,1)
            else:rgb=np.ones(a.shape+(3,))*np.array(color)/255
            h,w=a.shape;S=max(h,w);pad=int(S*0.06);canvas=np.zeros((S+2*pad,S+2*pad,4),np.float32)
            oy,ox=(S-h)//2+pad,(S-w)//2+pad;canvas[oy:oy+h,ox:ox+w,:3]=rgb;canvas[oy:oy+h,ox:ox+w,3]=a
            img=Image.fromarray((canvas*255).astype(np.uint8),'RGBA').resize((size,size),Image.LANCZOS)
            img.save(f'{out}/{nm}.png',optimize=True)
    print('cells x',xs,'y',ys)
if __name__=='__main__':
    a=json.loads(sys.argv[1]);run(**a)
