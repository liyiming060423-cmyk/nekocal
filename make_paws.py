# 素手の体の絵（{breed}-body-paw.webp）を つくる：body の 手袋の ところを 毛の色の 手（グー）に ぬりかえる
# にゃんカロ 素手の絵をつくる道具（v10.5）。アプリには入らない（.py は sw.js の一覧に入れない）
# つかいかた：このフォルダで  pip install opencv-python numpy pillow  →  python make_paws.py            … 4匹ぜんぶ
#             python make_paws.py tabby                     … 1匹だけ
#             python make_paws.py grey --gloves <フォルダ>   … 手袋の形を べつのフォルダの ○○-gloves.webp から とる
# ※ grey は v10.5 で 手袋の絵を 1.14倍にしたので、作りなおすときは v10.4.1 の grey-gloves.webp が入った フォルダを --gloves で わたす
# ○○-body.webp の 手袋のところを、足の色（毛の色）の グーの手に ぬりかえて ○○-body-paw.webp に保存する
import sys, argparse, numpy as np, cv2
from pathlib import Path
from PIL import Image
HERE = Path(__file__).resolve().parent
ap = argparse.ArgumentParser(); ap.add_argument('breeds', nargs='*'); ap.add_argument('--gloves', default=str(HERE))
A = ap.parse_args()
SRC = str(HERE); ORIG = A.gloves; OUT = str(HERE); EXT = 'webp'
# 足の まわり（毛の色を とる場所。data.js の CATS の zones の foot と同じ）。猫を増やしたら ここにも 足す
FEET={'tabby':[(108,750),(466,750)],'white':[(102,755),(479,755)],'longwhite':[(123,762),(472,762)],'grey':[(87,762),(407,768)]}
def make(b):
    body=np.array(Image.open(f'{SRC}/{b}-body.webp').convert('RGBA'))
    gl=np.array(Image.open(f'{ORIG}/{b}-gloves.webp').convert('RGBA'))
    m=(gl[...,3]>30).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    m=cv2.dilate(m,np.ones((3,3),np.uint8))
    # 手袋の ふちの のこり（茶色っぽい 暗い色）も 手に ふくめる
    hsv0=cv2.cvtColor(body[...,:3],cv2.COLOR_RGB2HSV).astype(int)
    ring=cv2.dilate(m,np.ones((9,9),np.uint8))>0
    brownish=(hsv0[...,0]<22)&(hsv0[...,1]>50)&(hsv0[...,2]<170)&(body[...,3]>40)
    if b!='grey': m=(m>0)|(ring&brownish)
    m=m.astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    m=(cv2.GaussianBlur(m.astype(np.float32),(0,0),2.2)>.5).astype(np.uint8)   # ふちを なめらかに
    m=(cv2.GaussianBlur(m.astype(np.float32),(0,0),2.2)>.5).astype(np.uint8)   # ふちを なめらかに
    out=body.copy(); rgb=body[...,:3].astype(np.float32)
    # 毛の色：足（つま先）の まわりの色
    px=[]
    for fx,fy in FEET[b]:
        y0,y1,x0,x1=fy-30,fy+10,fx-45,fx+45
        a_=body[y0:y1,x0:x1,3]; blk=rgb[y0:y1,x0:x1][a_>(240 if (a_>240).sum()>200 else 150)]; px.append(blk)
    px=np.concatenate(px); lum=px.mean(1); keep=(lum>=np.percentile(lum,40))&(lum<=np.percentile(lum,92))
    fur=np.median(px[keep],0)
    ink=np.array([59,42,32],np.float32) if fur.mean()>110 else np.array([22,18,18],np.float32)
    n,lab=cv2.connectedComponents(m)
    rs=np.random.RandomState(7)
    for i in range(1,n):
        mi=(lab==i).astype(np.uint8)
        if mi.sum()<2000: continue
        ys,xs=np.where(mi>0); cy,cx=ys.mean(),xs.mean(); top=ys.min(); h_=ys.max()-top; w_=xs.max()-xs.min()
        dist=cv2.distanceTransform(mi,cv2.DIST_L2,5); dn=np.clip(dist/12,0,1)
        yy,xx=np.mgrid[0:mi.shape[0],0:mi.shape[1]]
        light=np.clip(1-np.hypot(yy-(cy-h_*.22),xx-(cx-w_*.12))/(max(h_,w_)*.55),0,1)
        shade=0.80+0.16*dn+0.14*light
        col=fur[None,None,:]*shade[...,None]
        # 毛の ざらざら（細かい すじ）
        nz=cv2.GaussianBlur(rs.rand(*mi.shape).astype(np.float32),(0,0),1.2)
        nz=(nz-nz.mean())*(60 if fur.mean()<110 else 28)
        col=np.clip(col+nz[...,None],0,255)
        sel=mi>0
        out[sel,:3]=col[sel].astype(np.uint8); out[sel,3]=255
        # りんかく
        edge=(mi-cv2.erode(mi,np.ones((5,5),np.uint8)))>0
        out[edge,:3]=ink.astype(np.uint8); out[edge,3]=255
        # 指の すじ（3本）：グーの 上がわ
        c=tuple(int(v) for v in ink)+(255,)
        er=cv2.erode(mi,np.ones((15,15),np.uint8))
        for k in (-1,0,1):
            x0=int(cx+k*w_*0.15); col_=np.where(er[:,x0]>0)[0]
            if not len(col_): continue
            y0=int(col_.min()+6); y1=int(min(col_.max(),y0+h_*0.16))
            cv2.line(out,(x0,y0),(x0+int(k*3),y1),c,4,cv2.LINE_AA)
    im=Image.fromarray(out)
    if EXT=='webp': im.save(f'{OUT}/{b}-body-paw.webp','WEBP',quality=90,method=6)
    else: im.save(f'{OUT}/{b}-body-paw.png')
    print(b,'fur',fur.astype(int))
for b in (A.breeds or list(FEET)): make(b)
