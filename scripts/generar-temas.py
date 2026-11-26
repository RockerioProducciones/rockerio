#!/usr/bin/env python3
"""Genera css/temas.css: 6 temas oscuros (amarillo, rojo, azul, verde, naranjo, púrpura) sobre negro y fondo de rocas.
Solo cambian colores y efectos; la estructura es la misma. Uso: python3 scripts/generar-temas.py"""
import re
# clave: (nombre, acento, acento2, texto-sobre-acento, fondo, fondo2, panel, borde, texto, apagado, giro-de-tono-del-logo-dorado)
T = {
 'rockerio': ('Amarillo', '#FCC631', '#f0a81c', '#1a1405', '#141413', '#0e0e0d', '#1d1c1b', '#32302e', '#f3efe8', '#b5afa6', None),
 'rojo':     ('Rojo',     '#ff3b3b', '#ff7a45', '#1a0505', '#0e0808', '#080404', '#1a1011', '#3d1d20', '#f8eceb', '#c6a9a7', -42),
 'azul':     ('Azul',     '#3b9dff', '#22d3ee', '#04121f', '#080b11', '#04060a', '#0f1521', '#1d2d47', '#ecf3ff', '#98abc9', 165),
 'verde':    ('Verde',    '#19e3b5', '#4ade80', '#03160f', '#07100d', '#040a08', '#0d1915', '#173a30', '#e9f9f4', '#90b8ab', 115),
 'naranjo':  ('Naranjo',  '#ff8a1f', '#ffb347', '#1c0d02', '#0e0a06', '#080503', '#1a130b', '#3e2915', '#fbf0e4', '#c2a88e', -17),
 'purpura':  ('Púrpura',  '#a855f7', '#e879f9', '#12041e', '#0b0710', '#06040a', '#161020', '#35224c', '#f4ecff', '#b09ccb', 230),
}
SG = {'rojo': '#ff9a62', 'azul': '#62e3ff', 'verde': '#8cf0a8', 'naranjo': '#ffd27a', 'purpura': '#f08cff'}
def rgb(h): h = h.lstrip('#'); return ','.join(str(int(h[i:i+2], 16)) for i in (0, 2, 4))
o = ['/* 6 temas oscuros (generado por scripts/generar-temas.py): amarillo (Rockerío), rojo, azul, verde, naranjo y púrpura.',
     '   Todos sobre negro con fondo de rocas; solo cambian los colores. */']
for k, (n, a, b, on, bg, bg2, pa, bo, tx, mu, giro) in T.items():
    S = f'html[data-tema="{k}"]'
    rojo = '#D81D23' if k == 'rockerio' else ('#ff3b3b' if k == 'rojo' else '#e5484d')
    o.append(f'{S}{{--bg:{bg};--bg2:{bg2};--panel:{pa};--panel2:{bg2};--borde:{bo};--oro:{a};--acc:{a};--oro2:{b};--rojo:{rojo};--txt:{tx};--mut:{mu};--on:{on};'
             f'--velo:rgba({rgb(bg)},.95);--panel-a:rgba({rgb(pa)},.92);--top-a:rgba({rgb(bg2)},.95);--hl:{rgb(a)};--hl2:{rgb(b)};--glow:rgba({rgb(a)},.38);'
             f'--grad:linear-gradient(135deg,{a},{b});--r:14px;--r-s:10px;--f-t:Oswald,Impact,sans-serif;--f-b:Inter,system-ui,sans-serif}}')
    if k != 'rockerio':
        # logo y calavera: el arte dorado se tiñe con el color del tema (el rojo usa su propio arte)
        f = f'hue-rotate({giro}deg) saturate(1.2)'
        o.append(f'{S} .top .marca img,{S} .pie-marca img,{S} .cab-logo,{S} .hero-logo,{S} .marca img{{filter:{f}}}')
        # color de cada servicio en Reservar y Disponibilidad: ensayo = color del tema, estudio = su tono hermano, en vivo = blanco
        o.append(f'{S}{{--sv-e:{a};--sv-t-e:{on};--sv-g:{SG[k]};--sv-t-g:{on};--sv-v:#f4f4f5;--sv-t-v:#111}}')
        # secciones con el color del tema (en vez de un tinte distinto por sección)
        o.append(f'{S} :is(#produccion,#nosotros,#galeria,#cotizar,#planes,#vivo,#proaudix){{--hl:{rgb(a)}}}')
        # botones, pestañas y tarjetas principales
        o.append(f'{S} .btn,{S} button.btn,{S} .tarjeta.principal,{S} .ficha-tab[aria-selected="true"],{S} .hbtn[aria-pressed="true"]{{background:var(--grad)!important;color:var(--on)!important;border-color:transparent}}')
        o.append(f'{S} .hero h1{{background:linear-gradient(180deg,#fff 35%,{b})!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important}}')
        o.append(f'{S} .sec h2::after,{S} .honor-card::after,{S} .cab h1::after{{background:var(--grad)!important}}')
        o.append(f'{S} .hero-logo{{box-shadow:none}}')
# efectos para todos los temas
o.append('''
/* ---------- Efectos visuales (los colores salen del tema) ---------- */
html[data-tema] body::after{content:"";position:fixed;inset:-25% -10%;z-index:-1;pointer-events:none;
  background:radial-gradient(38% 32% at 18% 12%,rgba(var(--hl),.22),transparent 70%),radial-gradient(34% 30% at 86% 28%,rgba(var(--hl2),.15),transparent 70%),radial-gradient(40% 30% at 50% 100%,rgba(var(--hl),.12),transparent 70%);
  animation:rk-aurora 26s ease-in-out infinite alternate;will-change:transform}
@keyframes rk-aurora{0%{transform:translate3d(-2%,0,0) scale(1)}50%{transform:translate3d(3%,2%,0) scale(1.06)}100%{transform:translate3d(-1%,-2%,0) scale(1.03)}}
html[data-tema] .hero-logo,html[data-tema] .top .marca img{filter:drop-shadow(0 0 16px rgba(var(--hl),.45))}
''')
o.append('\n'.join(f'html[data-tema="{k}"] :is(.hero-logo,.top .marca img,.pie-marca img,.marca img){{filter:hue-rotate({v[10]}deg) saturate(1.2) drop-shadow(0 0 16px rgba(var(--hl),.5))}}' for k, v in T.items() if v[10] is not None))
o.append('''
html[data-tema] .btn:hover,html[data-tema] button.btn:hover{box-shadow:0 10px 30px rgba(var(--hl),.42);transform:translateY(-1px)}
html[data-tema] .btn,html[data-tema] button.btn{position:relative;overflow:hidden;transition:transform .2s ease,box-shadow .25s ease,filter .2s ease}
html[data-tema] .btn::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.28) 50%,transparent 65%);background-size:250% 100%;background-position:-150% 0;pointer-events:none}
html[data-tema] .btn:is(:hover,:focus-visible)::after{animation:rk-brillo 1s ease}
html[data-tema] .sec h2{text-shadow:0 0 26px rgba(var(--hl),.32)}
html[data-tema] .tarjeta{transition:transform .2s ease,box-shadow .25s ease,border-color .2s ease}
html[data-tema] .tarjeta:hover{transform:translateY(-3px);border-color:var(--oro);box-shadow:0 12px 34px -8px rgba(var(--hl),.5)}
html[data-tema] input:focus,html[data-tema] select:focus,html[data-tema] textarea:focus{outline:none;border-color:var(--oro);box-shadow:0 0 0 3px rgba(var(--hl),.28)}
html[data-tema] ::selection{background:rgba(var(--hl),.4);color:#fff}
html[data-tema] a{text-decoration-color:rgba(var(--hl),.5)}
html[data-tema] .top{box-shadow:0 1px 0 var(--borde),0 12px 34px -16px rgba(var(--hl),.4)}
/* selector de color: seis puntos */
.selector-tema{position:fixed;left:12px;bottom:12px;z-index:20;display:flex;align-items:center;gap:.5rem;padding:.35rem .7rem;border-radius:999px;background:rgba(14,14,13,.78);border:1px solid var(--borde);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);width:auto!important;min-width:0!important;margin:0!important;font:600 .72rem Inter,system-ui,sans-serif;color:var(--mut)}
.selector-tema .tema-rot{letter-spacing:.1em;text-transform:uppercase;font-size:.66rem}
.tema-dot{width:20px;height:20px;padding:0!important;border-radius:50%!important;border:2px solid rgba(255,255,255,.25)!important;background:var(--c)!important;box-shadow:0 0 10px color-mix(in srgb,var(--c) 60%,transparent);cursor:pointer;min-height:0!important;transition:transform .15s ease}
.tema-dot:hover{transform:scale(1.18)}
.tema-dot[aria-pressed="true"]{border-color:#fff!important;transform:scale(1.2)}
@media(max-width:699px){.selector-tema{position:static!important;margin:1.1rem auto 1.6rem!important;justify-content:center;width:fit-content!important;padding:.55rem 1rem;gap:.7rem}.tema-dot{width:28px;height:28px}}
@media(prefers-reduced-motion:reduce){html[data-tema] body::after,html[data-tema] .btn:hover::after{animation:none}}
''')
open('css/temas.css', 'w').write('\n'.join(o) + '\n')
print('css/temas.css:', len(o), 'bloques')
# portal de administración: mismas paletas (variables del portal) y logo teñido
ad = []
for k, (n, a, b, on, bg, bg2, pa, bo, tx, mu, giro) in T.items():
    if k == 'rockerio': continue
    ad.append(f'html[data-tema="{k}"]{{--bg:{bg};--panel:{pa};--panel2:{bg2};--borde:{bo};--oro:{a};--acc:{a};--rojo:{"#ff3b3b" if k == "rojo" else "#e5484d"};--txt:{tx};--mut:{mu};--velo:rgba({rgb(bg)},.94)}}')
    ad.append(f'html[data-tema="{k}"] .cab-logo{{{"filter:drop-shadow(0 0 10px rgba(%s,.5))" % rgb(a) if giro is None else "filter:hue-rotate(%sdeg) saturate(1.15) drop-shadow(0 0 10px rgba(%s,.5))" % (giro, rgb(a))}}}')
    ad.append(f'html[data-tema="{k}"] .cab h1::after{{background:linear-gradient(90deg,{a},{b})}}')
ad.append('html[data-tema] body::after{content:"";position:fixed;inset:-25% -10%;z-index:-1;pointer-events:none;background:radial-gradient(38% 32% at 18% 12%,rgba(var(--hl,252,198,49),.16),transparent 70%),radial-gradient(34% 30% at 86% 28%,rgba(var(--hl,252,198,49),.10),transparent 70%)}')
for k, (n, a, b, on, bg, bg2, pa, bo, tx, mu, giro) in T.items():
    ad.append(f'html[data-tema="{k}"]{{--hl:{rgb(a)}}}')
H = open('apps-script/Admin.html').read()
H = re.sub(r'/\*TEMAS6-INI\*/.*?/\*TEMAS6-FIN\*/', lambda m: '/*TEMAS6-INI*/\n' + '\n'.join(ad) + '\n/*TEMAS6-FIN*/', H, flags=re.S)
open('apps-script/Admin.html', 'w').write(H)
print('Admin.html: temas actualizados')
