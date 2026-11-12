import sys; from PIL import Image
ts=sys.argv[2:]; ims=[Image.open(f'build/snaps/t{float(t):.2f}.jpg') for t in ts]
w,h=ims[0].size; cols=min(6,len(ims)); rows=(len(ims)+cols-1)//cols
s=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): s.paste(im,((i%cols)*w,(i//cols)*h))
s.save(sys.argv[1])
