import { describe, expect, it } from 'vitest';
import { bfs } from '../src/core/algoritmos/bfs';
import { componentesConexas } from '../src/core/algoritmos/conectividad';
import { heuristicaEuclidiana, validarHeuristica } from '../src/core/algoritmos/heuristica';
import { enteroAzar, mulberry32 } from '../src/core/generadores/azar';
import { generarRed, redCuadricula, redDensa, redGeometrica, redMetro } from '../src/core/generadores/redes';
import { RedTransporte } from '../src/core/grafo/RedTransporte';
import type { RedJSON } from '../src/core/grafo/tipos';
import buenaventura from '../src/redes/buenaventura.json';
import fase1 from '../src/redes/fase1-12.json';

describe('PRNG', () => {
  it('es determinista, uniforme y distinto por semilla', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(xs.reduce((s, x) => s + x, 0) / 1000).toBeGreaterThan(0.45);
    expect(mulberry32(43)()).not.toBe(mulberry32(42)());
    const r = mulberry32(1);
    for (let i = 0; i < 200; i++) expect(enteroAzar(r, 7)).toBeLessThan(7);
  });
});

describe('generadores', () => {
  const tipos = ['geometrica', 'cuadricula', 'metro'] as const;

  for (const tipo of tipos) {
    it(`${tipo}: es conexa, reproducible y admisible para N = 10, 50, 100, 500`, () => {
      for (const n of [10, 50, 100, 500]) {
        const a = generarRed(tipo, n, 11);
        const b = generarRed(tipo, n, 11);
        expect(a.numEstaciones).toBe(n);
        expect(a.aJSON()).toEqual(b.aJSON());
        expect(componentesConexas(a).cantidad).toBe(1);
        const h = heuristicaEuclidiana(a, n - 1, 'km');
        const rep = validarHeuristica(a, h, n - 1, 'km');
        expect(rep.viasMenoresQueRecta).toBe(0);
        expect(rep.consistente).toBe(true);
      }
    });
  }

  it('geométrica llega a 5000 estaciones y es dispersa', () => {
    const r = redGeometrica(5000, 1);
    expect(r.numEstaciones).toBe(5000);
    expect(r.numVias).toBeLessThan(5000 * 4);
    expect(bfs(r, 0).visitados).toBe(5000);
  });

  it('las redes dirigidas siguen siendo fuertemente conexas', () => {
    for (const r of [redGeometrica(60, 2, { dirigida: true }), redCuadricula(60, 2, { dirigida: true }), redMetro(60, 2, { dirigida: true }), redDensa(40, 2, { dirigida: true, densidad: 0.1 })]) {
      expect(r.dirigida).toBe(true);
      for (let s = 0; s < 60 && s < r.numEstaciones; s += 13) expect(bfs(r, s).visitados).toBe(r.numEstaciones);
    }
  });

  it('densa tiene el orden de E esperado y es conexa', () => {
    const r = generarRed('densa', 200, 3, { densidad: 0.5 });
    expect(r.numVias).toBeGreaterThan(0.45 * (200 * 199) / 2);
    expect(r.numVias).toBeLessThan(0.56 * (200 * 199) / 2);
    expect(componentesConexas(r).cantidad).toBe(1);
  });

  it('metro marca sus líneas y conecta todas', () => {
    const r = redMetro(100, 8, { lineas: 4 });
    expect(r.estacion(0).linea).toBe('L1');
    expect(r.estacion(99).linea).toBe('L4');
    expect(componentesConexas(r).cantidad).toBe(1);
    expect(redMetro(20, 1).numEstaciones).toBe(20);
    expect(redMetro(400, 1).numEstaciones).toBe(400);
  });
});

describe('presets', () => {
  it('Fase 1 cumple el mínimo de 10 estaciones y es conexa', () => {
    const r = RedTransporte.desdeJSON(fase1 as RedJSON);
    expect(r.numEstaciones).toBe(12);
    expect(componentesConexas(r).cantidad).toBe(1);
  });

  it('Buenaventura tiene 30 a 40 estaciones, es conexa y admisible en km y minutos', () => {
    const r = RedTransporte.desdeJSON(buenaventura as RedJSON);
    expect(r.numEstaciones).toBeGreaterThanOrEqual(30);
    expect(r.numEstaciones).toBeLessThanOrEqual(40);
    expect(componentesConexas(r).cantidad).toBe(1);
    for (const m of ['km', 'min'] as const) {
      const rep = validarHeuristica(r, heuristicaEuclidiana(r, 0, m), 0, m);
      expect(rep.admisible).toBe(true);
      expect(rep.consistente).toBe(true);
    }
    for (let i = 0; i < r.numVias; i++) {
      const v = r.via(i);
      const f = v.distanciaKm / r.distanciaEuclidiana(v.origen, v.destino);
      expect(f).toBeGreaterThanOrEqual(1.15 - 1e-3);
      expect(f).toBeLessThanOrEqual(1.6 + 1e-3);
    }
  });
});
