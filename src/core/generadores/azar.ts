/**
 * PRNG mulberry32: determinista y con semilla.
 * `Math.random` no sirve aquí, porque cada ejecución daría una red distinta y los benchmarks
 * no se podrían reproducir.
 */
export function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero uniforme en [0, n). */
export function enteroAzar(azar: () => number, n: number): number {
  return Math.floor(azar() * n);
}
