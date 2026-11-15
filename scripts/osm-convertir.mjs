// Convierte los datos crudos de OpenStreetMap (datos-osm/) en la red de calles reales de Buenaventura.
//
// Cada cruce de calles es una estación y cada tramo entre cruces es una vía con su largo real.
// Las calles de un solo sentido quedan como vías dirigidas. Se conservan además los puntos de
// forma que hacen falta para que el tramo siga la calle con un error menor de TOLERANCIA_M metros.
//
// Proyección: Mercator con el factor cos(φ0) del origen. Así las coordenadas quedan en km reales
// alrededor de Buenaventura y, a la vez, son una transformación lineal de las teselas del mapa real.
// El largo de cada vía se mide sobre la misma proyección y se redondea hacia arriba, de modo que
// ninguna vía mide menos que la línea recta entre sus estaciones: la heurística de A* sigue siendo
// consistente (sección 6.3 del informe).
//
// Datos © colaboradores de OpenStreetMap, disponibles bajo la licencia ODbL.
import { readFileSync, writeFileSync } from 'node:fs';
import { RECUADRO } from './osm-recuadro.mjs';

const TOLERANCIA_M = 10;
const R = 6378137;
const LAT0 = (RECUADRO.sur + RECUADRO.norte) / 2;
const LON0 = (RECUADRO.oeste + RECUADRO.este) / 2;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const MY0 = mercY(LAT0);

/** Coordenadas en metros alrededor del origen. */
function proyectar(lat, lon) {
  return [R * COS0 * (((lon - LON0) * Math.PI) / 180), R * COS0 * (mercY(lat) - MY0)];
}

/** Velocidad supuesta por tipo de vía, en km/h, cuando la calle no trae maxspeed. */
const VELOCIDAD = { trunk: 50, trunk_link: 40, primary: 45, primary_link: 35, secondary: 40, secondary_link: 30, tertiary: 35, tertiary_link: 30, unclassified: 30, residential: 25, road: 25, living_street: 15, motorway: 60, motorway_link: 40 };
/** Importancia, para ordenar los nombres de un cruce y el grosor en el mapa. */
const CLASE = { motorway: 5, trunk: 5, trunk_link: 4, primary: 4, primary_link: 3, secondary: 3, secondary_link: 2, tertiary: 2, tertiary_link: 2, unclassified: 1, residential: 1, road: 1, living_street: 0 };

const crudo = JSON.parse(readFileSync('datos-osm/buenaventura-crudo.json', 'utf8'));
const fechaDatos = crudo.osm3s?.timestamp_osm_base ?? '';
const nodos = new Map();
for (const e of crudo.elements) if (e.type === 'node' && e.lat !== undefined) nodos.set(e.id, e);

const calles = [];
const costa = [];
const agua = [];
const manglar = [];
const lugares = [];
for (const e of crudo.elements) {
  if (e.type === 'way' && e.nodes && e.tags?.highway && VELOCIDAD[e.tags.highway] !== undefined) calles.push(e);
  else if (e.type === 'way' && e.nodes && e.tags?.natural === 'coastline') costa.push(e);
  else if (e.type === 'way' && e.nodes && e.tags?.natural === 'water') agua.push(e);
  else if (e.type === 'way' && e.nodes && e.tags?.wetland === 'mangrove') manglar.push(e);
  if (e.tags?.name && !e.nodes && (e.tags.amenity || e.tags.tourism || e.tags.leisure || e.tags.man_made || e.tags.shop || e.tags.aeroway)) lugares.push(e);
}

// 1. Cuántas calles pasan por cada nodo: los nodos compartidos son cruces.
const usos = new Map();
for (const w of calles) for (const id of w.nodes) usos.set(id, (usos.get(id) ?? 0) + 1);

// 2. Douglas-Peucker: puntos de forma que hacen falta para seguir la calle.
function simplificar(pts, i0, i1, tol, marcar) {
  let peor = -1;
  let dmax = tol;
  const [ax, ay] = pts[i0];
  const [bx, by] = pts[i1];
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  for (let i = i0 + 1; i < i1; i++) {
    const [px, py] = pts[i];
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
    if (d > dmax) {
      dmax = d;
      peor = i;
    }
  }
  if (peor >= 0) {
    marcar[peor] = true;
    simplificar(pts, i0, peor, tol, marcar);
    simplificar(pts, peor, i1, tol, marcar);
  }
}

// 3. Tramos entre nodos conservados. Cada tramo guarda su largo real sobre la polilínea completa.
const conservados = new Map(); // id OSM → índice provisional
const xy = [];
const nombresDe = []; // por nodo: Map nombre → clase
const tramos = []; // { u, v, metros, velocidad, sentido, clase, nombre }
function indiceNodo(id) {
  let i = conservados.get(id);
  if (i === undefined) {
    i = xy.length;
    conservados.set(id, i);
    const n = nodos.get(id);
    xy.push(proyectar(n.lat, n.lon));
    nombresDe.push(new Map());
  }
  return i;
}
let sentidoUnico = 0;
for (const w of calles) {
  const ids = w.nodes.filter((id) => nodos.has(id));
  if (ids.length < 2) continue;
  const pts = ids.map((id) => {
    const n = nodos.get(id);
    return proyectar(n.lat, n.lon);
  });
  const corte = ids.map((id, k) => k === 0 || k === ids.length - 1 || (usos.get(id) ?? 0) > 1);
  const marcar = corte.slice();
  let a = 0;
  for (let k = 1; k < ids.length; k++) {
    if (!corte[k]) continue;
    simplificar(pts, a, k, TOLERANCIA_M, marcar);
    a = k;
  }
  const tag = w.tags;
  const unaVia = tag.oneway === 'yes' || tag.oneway === '1' || tag.oneway === 'true' || tag.junction === 'roundabout' || tag.junction === 'circular';
  const inversa = tag.oneway === '-1';
  if (unaVia || inversa) sentidoUnico++;
  const vmax = Number.parseFloat(tag.maxspeed);
  const velocidad = Number.isFinite(vmax) && vmax > 5 ? vmax : VELOCIDAD[tag.highway];
  const clase = CLASE[tag.highway] ?? 1;
  const nombre = tag.name ?? '';
  const puente = tag.bridge === 'yes';
  let previo = 0;
  let metros = 0;
  for (let k = 1; k < ids.length; k++) {
    metros += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (!marcar[k]) continue;
    const u = indiceNodo(ids[previo]);
    const v = indiceNodo(ids[k]);
    if (u !== v) {
      if (inversa) tramos.push({ u: v, v: u, metros, velocidad, sentido: 1, clase, nombre, puente });
      else tramos.push({ u, v, metros, velocidad, sentido: unaVia ? 1 : 0, clase, nombre, puente });
    }
    if (nombre) {
      for (const i of [u, v]) {
        const c = nombresDe[i].get(nombre);
        if (c === undefined || c < clase) nombresDe[i].set(nombre, clase);
      }
    }
    previo = k;
    metros = 0;
  }
}

// 4. Componente fuertemente conexa más grande (Kosaraju iterativo): así toda consulta tiene ruta.
const n0 = xy.length;
const sal = Array.from({ length: n0 }, () => []);
const ent = Array.from({ length: n0 }, () => []);
for (const t of tramos) {
  sal[t.u].push(t.v);
  ent[t.v].push(t.u);
  if (t.sentido === 0) {
    sal[t.v].push(t.u);
    ent[t.u].push(t.v);
  }
}
const visto = new Uint8Array(n0);
const orden = [];
for (let s = 0; s < n0; s++) {
  if (visto[s]) continue;
  const pila = [[s, 0]];
  visto[s] = 1;
  while (pila.length) {
    const tope = pila[pila.length - 1];
    const [u, k] = tope;
    if (k < sal[u].length) {
      tope[1]++;
      const v = sal[u][k];
      if (!visto[v]) {
        visto[v] = 1;
        pila.push([v, 0]);
      }
    } else {
      orden.push(u);
      pila.pop();
    }
  }
}
const comp = new Int32Array(n0).fill(-1);
let nc = 0;
const tamComp = [];
for (let q = orden.length - 1; q >= 0; q--) {
  const s = orden[q];
  if (comp[s] !== -1) continue;
  let tam = 0;
  const pila = [s];
  comp[s] = nc;
  while (pila.length) {
    const u = pila.pop();
    tam++;
    for (const v of ent[u]) {
      if (comp[v] === -1) {
        comp[v] = nc;
        pila.push(v);
      }
    }
  }
  tamComp.push(tam);
  nc++;
}
let mayor = 0;
for (let c = 1; c < nc; c++) if (tamComp[c] > tamComp[mayor]) mayor = c;

// 5. Lugares conocidos: cada uno se pega al cruce más cercano de la componente principal.
const DESCARTAR = /^(muelle|embarcadero|ubic|celdas|estacion marte|cai |eps |ips )/i;
const TIPOS_LUGAR = /^(university|college|hospital|clinic|bus_station|ferry_terminal|marketplace|townhall|fire_station|library|attraction|museum|viewpoint|park|stadium|sports_centre|mall|aerodrome)$/;
function limpiarNombre(s) {
  let t = s.split(';')[0].trim();
  if (t === t.toUpperCase()) t = t.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y)\b/g, (m) => m.toLowerCase());
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/\bsede Pacífico\b/, 'Sede Pacífico');
  // Tildes y mayúsculas que faltan en los datos de OSM
  for (const [mal, bien] of CORRECCIONES) t = t.replace(mal, bien);
  return t;
}
const CORRECCIONES = [
  [/Pacifico\b/g, 'Pacífico'],
  [/Unipacifico\b/g, 'Unipacífico'],
  [/Transformacion\b/g, 'Transformación'],
  [/^Galeria\b/, 'Galería'],
  [/^Clinica Santa Sofia$/, 'Clínica Santa Sofía'],
  [/^Gobernacion\b/, 'Gobernación'],
  [/^Parque matolo$/, 'Parque Matolo'],
  [/^Jardin Santo Tomas$/, 'Jardín Santo Tomás'],
  [/^I\.e\. /, 'I.E. '],
  [/^Teofilo\b/, 'Teófilo'],
  [/^Bodega Renacer - Boats to Bahía Solano$/, 'Bodega Renacer (lanchas a Bahía Solano)'],
];
const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const yaUsados = new Set();
const lugarDe = new Map(); // nodo → nombre
const PRIORIDAD = ['Universidad del Valle', 'Malecón', 'Terminal de Transportes', 'Alcaldía', 'Hospital', 'Universidad del Pacífico'];
const prioridad = (nombre) => {
  const i = PRIORIDAD.findIndex((p) => nombre.startsWith(p));
  return i === -1 ? PRIORIDAD.length : i;
};
const candidatos = [];
for (const e of lugares) {
  const tipo = e.tags.amenity ?? e.tags.tourism ?? e.tags.leisure ?? e.tags.shop ?? e.tags.aeroway ?? e.tags.man_made;
  if (!TIPOS_LUGAR.test(tipo)) continue;
  const nombre = limpiarNombre(e.tags.name);
  if (DESCARTAR.test(nombre) || yaUsados.has(normal(nombre))) continue;
  yaUsados.add(normal(nombre));
  const lat = e.lat ?? e.center?.lat;
  const lon = e.lon ?? e.center?.lon;
  if (lat === undefined) continue;
  candidatos.push({ nombre, p: proyectar(lat, lon) });
}
candidatos.sort((a, b) => prioridad(a.nombre) - prioridad(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'));
for (const c of candidatos) {
  let mejor = -1;
  let dm = 350;
  for (let i = 0; i < n0; i++) {
    if (comp[i] !== mayor || lugarDe.has(i)) continue;
    const d = Math.hypot(xy[i][0] - c.p[0], xy[i][1] - c.p[1]);
    if (d < dm) {
      dm = d;
      mejor = i;
    }
  }
  if (mejor >= 0) lugarDe.set(mejor, c.nombre);
  else console.log('Sin cruce cercano para', c.nombre);
}

// 6. Nombre de cada cruce: las dos calles más importantes que se cruzan ahí.
function nombreCruce(i) {
  if (lugarDe.has(i)) return lugarDe.get(i);
  const lista = [...nombresDe[i].entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).map((e) => e[0]);
  if (lista.length >= 2) return `${lista[0]} con ${lista[1]}`;
  if (lista.length === 1) return lista[0];
  return 'Cruce sin nombre';
}

// 7. Orden final: lugares conocidos primero (el buscador los encuentra al tiro), el resto por
// posición, y la Universidad del Valle al final para que sea el destino por defecto.
const enRed = [];
for (let i = 0; i < n0; i++) if (comp[i] === mayor) enRed.push(i);
const esUnivalle = (i) => (lugarDe.get(i) ?? '').startsWith('Universidad del Valle');
const lugaresOrdenados = enRed.filter((i) => lugarDe.has(i) && !esUnivalle(i)).sort((a, b) => prioridad(lugarDe.get(a)) - prioridad(lugarDe.get(b)) || lugarDe.get(a).localeCompare(lugarDe.get(b), 'es'));
const resto = enRed.filter((i) => !lugarDe.has(i)).sort((a, b) => xy[a][0] - xy[b][0] || xy[a][1] - xy[b][1]);
const final = [...lugaresOrdenados, ...resto, ...enRed.filter(esUnivalle)];
const nuevo = new Int32Array(n0).fill(-1);
final.forEach((i, k) => (nuevo[i] = k));

const tablaNombres = [];
const idNombre = new Map();
const estaciones = [];
for (const i of final) {
  const nom = nombreCruce(i);
  let k = idNombre.get(nom);
  if (k === undefined) {
    k = tablaNombres.length;
    tablaNombres.push(nom);
    idNombre.set(nom, k);
  }
  // Coordenadas en cm, enteras
  estaciones.push(k, Math.round(xy[i][0] * 100), Math.round(xy[i][1] * 100));
}

// 8. Vías: largo en cm redondeado hacia arriba con 2 cm de margen sobre el redondeo de coordenadas.
const vias = [];
const puentes = [];
let arcos = 0;
for (const t of tramos) {
  const u = nuevo[t.u];
  const v = nuevo[t.v];
  if (u < 0 || v < 0) continue;
  if (t.puente) puentes.push({ tramo: vias.length / 6, nombre: t.nombre || '(sin nombre)', metros: Math.round(t.metros), sentido: t.sentido });
  vias.push(u, v, Math.ceil(t.metros * 100) + 2, Math.round(t.velocidad), t.sentido, t.clase);
  arcos += t.sentido === 0 ? 2 : 1;
}
// Solo para revisar: qué tramos son puentes. No va al repositorio.
writeFileSync('datos-osm/puentes.json', JSON.stringify(puentes, null, 1));
// Los puentes largos se pueden cerrar con un clic en la vista de Tráfico.
const NOMBRE_PUENTE = { 'Calle 6': 'Puente El Piñal (Calle 6)', 'Via Alterna': 'Puente de la Vía Alterna' };
const puentesLargos = Object.entries(NOMBRE_PUENTE).map(([calle, nombre]) => ({ nombre, tramos: puentes.filter((p) => p.nombre === calle).map((p) => p.tramo) }));

// 9. Fondo sin internet: costa, agua y manglar, en metros enteros con codificación delta.
function polilinea(w) {
  const r = [];
  let px = 0;
  let py = 0;
  const ids = w.nodes.filter((id) => nodos.has(id));
  const pts = ids.map((id) => proyectar(nodos.get(id).lat, nodos.get(id).lon));
  const marcar = pts.map((_, k) => k === 0 || k === pts.length - 1);
  if (pts.length > 2) simplificar(pts, 0, pts.length - 1, 3, marcar);
  for (let k = 0; k < pts.length; k++) {
    if (!marcar[k]) continue;
    const x = Math.round(pts[k][0]);
    const y = Math.round(pts[k][1]);
    r.push(x - px, y - py);
    px = x;
    py = y;
  }
  return r;
}
const fondo = {
  fuente: '© colaboradores de OpenStreetMap (ODbL)',
  costa: costa.map(polilinea),
  agua: agua.map(polilinea),
  manglar: manglar.map(polilinea),
};

const red = {
  nombre: 'Buenaventura, calles reales',
  descripcion: `Calles reales de Buenaventura tomadas de OpenStreetMap el ${fechaDatos.slice(0, 10)}. Cada cruce es una estación y cada tramo de calle una vía; las calles de un solo sentido son vías dirigidas.`,
  fuente: '© colaboradores de OpenStreetMap, licencia ODbL (openstreetmap.org/copyright)',
  fechaDatos,
  origen: { lat: LAT0, lon: LON0 },
  toleranciaM: TOLERANCIA_M,
  /** Índices de las estaciones que son lugares conocidos. */
  lugares: final.map((i, k) => (lugarDe.has(i) ? k : -1)).filter((k) => k >= 0),
  /** Puentes largos: tramos que se cierran juntos para simular su caída. */
  puentes: puentesLargos,
  nombres: tablaNombres,
  estaciones,
  vias,
};

writeFileSync('src/redes/buenaventura-osm.json', JSON.stringify(red));
writeFileSync('src/redes/buenaventura-osm-fondo.json', JSON.stringify(fondo));

const mb = (o) => (JSON.stringify(o).length / 1024).toFixed(0) + ' KB';
console.log('Calles usadas:', calles.length, '· de un solo sentido:', sentidoUnico);
console.log('Nodos conservados:', n0, '· tramos:', tramos.length, '· componentes fuertes:', nc);
console.log('Red final: estaciones', final.length, '· tramos', vias.length / 6, '· arcos', arcos);
console.log('Lugares conocidos:', lugaresOrdenados.length + enRed.filter(esUnivalle).length, '→', [...lugarDe.values()].join(' | '));
console.log('Tamaño: red', mb(red), '· fondo', mb(fondo));
