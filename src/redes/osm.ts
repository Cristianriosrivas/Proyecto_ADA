import { RedTransporte } from '../core/grafo/RedTransporte';
import datos from './buenaventura-osm.json';
import datosFondo from './buenaventura-osm-fondo.json';

/**
 * Red de calles reales de Buenaventura, tomada de OpenStreetMap con `scripts/osm-convertir.mjs`.
 * Datos © colaboradores de OpenStreetMap, licencia ODbL.
 *
 * El archivo es compacto: coordenadas y largos en centímetros enteros, y cada tramo de calle
 * una sola vez con su sentido. Aquí se expande a una RedTransporte dirigida: un tramo de doble
 * sentido da dos vías, una por sentido, y uno de sentido único da una sola.
 */

const RADIO_TIERRA = 6378137;

/** Fondo dibujable en km: polilíneas de costa y polígonos de agua y manglar. */
export interface FondoMapa {
  costa: Float64Array[];
  agua: Float64Array[];
  manglar: Float64Array[];
}

/** Lo que el mapa necesita para poner la red sobre el mundo real. */
export interface Georreferencia {
  /** Origen de la proyección, en grados. */
  lat0: number;
  lon0: number;
  /** Atribución que exige la licencia de los datos. */
  fuente: string;
  fechaDatos: string;
  fondo: FondoMapa;
  /** Importancia de la calle de cada vía (0 = peatonal o andén … 5 = troncal), para el grosor. */
  clase: Uint8Array;
  /** La vía del sentido contrario del mismo tramo, o -1 si la calle es de un solo sentido. */
  gemela: Int32Array;
  /** Estaciones que son lugares conocidos (universidad, terminal, parques…), para rotularlas. */
  lugares: Int32Array;
  /** Puentes largos con todas sus vías, en ambos sentidos, para cerrarlos de una vez. */
  puentes: { nombre: string; vias: Int32Array }[];
}

const registro = new WeakMap<RedTransporte, Georreferencia>();

/** La georreferencia de una red, si la tiene. Las redes simuladas no la tienen. */
export function georreferencia(red: RedTransporte): Georreferencia | undefined {
  return registro.get(red);
}

function decodificar(delta: number[]): Float64Array {
  const r = new Float64Array(delta.length);
  let x = 0;
  let y = 0;
  for (let i = 0; i < delta.length; i += 2) {
    x += delta[i];
    y += delta[i + 1];
    r[i] = x / 1000;
    r[i + 1] = y / 1000;
  }
  return r;
}

let fondoCache: FondoMapa | null = null;
function fondo(): FondoMapa {
  if (fondoCache === null) {
    fondoCache = {
      costa: datosFondo.costa.map(decodificar),
      agua: datosFondo.agua.map(decodificar),
      manglar: datosFondo.manglar.map(decodificar),
    };
  }
  return fondoCache;
}

export function cargarRedOSM(): RedTransporte {
  const e = datos.estaciones;
  const v = datos.vias;
  const nEst = e.length / 3;
  const nTramos = v.length / 6;
  let arcos = 0;
  for (let t = 0; t < nTramos; t++) arcos += v[t * 6 + 4] === 0 ? 2 : 1;

  const red = new RedTransporte(datos.nombre, true, nEst, arcos);
  for (let i = 0; i < nEst; i++) {
    red.agregarEstacion(`osm${i}`, e[i * 3 + 1] / 100000, e[i * 3 + 2] / 100000, datos.nombres[e[i * 3]]);
  }
  const clase = new Uint8Array(arcos);
  const gemela = new Int32Array(arcos).fill(-1);
  const viaDeTramo = new Int32Array(nTramos);
  for (let t = 0; t < nTramos; t++) {
    const u = v[t * 6];
    const w = v[t * 6 + 1];
    const km = v[t * 6 + 2] / 100000;
    // tiempo = distancia / velocidad, con la velocidad en km/h
    const min = (km / v[t * 6 + 3]) * 60;
    const a = red.agregarVia(u, w, km, min);
    viaDeTramo[t] = a;
    clase[a] = v[t * 6 + 5];
    if (v[t * 6 + 4] === 0) {
      const b = red.agregarVia(w, u, km, min);
      clase[b] = v[t * 6 + 5];
      gemela[a] = b;
      gemela[b] = a;
    }
  }
  const puentes = datos.puentes.map((p) => {
    const vias: number[] = [];
    for (const t of p.tramos) {
      const a = viaDeTramo[t];
      vias.push(a);
      if (gemela[a] >= 0) vias.push(gemela[a]);
    }
    return { nombre: p.nombre, vias: Int32Array.from(vias) };
  });
  registro.set(red, { lat0: datos.origen.lat, lon0: datos.origen.lon, fuente: datos.fuente, fechaDatos: datos.fechaDatos, fondo: fondo(), clase, gemela, lugares: Int32Array.from(datos.lugares), puentes });
  return red;
}

/** Píxel del mundo de las teselas (Web Mercator) para un punto en km de la red, al zoom z. */
export function kmAPixelMundo(geo: Georreferencia, x: number, y: number, z: number): { px: number; py: number } {
  const cos0 = Math.cos((geo.lat0 * Math.PI) / 180);
  const tam = 256 * 2 ** z;
  const lambda = (geo.lon0 * Math.PI) / 180 + (x * 1000) / (RADIO_TIERRA * cos0);
  const merc0 = Math.log(Math.tan(Math.PI / 4 + (geo.lat0 * Math.PI) / 360));
  const merc = merc0 + (y * 1000) / (RADIO_TIERRA * cos0);
  return { px: ((lambda + Math.PI) / (2 * Math.PI)) * tam, py: ((Math.PI - merc) / (2 * Math.PI)) * tam };
}

/** Metros sobre el terreno que cubre un píxel de tesela al zoom z, en el origen de la red. */
export function metrosPorPixel(geo: Georreferencia, z: number): number {
  return (2 * Math.PI * RADIO_TIERRA * Math.cos((geo.lat0 * Math.PI) / 180)) / (256 * 2 ** z);
}
