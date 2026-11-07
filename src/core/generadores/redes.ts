import { KDTree } from '../estructuras/KDTree';
import { RedTransporte } from '../grafo/RedTransporte';
import { enteroAzar, mulberry32 } from './azar';

export type TipoRed = 'geometrica' | 'cuadricula' | 'metro' | 'densa';

export interface OpcionesGenerador {
  dirigida?: boolean;
  /** Vecinos por estación en la red geométrica. */
  k?: number;
  /** Fracción de pares conectados en la red densa, entre 0 y 1. */
  densidad?: number;
  /** Número de líneas en la red de metro. */
  lineas?: number;
}

/** Velocidades de operación en km/min: 18, 24, 30 y 36 km/h. */
const VELOCIDADES = [0.3, 0.4, 0.5, 0.6];

/**
 * El peso es la distancia euclidiana por un factor vial en [1.15, 1.6]: una vía real nunca es
 * más corta que la línea recta. Esa desigualdad es la que hace admisible a h euclidiana.
 */
function agregarViaGeometrica(red: RedTransporte, u: number, v: number, azar: () => number): void {
  const recta = red.distanciaEuclidiana(u, v);
  const km = recta * (1.15 + azar() * 0.45);
  const velocidad = VELOCIDADES[enteroAzar(azar, VELOCIDADES.length)];
  red.agregarVia(u, v, km, km / velocidad);
}

function lado(n: number): number {
  // Ciudad con densidad constante: el lado crece como √n
  return 2.2 * Math.sqrt(n);
}

function nombre(i: number): string {
  return `E${i + 1}`;
}

/**
 * Red geométrica: árbol generador mínimo euclidiano y luego los k vecinos más cercanos.
 * El árbol va primero porque garantiza que la red sea conexa; los k-NN solos pueden dejar
 * islas. Prim con arreglos cuesta Θ(n²), suficiente para n = 5000.
 */
export function redGeometrica(n: number, semilla: number, opts: OpcionesGenerador = {}): RedTransporte {
  const k = opts.k ?? 3;
  const azar = mulberry32(semilla);
  const red = new RedTransporte(`Geométrica ${n} (semilla ${semilla})`, opts.dirigida ?? false, n, n * (2 * k + 2));
  const L = lado(n);
  for (let i = 0; i < n; i++) red.agregarEstacion(nombre(i), azar() * L, azar() * L);
  const xs = red.coordenadasX();
  const ys = red.coordenadasY();

  const enArbol = new Uint8Array(n);
  const mejor = new Float64Array(n).fill(Infinity);
  const padre = new Int32Array(n).fill(-1);
  mejor[0] = 0;
  for (let paso = 0; paso < n; paso++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (enArbol[v] === 0 && (u === -1 || mejor[v] < mejor[u])) u = v;
    enArbol[u] = 1;
    if (padre[u] !== -1) conectar(red, padre[u], u, azar);
    for (let v = 0; v < n; v++) {
      if (enArbol[v] === 0) {
        const dx = xs[u] - xs[v];
        const dy = ys[u] - ys[v];
        const d = dx * dx + dy * dy;
        if (d < mejor[v]) {
          mejor[v] = d;
          padre[v] = u;
        }
      }
    }
  }

  const arbol = new KDTree(xs, ys);
  for (let u = 0; u < n; u++) {
    const vecinos = arbol.kMasCercanos(xs[u], ys[u], k, u);
    for (let i = 0; i < vecinos.length; i++) {
      const v = vecinos[i];
      if (!red.existeArco(u, v) && !(red.dirigida && red.existeArco(v, u))) conectar(red, u, v, azar);
    }
  }
  return red;
}

/** En una red dirigida cada conexión va en los dos sentidos, para que siga siendo fuertemente conexa. */
function conectar(red: RedTransporte, u: number, v: number, azar: () => number): void {
  agregarViaGeometrica(red, u, v, azar);
  if (red.dirigida) agregarViaGeometrica(red, v, u, azar);
}

/** Cuadrícula tipo Manhattan: filas y columnas cada 1.5 km con una leve perturbación. */
export function redCuadricula(n: number, semilla: number, opts: OpcionesGenerador = {}): RedTransporte {
  const azar = mulberry32(semilla);
  const columnas = Math.ceil(Math.sqrt(n));
  const red = new RedTransporte(`Cuadrícula ${n} (semilla ${semilla})`, opts.dirigida ?? false, n, n * 4);
  for (let i = 0; i < n; i++) {
    const f = Math.floor(i / columnas);
    const c = i % columnas;
    red.agregarEstacion(nombre(i), c * 1.5 + (azar() - 0.5) * 0.3, f * 1.5 + (azar() - 0.5) * 0.3);
  }
  for (let i = 0; i < n; i++) {
    const c = i % columnas;
    if (c + 1 < columnas && i + 1 < n) conectar(red, i, i + 1, azar);
    if (i + columnas < n) conectar(red, i, i + columnas, azar);
  }
  return red;
}

/**
 * Líneas de metro: varias líneas que cruzan la ciudad y comparten estaciones de trasbordo.
 * Cada línea sigue un rumbo propio desde cerca del centro, y la estación más cercana de la
 * línea anterior se conecta para crear el trasbordo.
 */
export function redMetro(n: number, semilla: number, opts: OpcionesGenerador = {}): RedTransporte {
  const azar = mulberry32(semilla);
  const lineas = opts.lineas ?? (n < 30 ? 3 : n < 300 ? 5 : 8);
  const red = new RedTransporte(`Metro ${n} (semilla ${semilla})`, opts.dirigida ?? false, n, n * 4);
  const L = lado(n);
  const porLinea = Math.floor(n / lineas);
  let creadas = 0;
  const inicioDeLinea = new Int32Array(lineas + 1);
  for (let l = 0; l < lineas; l++) {
    inicioDeLinea[l] = creadas;
    const cuantas = l === lineas - 1 ? n - creadas : porLinea;
    const angulo = (Math.PI * l) / lineas + azar() * 0.2;
    const dx = Math.cos(angulo);
    const dy = Math.sin(angulo);
    const paso = L / Math.max(cuantas, 1);
    for (let i = 0; i < cuantas; i++) {
      const t = (i - cuantas / 2) * paso;
      const ruido = Math.sin(i * 0.55 + l) * L * 0.035;
      const u = red.agregarEstacion(nombre(creadas), L / 2 + dx * t - dy * ruido + (azar() - 0.5) * 0.2, L / 2 + dy * t + dx * ruido + (azar() - 0.5) * 0.2, undefined, `L${l + 1}`);
      if (i > 0) conectar(red, u - 1, u, azar);
      creadas++;
    }
  }
  inicioDeLinea[lineas] = creadas;

  // Trasbordos: cada línea se conecta con la anterior en sus estaciones más cercanas
  for (let l = 1; l < lineas; l++) {
    let mejorA = -1;
    let mejorB = -1;
    let mejor = Infinity;
    for (let a = inicioDeLinea[l - 1]; a < inicioDeLinea[l]; a++) {
      for (let b = inicioDeLinea[l]; b < inicioDeLinea[l + 1]; b++) {
        const d = red.distanciaEuclidiana(a, b);
        if (d < mejor) {
          mejor = d;
          mejorA = a;
          mejorB = b;
        }
      }
    }
    if (mejorA >= 0) conectar(red, mejorA, mejorB, azar);
  }
  return red;
}

/**
 * Red densa para el punto de cruce de la pregunta 4: una cadena garantiza conexidad y luego
 * cada par queda conectado con probabilidad `densidad`.
 */
export function redDensa(n: number, semilla: number, opts: OpcionesGenerador = {}): RedTransporte {
  const densidad = opts.densidad ?? 0.5;
  const azar = mulberry32(semilla);
  const red = new RedTransporte(`Densa ${n} (densidad ${densidad})`, opts.dirigida ?? false, n, Math.ceil(n * n * densidad) + 2 * n);
  const L = lado(n);
  for (let i = 0; i < n; i++) red.agregarEstacion(nombre(i), azar() * L, azar() * L);
  for (let i = 1; i < n; i++) conectar(red, i - 1, i, azar);
  for (let u = 0; u < n; u++) {
    for (let v = u + 2; v < n; v++) if (azar() < densidad) conectar(red, u, v, azar);
  }
  return red;
}

export function generarRed(tipo: TipoRed, n: number, semilla: number, opts: OpcionesGenerador = {}): RedTransporte {
  if (tipo === 'cuadricula') return redCuadricula(n, semilla, opts);
  if (tipo === 'metro') return redMetro(n, semilla, opts);
  if (tipo === 'densa') return redDensa(n, semilla, opts);
  return redGeometrica(n, semilla, opts);
}
