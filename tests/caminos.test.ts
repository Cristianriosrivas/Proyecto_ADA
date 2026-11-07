import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { aEstrella } from '../src/core/algoritmos/aEstrella';
import { dijkstra, dijkstraArreglo, dijkstraPerezoso } from '../src/core/algoritmos/dijkstra';
import { costosHastaDestino, heuristicaEuclidiana, validarHeuristica } from '../src/core/algoritmos/heuristica';
import { generarRed } from '../src/core/generadores/redes';
import { RedTransporte } from '../src/core/grafo/RedTransporte';
import { TracerMemoria } from '../src/core/instrumentacion/TracerMemoria';
import { bellmanFord, construir, floydWarshall, redDocente, type GrafoAzar } from './ayudas';

const grafoPesado = fc
  .record({ n: fc.integer({ min: 2, max: 14 }), dirigida: fc.boolean() })
  .chain(({ n, dirigida }) =>
    fc.record({
      n: fc.constant(n),
      dirigida: fc.constant(dirigida),
      aristas: fc.array(fc.tuple(fc.integer({ min: 0, max: n - 1 }), fc.integer({ min: 0, max: n - 1 }), fc.integer({ min: 1, max: 20 })), { maxLength: 45 }),
    }),
  ) as fc.Arbitrary<GrafoAzar>;

describe('validación cruzada contra referencias escritas solo en los tests', () => {
  it('Dijkstra, Dijkstra-arreglo y Dijkstra perezoso igualan a Floyd-Warshall', () => {
    fc.assert(
      fc.property(grafoPesado, (g) => {
        const red = construir(g);
        const ref = floydWarshall(g);
        for (let s = 0; s < g.n; s++) {
          const a = dijkstra(red, s);
          const b = dijkstraArreglo(red, s);
          const c = dijkstraPerezoso(red, s);
          for (let t = 0; t < g.n; t++) {
            expect(a.d[t]).toBe(ref[s][t]);
            expect(b.d[t]).toBe(ref[s][t]);
            expect(c.d[t]).toBe(ref[s][t]);
          }
          expect(Array.from(a.orden)).toEqual(Array.from(b.orden));
          expect(Array.from(a.pi)).toEqual(Array.from(b.pi));
        }
      }),
      { numRuns: 300 },
    );
  });

  it('Dijkstra iguala a Bellman-Ford', () => {
    fc.assert(
      fc.property(grafoPesado, fc.integer({ min: 0, max: 13 }), (g, s0) => {
        const s = s0 % g.n;
        expect(Array.from(dijkstra(construir(g), s).d)).toEqual(bellmanFord(g, s));
      }),
      { numRuns: 200 },
    );
  });

  it('A* con h admisible da el costo óptimo, y sus rutas existen en el grafo', () => {
    fc.assert(
      fc.property(grafoPesado, (g) => {
        const red = construir(g);
        const ref = floydWarshall(g);
        for (let s = 0; s < g.n; s++) {
          for (let t = 0; t < g.n; t++) {
            const r = aEstrella(red, s, t);
            expect(r.costo).toBe(ref[s][t]);
            expect(r.contadores.reaperturas).toBe(0);
            let suma = 0;
            for (let i = 1; i < r.ruta.length; i++) {
              let mejor = Infinity;
              for (let e = red.adj.primero(r.ruta[i - 1]); e !== -1; e = red.adj.siguiente(e)) {
                if (red.adj.destino(e) === r.ruta[i] && red.adj.distanciaKm(e) < mejor) mejor = red.adj.distanciaKm(e);
              }
              suma += mejor;
            }
            if (r.alcanzado) expect(suma).toBe(ref[s][t]);
          }
        }
      }),
      { numRuns: 150 },
    );
  });

  it('A* con h = 0 es exactamente Dijkstra: mismo orden y mismos contadores', () => {
    fc.assert(
      fc.property(grafoPesado, (g) => {
        const red = construir(g);
        const s = 0;
        const t = g.n - 1;
        const a = aEstrella(red, s, t, { sinHeuristica: true });
        const d = dijkstra(red, s, t);
        expect(a.costo).toBe(d.costo);
        expect(Array.from(a.orden)).toEqual(Array.from(d.orden));
        expect(a.contadores.relajaciones).toBe(d.contadores.relajaciones);
      }),
      { numRuns: 150 },
    );
  });

  it('en redes generadas A* nunca expande más que Dijkstra y da el mismo costo', () => {
    for (const tipo of ['geometrica', 'cuadricula', 'metro'] as const) {
      for (let semilla = 1; semilla <= 6; semilla++) {
        const red = generarRed(tipo, 120, semilla);
        for (const metrica of ['km', 'min'] as const) {
          const t = red.numEstaciones - 1;
          const a = aEstrella(red, 0, t, { metrica });
          const d = dijkstra(red, 0, t, { metrica });
          expect(a.costo).toBeCloseTo(d.costo, 9);
          expect(a.contadores.expandidos).toBeLessThanOrEqual(d.contadores.expandidos);
          expect(a.contadores.reaperturas).toBe(0);
          const rep = validarHeuristica(red, heuristicaEuclidiana(red, t, metrica), t, metrica);
          expect(rep.admisible).toBe(true);
          expect(rep.consistente).toBe(true);
        }
      }
    }
  });
});

describe('A* ponderado y heurísticas malas', () => {
  it('con w > 1 expande menos o igual y su costo queda dentro de w veces el óptimo', () => {
    const red = generarRed('geometrica', 300, 3);
    const t = red.numEstaciones - 1;
    const base = aEstrella(red, 0, t);
    for (const w of [1.2, 1.5, 2, 3]) {
      const r = aEstrella(red, 0, t, { pesoHeuristica: w });
      expect(r.alcanzado).toBe(true);
      expect(r.costo).toBeGreaterThanOrEqual(base.costo - 1e-9);
      expect(r.costo).toBeLessThanOrEqual(base.costo * w + 1e-9);
    }
    expect(aEstrella(red, 0, t, { pesoHeuristica: 3 }).contadores.expandidos).toBeLessThan(base.contadores.expandidos);
  });

  it('una heurística inadmisible puede perder la optimalidad', () => {
    // A → C → D cuesta 3 y A → B → D cuesta 4, pero h(C) enorme empuja hacia B
    const r = new RedTransporte('mala');
    ['A', 'B', 'C', 'D'].forEach((id, i) => r.agregarEstacion(id, i, 0));
    r.agregarVia(0, 1, 2, 2);
    r.agregarVia(1, 3, 2, 2);
    r.agregarVia(0, 2, 1, 1);
    r.agregarVia(2, 3, 2, 2);
    const h = Float64Array.from([0, 0, 50, 0]);
    expect(aEstrella(r, 0, 3).costo).toBe(3);
    expect(aEstrella(r, 0, 3, { h }).costo).toBe(4);
    expect(validarHeuristica(r, h, 3, 'km').admisible).toBe(false);
  });

  it('una h admisible pero inconsistente obliga a reabrir nodos, y sigue siendo óptima', () => {
    // Ejemplo clásico: el nodo C se cierra por un camino caro antes de hallar el barato
    const r = new RedTransporte('reabrir', true);
    ['S', 'A', 'B', 'C', 'T'].forEach((id, i) => r.agregarEstacion(id, i, 0));
    r.agregarVia(0, 1, 1, 1);
    r.agregarVia(0, 2, 3, 3);
    r.agregarVia(1, 2, 1, 1);
    r.agregarVia(2, 3, 1, 1);
    r.agregarVia(3, 4, 5, 5);
    const h = Float64Array.from([0, 5, 0, 0, 0]);
    const rep = validarHeuristica(r, h, 4, 'km');
    expect(rep.admisible).toBe(true);
    expect(rep.consistente).toBe(false);
    const a = aEstrella(r, 0, 4, { h });
    expect(a.costo).toBe(8);
    expect(a.contadores.reaperturas).toBeGreaterThan(0);
  });

  it('h(meta) ≠ 0 no es consistente y las vías más cortas que la recta se reportan', () => {
    const r = new RedTransporte('recta');
    r.agregarEstacion('A', 0, 0);
    r.agregarEstacion('B', 10, 0);
    r.agregarVia(0, 1, 1, 1);
    const h = heuristicaEuclidiana(r, 1, 'km');
    const rep = validarHeuristica(r, h, 1, 'km');
    expect(rep.viasMenoresQueRecta).toBe(1);
    expect(rep.admisible).toBe(false);
    expect(rep.consistencia.length).toBe(1);
    expect(validarHeuristica(r, Float64Array.from([0, 1]), 1, 'km').consistente).toBe(false);
  });
});

describe('Dijkstra: casos de borde y trazas', () => {
  it('rechaza pesos negativos', () => {
    const red = redDocente();
    const malos = new Float64Array(red.numArcos).fill(-1);
    expect(() => dijkstra(red, 0, 1, { pesos: malos })).toThrow();
    expect(() => dijkstraArreglo(red, 0, 1, { pesos: malos })).toThrow();
    expect(() => dijkstraPerezoso(red, 0, 1, { pesos: malos })).toThrow();
  });

  it('respeta arcos bloqueados en todas las variantes', () => {
    const red = redDocente();
    const b = new Uint8Array(red.numArcos).fill(1);
    for (const f of [dijkstra, dijkstraArreglo, dijkstraPerezoso]) {
      const r = f(red, 0, 7, { arcosBloqueados: b });
      expect(r.alcanzado).toBe(false);
      expect(r.saltos).toBe(-1);
      expect(r.costo).toBe(Infinity);
    }
    expect(aEstrella(red, 0, 7, { arcosBloqueados: b }).alcanzado).toBe(false);
    expect(dijkstra(red, 0).costo).toBe(Infinity);
  });

  it('el heap perezoso crece más que el indexado', () => {
    const red = generarRed('densa', 150, 2, { densidad: 0.4 });
    const a = dijkstra(red, 0);
    const b = dijkstraPerezoso(red, 0);
    expect(Array.from(b.d)).toEqual(Array.from(a.d));
    expect(b.contadores.maximoCola).toBeGreaterThan(a.contadores.maximoCola);
    expect(a.contadores.maximoCola).toBeLessThanOrEqual(150);
  });

  it('la traza de Dijkstra y A* incluye heap, sift y ruta final', () => {
    const red = redDocente();
    const t1 = new TracerMemoria();
    dijkstra(red, 0, 7, {}, t1);
    const p = t1.aArreglo();
    expect(p.some((x) => (x.heapIds?.length ?? 0) > 1)).toBe(true);
    expect(p.some((x) => x.heapIntercambio !== undefined)).toBe(true);
    expect(p.at(-1)?.narracion).toContain('costo 16');
    const t2 = new TracerMemoria();
    aEstrella(red, 0, 7, {}, t2);
    const q = t2.aArreglo();
    expect(q.some((x) => x.h !== undefined)).toBe(true);
    expect(q.some((x) => x.heapIntercambio !== undefined)).toBe(true);
    expect(q.some((x) => x.narracion.includes('no mejora'))).toBe(true);
    expect(q.at(-1)?.narracion).toContain('costo 16');
    const sin = new TracerMemoria();
    const b = new Uint8Array(red.numArcos).fill(1);
    dijkstra(red, 0, 7, { arcosBloqueados: b }, sin);
    expect(sin.aArreglo().at(-1)?.narracion).toContain('No hay ruta');
    const sin2 = new TracerMemoria();
    aEstrella(red, 0, 7, { arcosBloqueados: b }, sin2);
    expect(sin2.aArreglo().at(-1)?.narracion).toContain('No hay ruta');
  });

  it('costosHastaDestino respeta la dirección en redes dirigidas', () => {
    const r = new RedTransporte('d', true);
    ['A', 'B', 'C'].forEach((id, i) => r.agregarEstacion(id, i, 0));
    r.agregarVia(0, 1, 2, 5);
    r.agregarVia(1, 2, 3, 5);
    r.agregarVia(0, 2, 9, 1);
    expect(Array.from(costosHastaDestino(r, 2, 'km'))).toEqual([5, 3, 0]);
    expect(Array.from(costosHastaDestino(r, 2, 'min'))).toEqual([1, 5, 0]);
    expect(costosHastaDestino(r, 0, 'km')[2]).toBe(Infinity);
  });
});
