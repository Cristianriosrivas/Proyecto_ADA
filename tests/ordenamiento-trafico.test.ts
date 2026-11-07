import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { busquedaBinaria, estaOrdenado, heapSort, mergeSort, quickSort, contadoresOrdenVacios } from '../src/core/ordenamiento/ordenamiento';
import { bloquear, congestionPorVia, demandaHoraria, estadisticas, experimentoP6, ordenarTabla, pesosEfectivos, simularViajes, tablaCongestion, topK } from '../src/core/trafico/trafico';
import { aEstrella } from '../src/core/algoritmos/aEstrella';
import { dijkstra } from '../src/core/algoritmos/dijkstra';
import { generarRed } from '../src/core/generadores/redes';
import { ajustarConstante, CURVAS, medir } from '../src/core/instrumentacion/medicion';
import { redDocente } from './ayudas';

const num = (a: number, b: number) => a - b;

describe('ordenamientos', () => {
  it('los tres ordenan igual que la referencia, con duplicados', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -30, max: 30 }), { maxLength: 300 }), (a) => {
        const ref = [...a].sort(num);
        for (const f of [mergeSort, quickSort, heapSort]) {
          const b = [...a];
          f(b, num);
          expect(b).toEqual(ref);
          expect(estaOrdenado(b, num)).toBe(true);
        }
        const c = [...a];
        quickSort(c, num, contadoresOrdenVacios(), 'ultimo');
        expect(c).toEqual(ref);
      }),
      { numRuns: 300 },
    );
  });

  it('MergeSort es estable', () => {
    const a = Array.from({ length: 200 }, (_, i) => ({ k: i % 5, i }));
    mergeSort(a, (x, y) => x.k - y.k);
    for (let i = 1; i < a.length; i++) if (a[i - 1].k === a[i].k) expect(a[i - 1].i).toBeLessThan(a[i].i);
  });

  it('funciona sobre arreglos tipados y detecta desorden', () => {
    const a = Float64Array.from([3, 1, 2]);
    heapSort(a, num);
    expect(Array.from(a)).toEqual([1, 2, 3]);
    expect(estaOrdenado([2, 1], num)).toBe(false);
  });

  it('los contadores siguen la teoría: n lg n frente a n² en el peor caso del pivote', () => {
    const n = 2048;
    const sorted = () => Array.from({ length: n }, (_, i) => i);
    const lg = Math.log2(n);
    const m = mergeSort(sorted(), num);
    expect(m.comparaciones).toBeLessThanOrEqual(n * lg);
    const q = quickSort(sorted(), num);
    expect(q.comparaciones).toBeLessThan(3 * n * lg);
    const peor = quickSort(sorted(), num, contadoresOrdenVacios(), 'ultimo');
    expect(peor.comparaciones).toBeGreaterThan(n * n * 0.2);
    const h = heapSort(sorted(), num);
    expect(h.comparaciones).toBeLessThan(2.2 * n * lg);
  });

  it('búsqueda binaria halla la primera aparición y usa lg n comparaciones', () => {
    const a = [1, 3, 3, 3, 7, 9];
    expect(busquedaBinaria(a, (x) => x - 3)).toBe(1);
    expect(busquedaBinaria(a, (x) => x - 4)).toBe(-1);
    expect(busquedaBinaria([], (x: number) => x)).toBe(-1);
    const c = contadoresOrdenVacios();
    busquedaBinaria(Array.from({ length: 1024 }, (_, i) => i), (x) => x - 700, c);
    expect(c.comparaciones).toBeLessThanOrEqual(11);
  });
});

describe('medición', () => {
  it('mide con mediana, ajusta curvas y calcula R²', () => {
    let t = 0;
    const r = medir(() => { t += 0.5; }, () => t, { repeticiones: 5, minimoMs: 2, calentamiento: 1, calentamientoMs: 1 });
    expect(r.repeticiones).toBe(5);
    expect(r.lote).toBeGreaterThanOrEqual(1);
    expect(r.medianaUs).toBeCloseTo(500, 6);
    const f = [10, 100, 1000];
    const a = ajustarConstante(f, f.map((x) => 3 * x));
    expect(a.c).toBeCloseTo(3, 9);
    expect(a.r2).toBeCloseTo(1, 9);
    expect(CURVAS.lineal(3, 4)).toBe(7);
    expect(CURVAS.lineal_log(4, 4)).toBe(16);
    expect(CURVAS.cuadratica(5)).toBe(25);
    expect(ajustarConstante([], []).c).toBe(0);
    let u = 0;
    expect(medir(() => undefined, () => u, { repeticiones: 3, minimoMs: 0.5, calentamiento: 1 }).lote).toBeGreaterThan(0 * (u += 1));
  });
});

describe('tráfico', () => {
  it('la demanda tiene picos en las horas de la especificación', () => {
    expect(demandaHoraria(7)).toBeGreaterThan(demandaHoraria(3) * 3);
    expect(demandaHoraria(18)).toBeGreaterThan(demandaHoraria(14));
    expect(demandaHoraria(7)).toBeGreaterThan(demandaHoraria(10));
  });

  it('la congestión es determinista y el peso efectivo es base × (1 + c)', () => {
    const red = redDocente();
    const a = congestionPorVia(red, 7, 9);
    expect(Array.from(a)).toEqual(Array.from(congestionPorVia(red, 7, 9)));
    expect(a.length).toBe(red.numVias);
    const w = pesosEfectivos(red, 'km', a);
    for (let e = 0; e < w.length; e++) expect(w[e]).toBeCloseTo(red.pesos('km')[e] * (1 + a[red.viaDeArco(e)]), 12);
  });

  it('con congestión, A* sigue dando el costo de Dijkstra porque los pesos solo suben', () => {
    const red = generarRed('geometrica', 200, 4);
    const pesos = pesosEfectivos(red, 'km', congestionPorVia(red, 18));
    const t = red.numEstaciones - 1;
    expect(aEstrella(red, 0, t, { pesos }).costo).toBeCloseTo(dijkstra(red, 0, t, { pesos }).costo, 9);
  });

  it('los tres algoritmos ordenan la tabla igual, de mayor a menor', () => {
    const red = generarRed('metro', 60, 5);
    const c = congestionPorVia(red, 8);
    const base = tablaCongestion(red, 'min', c);
    const res = (['merge', 'quick', 'heap'] as const).map((alg) => {
      const f = [...base];
      const k = ordenarTabla(f, alg);
      expect(k.comparaciones).toBeGreaterThan(0);
      return f.map((x) => x.via);
    });
    expect(res[1]).toEqual(res[0]);
    expect(res[2]).toEqual(res[0]);
    expect(base[0].pesoEfectivo).toBeCloseTo(base[0].pesoBase * (1 + base[0].congestion), 12);
    expect(tablaCongestion(red, 'km', c)[0].pesoBase).toBe(red.via(0).distanciaKm);
  });

  it('top-k coincide con ordenar y se limita a n', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: 0, max: 10, noNaN: true }), { minLength: 1, maxLength: 80 }), fc.integer({ min: 1, max: 90 }), (v, k) => {
        const r = Array.from(topK(v, k), (i) => v[i]);
        expect(r).toEqual([...v].sort((a, b) => b - a).slice(0, k));
      }),
    );
    expect(topK([], 3).length).toBe(0);
  });

  it('las estadísticas son correctas', () => {
    const e = estadisticas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(e.media).toBe(5.5);
    expect(e.mediana).toBe(5.5);
    expect(e.percentil90).toBeCloseTo(9.1, 12);
    expect(e.desviacion).toBeCloseTo(Math.sqrt(8.25), 12);
    expect(e.minimo).toBe(1);
    expect(e.maximo).toBe(10);
    expect(estadisticas([]).n).toBe(0);
    expect(estadisticas([4]).mediana).toBe(4);
  });

  it('simula viajes reproducibles y cuenta las estaciones', () => {
    const red = redDocente();
    const a = simularViajes(red, 100, 7, 'km');
    const b = simularViajes(red, 100, 7, 'km');
    expect(a.viajes).toBe(100);
    expect(Array.from(a.pasosPorEstacion)).toEqual(Array.from(b.pasosPorEstacion));
    expect(a.costoPromedio).toBeGreaterThan(0);
    const cerrada = simularViajes(red, 50, 7, 'km', undefined, bloquear(red, [0, 1, 2, 3, 4, 5, 6, 7], []));
    expect(cerrada.viajes).toBe(0);
    expect(cerrada.sinRuta).toBe(50);
    expect(cerrada.costoPromedio).toBe(0);
  });

  it('bloquear cierra estaciones y vías, y el re-ruteo evita el incidente', () => {
    const red = redDocente();
    const a = red.indiceDe('A');
    const f = red.indiceDe('F');
    const b1 = bloquear(red, [red.indiceDe('D')], []);
    const r1 = dijkstra(red, a, f, { arcosBloqueados: b1 });
    expect(Array.from(r1.ruta, (i) => red.estacion(i).id)).toEqual(['A', 'C', 'E', 'F']);
    expect(r1.costo).toBe(15);
    const b2 = bloquear(red, [], [0]);
    expect(b2[red.via(0).arco]).toBe(1);
    expect(b2[red.via(0).arcoInverso]).toBe(1);
    const d = generarRed('geometrica', 12, 1, { dirigida: true });
    expect(bloquear(d, [], [0]).reduce((x, y) => x + y, 0)).toBe(1);
  });

  it('experimento P6: las tres estrategias coinciden y la cola compara mucho menos', () => {
    let t = 0;
    const reloj = () => t++;
    const q = experimentoP6(500, 200, 3, 'quick', reloj);
    const h = experimentoP6(500, 200, 3, 'heap', reloj);
    const c = experimentoP6(500, 200, 3, 'cola', reloj);
    expect(q.maximoFinal).toBe(c.maximoFinal);
    expect(h.maximoFinal).toBe(c.maximoFinal);
    expect(c.comparaciones * 20).toBeLessThan(q.comparaciones);
    expect(c.comparaciones * 20).toBeLessThan(h.comparaciones);
    expect(c.ms).toBe(1);
  });
});
