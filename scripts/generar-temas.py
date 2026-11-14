#!/usr/bin/env python3
"""Genera el bloque «TEMAS ELABORADOS» de css/rediseno.css (9 temas sobre fondo de rocas y negro). Solo estética.
Uso: python3 scripts/generar-temas.py"""
import re
T={ # id: (nombre, acento, acento2, rojo, logo, radio, radio-chico, fuente-titulos, mayúsculas, espaciado)
'medianoche':('Neón Azul','#4da3ff','#22d3ee','#ff4f9a','blanco',18,10,"'Space Grotesk',Inter,sans-serif",'none','-.02em'),
'vino':('Sangre','#ef2b33','#ff6a3d','#ff2e4d','rojo',4,3,"Oswald,Impact,sans-serif",'uppercase','.03em'),
'bosque':('Esmeralda','#34d399','#a3e635','#f59e0b','blanco',30,16,"Nunito,Inter,sans-serif",'none','-.01em'),
'cobre':('Cobre','#ff8a3d','#f2b35a','#d6361e','rojo',8,5,"'Bebas Neue',Oswald,Impact,sans-serif",'uppercase','.07em'),
'grafito':('Táctico','#b7c58a','#7f9060','#e8803a','blanco',2,2,"'Big Shoulders Display',Oswald,Impact,sans-serif",'uppercase','.05em'),
'azufre':('Latón','#d4af5a','#a9822f','#c0392b','dorado',2,2,"'Playfair Display',Georgia,serif",'uppercase','.1em'),
'abismo':('Realeza','#a78bfa','#fbbf24','#f472b6','dorado',16,10,"'Playfair Display',Georgia,serif",'none','0'),
'ciruela':('Rosa Punk','#ff2d95','#ff7ac0','#ff4d4d','blanco',6,4,"'Big Shoulders Display',Oswald,Impact,sans-serif",'uppercase','.03em'),
'carbon':('Vintage','#efe2c6','#cdbb94','#b5483a','blanco',4,3,"'Playfair Display',Georgia,serif",'none','0'),
}
def rgb(h): h=h.lstrip('#'); return ','.join(str(int(h[i:i+2],16)) for i in (0,2,4))
P='html.rd.rd'
S=lambda k:f'{P}[data-tema="{k}"]'
CARD=":is(.caja,.ex-card,.prod-bloque,.honor-card,.mic-it,.fo-it,.pa-bloque,.card)"
out=['/* ===== 9 TEMAS ELABORADOS (solo estética): siempre fondo de rocas y negro; cada uno con su acento, su logo y su acabado ===== */']
for k,(n,a,b,r,logo,R,RS,F,TT,LS) in T.items():
    s=S(k)
    out.append(f'{s}{{--oro:{a};--oro2:{b};--rojo:{r};--hl:{rgb(a)};--hl2:{rgb(b)};--rd-r:{R}px;--rd-rs:{RS}px;--r:{R}px;--r-s:{RS}px;--f-t:{F};--tt:{TT};--ls:{LS}}}')
    out.append(f'{s} .marca img,{s} .hero-logo[src$="logo-horizontal-dorado.png"]{{content:url(../assets/marca/logo-horizontal-{logo}.png)}}')
    out.append(f'{s} body::before{{background:radial-gradient(900px 520px at 50% -8%,rgba({rgb(a)},.16),transparent 70%),linear-gradient(rgba(0,0,0,.42),rgba(0,0,0,.7)),url(../assets/marca/textura-fondo.jpg) center/cover no-repeat!important}}')
    out.append(f'{s} h1,{s} h2,{s} h3,{s} legend,{s} .tarjeta b,{s} .wiz-titulo,{s} .ro-titulo{{font-family:var(--f-t);text-transform:var(--tt);letter-spacing:var(--ls)}}')
    out.append(f'{s} .btn,{s} button.btn,{s} .tarjeta.principal,{s} .ficha-tab[aria-selected="true"]{{background:linear-gradient(135deg,{a},{b});color:#0a0a0a}}')
    out.append(f'{s} .btn:hover{{box-shadow:0 12px 34px rgba({rgb(a)},.42)}}')
    out.append(f'{s} .hero h1{{background:linear-gradient(180deg,#fff 30%,{b});-webkit-background-clip:text;background-clip:text}}')
    out.append(f'{s} .hero-logo{{box-shadow:0 0 0 1px rgba({rgb(a)},.35),0 20px 60px rgba({rgb(a)},.22)}}')
    out.append(f'{s} .tarjeta,{s} {CARD}{{border-radius:var(--rd-r)}}')
    out.append(f'{s} .tarjeta:hover{{border-color:{a};box-shadow:0 0 0 1px {a},0 14px 40px rgba({rgb(a)},.22)}}')
x=[]
# --- Neón Azul
k=S('medianoche'); x+= [f'{k} h2{{text-shadow:0 0 24px rgba(77,163,255,.55)}}', f'{k} .sec {CARD}{{box-shadow:0 0 0 1px rgba(77,163,255,.25),0 0 34px rgba(34,211,238,.1)}}', f'{k} h2::before{{border-radius:2px;width:.18em;height:.9em;background:linear-gradient(#22d3ee,#4da3ff);box-shadow:0 0 14px #22d3ee}}']
# --- Sangre
k=S('vino'); x+= [f'{k} .sec {CARD}{{border-left:4px solid #ef2b33!important;box-shadow:0 12px 32px rgba(0,0,0,.55),inset 0 0 40px rgba(216,29,35,.07)}}', f'{k} h2{{font-size:clamp(2rem,7vw,3rem)}}', f'{k} h2::before{{border-radius:0;width:.3em;height:1em;transform:skewX(-14deg);background:#ef2b33;box-shadow:0 0 16px rgba(239,43,51,.6)}}', f'{k} .btn,{k} .tarjeta{{border-radius:4px}}']
# --- Esmeralda
k=S('bosque'); x+= [f'{k} .sec {CARD}{{box-shadow:0 18px 44px rgba(0,0,0,.5),0 0 40px rgba(52,211,153,.08)}}', f'{k} h2::before{{border-radius:60% 0 60% 0;width:.5em;height:.5em;background:linear-gradient(135deg,#34d399,#a3e635);box-shadow:0 0 18px rgba(52,211,153,.6)}}', f'{k} .btn{{border-radius:999px}}']
# --- Cobre (borde degradado)
BG='-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none'
def degradado(tid,grad,anim=False):
    k=S(tid)
    x.append(f'{k}{{--bordeg:{grad}}}')
    x.append(f'{k} .sec {CARD}{{border-color:transparent!important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}}')
    x.append(f'{k} .sec {CARD}::before{{content:"";position:absolute;inset:0;padding:1.5px;border-radius:inherit;background:var(--bordeg);{BG}}}')
degradado('cobre','linear-gradient(160deg,#ff8a3d,#f2b35a 45%,rgba(214,54,30,.25))')
k=S('cobre'); x+= [f'{k} h2{{font-size:clamp(2.1rem,7vw,3.2rem);font-weight:400}}', f'{k} h2::before{{border-radius:0;width:.5em;height:.12em;margin-right:.3em;vertical-align:.3em;background:linear-gradient(90deg,#ff8a3d,#f2b35a);box-shadow:0 0 12px rgba(255,138,61,.55)}}']
# --- Táctico: esquinas de mira y franjas
k=S('grafito')
esq=','.join(f'linear-gradient(#b7c58a,#b7c58a) {p}' for p in ['left top/16px 2px','left top/2px 16px','right top/16px 2px','right top/2px 16px','left bottom/16px 2px','left bottom/2px 16px','right bottom/16px 2px','right bottom/2px 16px'])
x+= [f'{k} .sec {CARD}{{border-radius:2px;border-color:rgba(183,197,138,.28)!important}}', f'{k} .sec {CARD}::before{{content:"";position:absolute;inset:6px;pointer-events:none;background:{esq};background-repeat:no-repeat}}', f'{k} h2{{font-weight:800}}', f'{k} h2::before{{border-radius:0;width:.9em;height:.32em;box-shadow:none;background:repeating-linear-gradient(-45deg,#b7c58a 0 4px,transparent 4px 8px)}}', f'{k} .btn{{border-radius:2px;letter-spacing:.08em;text-transform:uppercase}}', f'{k} .tarjeta{{border-radius:2px}}']
# --- Latón: marco doble art déco
k=S('azufre')
x+= [f'{k} .sec {CARD},{k} .tarjeta{{border-radius:2px;border-color:rgba(212,175,90,.5)!important;box-shadow:inset 0 0 0 3px #050505,inset 0 0 0 4px rgba(212,175,90,.45)}}', f'{k} h2{{font-size:clamp(1.5rem,5vw,2.1rem);font-weight:800}}', f'{k} h2::before{{border-radius:0;width:.4em;height:.4em;transform:rotate(45deg);background:#d4af5a;box-shadow:0 0 14px rgba(212,175,90,.5)}}', f'{k} .btn{{border-radius:2px;letter-spacing:.1em;text-transform:uppercase;font-family:var(--f-t);font-size:.9rem}}', f'{k} .tarjeta b{{font-family:var(--f-b);letter-spacing:.05em}}']
# --- Realeza: violeta con borde degradado a oro
degradado('abismo','linear-gradient(135deg,#a78bfa,#fbbf24 60%,rgba(251,191,36,.15))')
k=S('abismo'); x+= [f'{k} h2{{font-weight:800}}', f'{k} h2::before{{border-radius:50%;background:linear-gradient(135deg,#a78bfa,#fbbf24);box-shadow:0 0 20px rgba(167,139,250,.6)}}', f'{k} .tarjeta.principal,{k} .btn,{k} .ficha-tab[aria-selected="true"]{{background:linear-gradient(135deg,#a78bfa,#8b5cf6 55%,#fbbf24)}}']
# --- Rosa Punk: títulos como cinta de volante
k=S('ciruela')
x+= [f'{k} .sec h2{{display:inline-block;background:#ff2d95;color:#0a0a0a;padding:.05em .4em;transform:rotate(-1.5deg);font-size:clamp(1.8rem,6vw,2.6rem);text-shadow:none}}', f'{k} .sec h2::before{{display:none}}', f'{k} .sec {CARD}{{border-top:4px solid #ff2d95!important;border-radius:6px;box-shadow:0 14px 34px rgba(255,45,149,.12)}}', f'{k} .btn,{k} .tarjeta{{border-radius:6px}}', f'{k} h3{{color:#ff7ac0}}']
# --- Vintage: crema, entradas de papel
k=S('carbon')
x+= [f'{k} .sec {CARD}{{border:1px dashed rgba(239,226,198,.45)!important;background:rgba(20,15,10,.94)!important;box-shadow:none;border-radius:4px}}', f'{k} .tarjeta{{border-radius:4px;border-style:dashed}}', f'{k} h2{{font-style:italic;font-weight:600}}', f'{k} h2::before{{content:"✦";width:auto;height:auto;background:none;box-shadow:none;border-radius:0;color:#efe2c6;font-size:.55em;vertical-align:.25em;font-style:normal}}', f'{k} .btn{{border-radius:3px;font-family:var(--f-b)}}']
css='\n'.join(out+x)+'\n'
p='css/rediseno.css'; s=open(p).read()
m1='/* >>> TEMAS ELABORADOS */'; m2='/* <<< TEMAS ELABORADOS */'
if m1 in s: s=re.sub(re.escape(m1)+r'.*?'+re.escape(m2)+'\n?','',s,flags=re.S)
s=s.rstrip('\n')+'\n'+m1+'\n'+css+m2+'\n'
open(p,'w').write(s)
print('temas:',', '.join(v[0] for v in T.values()))
