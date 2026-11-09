import sys,json
import numpy as np
from PIL import Image
def run(src,mode,cols,rows,names,out,size,thr=0.25,color=None,lo=0.12,span=0.6):
    im=np.asarray(Image.open(src).convert('RGB')).astype(np.float32)/255
    lum=im.max(2) if mode=='light' else 1-im.min(2)
    H,W=lum.shape;cw,ch=W/cols,H/rows
    for k,nm in enumerate(names):
        if not nm:continue
        r,c=divmod(k,cols);y0,y1,x0,x1=int(r*ch),int((r+1)*ch),int(c*cw),int((c+1)*cw)
        sub=lum[y0:y1,x0:x1];col=im[y0:y1,x0:x1]
        m=sub>thr
        # ignore stray specks at the cell edge
        m[:6]=m[-6:]=False;m[:,:6]=m[:,-6:]=False
        yy,xx=np.where(m);by0,by1,bx0,bx1=yy.min(),yy.max(),xx.min(),xx.max()
        a=np.clip((sub[by0:by1+1,bx0:bx1+1]-lo)/span,0,1)
        rgb=col[by0:by1+1,bx0:bx1+1] if color is None else np.ones(a.shape+(3,))*np.array(color)/255
        if color is None and mode=='light':rgb=np.clip(rgb/np.maximum(sub[by0:by1+1,bx0:bx1+1,None],1e-3),0,1)
        h,w=a.shape;S=max(h,w);pad=int(S*0.05);cv=np.zeros((S+2*pad,S+2*pad,4),np.float32)
        oy,ox=(S-h)//2+pad,(S-w)//2+pad;cv[oy:oy+h,ox:ox+w,:3]=rgb;cv[oy:oy+h,ox:ox+w,3]=a
        Image.fromarray((cv*255).astype(np.uint8),'RGBA').resize((size,size),Image.LANCZOS).save(f'{out}/{nm}.png',optimize=True)
if __name__=='__main__':run(**json.loads(sys.argv[1]))
