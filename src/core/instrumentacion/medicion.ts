import { mergeSort } from '../ordenamiento/ordenamiento';

export interface Medicion {
  /** Mediana del tiempo por ejecución, en microsegundos. */
  medianaUs: number;
  /** Rango intercuartílico, en microsegundos. */
  iqrUs: number;
  repeticiones: number;
  /** Ejecuciones dentro de cada medición. */
  lote: number;
}

export interface OpcionesMedicion {
  repeticiones?: number;
  /** Duración mínima de cada lote, en ms: por debajo de esto manda la resolución del reloj. */
  minimoMs?: number;
  calentamiento?: number;
  /** Tiempo mínimo de calentamiento, en ms. */
  calentamientoMs?: number;
}

/**
 * Mide una función como pide el laboratorio: calentamiento para que el JIT compile, luego
 * repeticiones y mediana con rango intercuartílico. Para redes pequeñas ejecuta K veces dentro
 * de cada medición y divide, porque una sola corrida dura menos que la resolución del reloj.
 * El reloj se recibe por parámetro: en Node es `hrtime` y en el navegador `performance.now`.
 */
export function medir(fn: () => void, reloj: () => number, opts: OpcionesMedicion = {}): Medicion {
  const repeticiones = opts.repeticiones ?? 15;
  const minimoMs = opts.minimoMs ?? 3;
  const calentamiento = opts.calentamiento ?? 3;
  // El JIT compila la función tras muchas llamadas: calentar por tiempo, no solo por cuenta,
  // evita medir código interpretado en las redes pequeñas
  const finCalentamiento = reloj() + (opts.calentamientoMs ?? 0);
  for (let i = 0; i < calentamiento || reloj() < finCalentamiento; i++) fn();

  let lote = 1;
  for (;;) {
    const a = reloj();
    for (let i = 0; i < lote; i++) fn();
    const ms = reloj() - a;
    if (ms >= minimoMs || lote >= 1 << 20) break;
    lote = ms <= 0 ? lote * 8 : Math.max(lote * 2, Math.ceil((lote * minimoMs * 1.2) / ms));
  }

  const muestras = new Float64Array(repeticiones);
  for (let r = 0; r < repeticiones; r++) {
    const a = reloj();
    for (let i = 0; i < lote; i++) fn();
    muestras[r] = ((reloj() - a) * 1000) / lote;
  }
  mergeSort(muestras, (x, y) => x - y);
  const p = (f: number): number => {
    const pos = (repeticiones - 1) * f;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return muestras[lo] + (muestras[hi] - muestras[lo]) * (pos - lo);
  };
  return { medianaUs: p(0.5), iqrUs: p(0.75) - p(0.25), repeticiones, lote };
}

export interface Ajuste {
  /** Constante c de T ≈ c·f(N). */
  c: number;
  /** Coeficiente de determinación. */
  r2: number;
}

/**
 * Mínimos cuadrados de T = c·f sin intercepto: c = Σ(T·f) / Σ(f²).
 * El ajuste se pondera por 1/f para que los puntos grandes no decidan solos; así R² mide la
 * forma de la curva y no solo el último punto.
 */
export function ajustarConstante(f: ArrayLike<number>, t: ArrayLike<number>): Ajuste {
  let num = 0;
  let den = 0;
  for (let i = 0; i < f.length; i++) {
    const p = 1 / (f[i] * f[i]);
    num += p * t[i] * f[i];
    den += p * f[i] * f[i];
  }
  const c = den > 0 ? num / den : 0;
  // R² sobre los logaritmos: compara órdenes de magnitud, que es lo que importa en log-log
  let media = 0;
  for (let i = 0; i < t.length; i++) media += Math.log(t[i]);
  media /= t.length;
  let res = 0;
  let tot = 0;
  for (let i = 0; i < t.length; i++) {
    const y = Math.log(t[i]);
    const e = y - Math.log(c * f[i]);
    res += e * e;
    tot += (y - media) * (y - media);
  }
  return { c, r2: tot > 0 ? 1 - res / tot : 1 };
}

export const CURVAS = {
  lineal: (v: number, e: number) => v + e,
  lineal_log: (v: number, e: number) => (v + e) * Math.log2(v),
  cuadratica: (v: number) => v * v,
};
