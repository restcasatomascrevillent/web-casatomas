import json,re,csv,unicodedata
from pathlib import Path
d=Path(__file__).resolve().parent;root=d.parents[1]
a=json.loads((d/'revision.json').read_text()); b={r['id']:r for r in json.loads((d/'antes.json').read_text())}
a['criterio']='Revisión documental individual del catálogo completo, incluidas referencias inactivas. Se separa denominación del vino, zona de producción y ubicación puntual de bodega. Un campo nulo indica que no se ha validado y no equivale a vino sin D.O. Las fuentes de distribuidores se indican expresamente; no se certifica el stock físico ni se extrapolan cambios de sellos a añadas antiguas. Coordenadas exclusivamente publicadas por fuente oficial, nunca centroides o geocodificación de regiones.'
changes=[];points={}
for r in a['vinos']:
 v=r['verificado'];old=b[r['id']];cat=v.get('categoria',old['categoria']);typ='TINTOS' if 'TINTO' in cat else 'BLANCOS' if 'BLANCO' in cat else 'ROSADOS' if 'ROSADO' in cat else 'ESPUMOSOS'
 do=v.get('denominacion_origen');label=re.sub(r'^(D\.O\.(?:Ca\.|Q\.|P\.)?|AOC |AOP |DOCG |WO )\s*','',do or '',flags=re.I).strip()
 label=label or 'Origen pendiente';cat='VINOS '+typ+' — '+label.upper()
 country=v.get('ubicacion_pais');region=v.get('ubicacion_region')
 new={'categoria':cat,'categoria_en':{'TINTOS':'Red wines','BLANCOS':'White wines','ROSADOS':'Rosé wines','ESPUMOSOS':'Sparkling wines'}[typ]+' — '+(label if do else 'Origin pending'),'categoria_fr':{'TINTOS':'Vins rouges','BLANCOS':'Vins blancs','ROSADOS':'Vins rosés','ESPUMOSOS':'Vins effervescents'}[typ]+' — '+(label if do else 'Origine à vérifier'),'denominacion_origen':do,'ubicacion_pais':country,'ubicacion_region':region,'ubicacion_pais_en':{'España':'Spain','Francia':'France','Italia':'Italy','Hungría':'Hungary','Sudáfrica':'South Africa','Alemania':'Germany'}.get(country,country),'ubicacion_pais_fr':{'España':'Espagne','Francia':'France','Italia':'Italie','Hungría':'Hongrie','Sudáfrica':'Afrique du Sud','Alemania':'Allemagne'}.get(country,country),'ubicacion_region_en':region,'ubicacion_region_fr':region}
 # Estos nombres geográficos propios se mantienen iguales en los tres idiomas.
 before={k:old.get(k) for k in new}
 r['propuesta']=new
 if before!=new:changes.append({'id':r['id'],'nombre':r['nombre'],'antes':before,'despues':new})
 if r.get('bodega'):
  points[r['id']]={'nombreVino':r['nombre'],'denominacion':do,**r['bodega']}
(d/'revision.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
(d/'cambios.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
(root/'src/lib/bodegas-verificadas.json').write_text(json.dumps(points,ensure_ascii=False,indent=2)+'\n')
fields=list(changes[0]['despues'])
def sql(reverse=False):
 data=[{'id':c['id'],'antes':c['despues'] if reverse else c['antes'],'despues':c['antes'] if reverse else c['despues']} for c in changes]
 payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
 return '-- Auditoría 2026-10-15. Transacción atómica, idempotente, sin alterar precios, nombres, fotos, disponibilidad ni descripciones.\nBEGIN;\nDO $audit$\nDECLARE\n cambios jsonb := $data$'+payload+'$data$::jsonb;\nBEGIN\n IF EXISTS (SELECT 1 FROM jsonb_array_elements(cambios) c LEFT JOIN public."Vinos" v ON v.id = c->>\'id\' WHERE v.id IS NULL OR NOT (to_jsonb(v) @> (c->\'antes\') OR to_jsonb(v) @> (c->\'despues\'))) THEN\n  RAISE EXCEPTION \'El catálogo ha cambiado: revisar antes de aplicar la auditoría\';\n END IF;\n UPDATE public."Vinos" v SET\n '+',\n '.join(f'{f} = c->\'despues\'->>\'{f}\'' for f in fields)+'\n FROM jsonb_array_elements(cambios) c\n WHERE v.id=c->>\'id\' AND to_jsonb(v) @> (c->\'antes\') AND NOT to_jsonb(v) @> (c->\'despues\');\nEND\n$audit$;\nCOMMIT;\n'
(d/'aplicar.sql').write_text(sql());(d/'revertir.sql').write_text(sql(True))
with (d/'revision.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['ID','Vino','Estado','D.O. anterior','D.O. documentada','País','Zona documentada','Categoría propuesta','Fuentes','Observaciones'])
 for r in a['vinos']:w.writerow([r['id'],r['nombre'],r['estado'],r['antes']['denominacion_origen'],r['verificado'].get('denominacion_origen'),r['verificado'].get('ubicacion_pais'),r['verificado'].get('ubicacion_region'),r['propuesta']['categoria'],' | '.join(r['fuentes']),' | '.join(r['notas'])])
counts={s:sum(r['estado']==s for r in a['vinos']) for s in sorted(set(r['estado'] for r in a['vinos']))}
print(counts);print('Cambios',len(changes),'D.O. nulas',sum(r['verificado'].get('denominacion_origen') is None for r in a['vinos']))
print('Categorías',sorted(set(c['despues']['categoria'] for c in changes)))
