import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bfs, bfsMatriz } from '../src/core/algoritmos/bfs';
import { numero, reconstruirRuta, textoRuta } from '../src/core/algoritmos/comun';
import { alcanzablesDesde, componentesConexas, estanConectadas, puntosCriticos } from '../src/core/algoritmos/conectividad';
import { dfsIterativo, dfsMatriz, dfsRecursivo } from '../src/core/algoritmos/dfs';
import { rutasSimples } from '../src/core/algoritmos/rutasSimples';
import { RedTransporte, validarRedJSON } from '../src/core/grafo/RedTransporte';
import type { RedJSON } from '../src/core/grafo/tipos';
import { ESTADO } from '../src/core/instrumentacion/tipos';
import { TracerMemoria } from '../src/core/instrumentacion/TracerMemoria';
import { construir, floydWarshall, redDocente, type GrafoAzar } from './ayudas';

const grafoAzar = (dirigida?: boolean) =>
  fc
    .record({ n: fc.integer({ min: 2, max: 14 }), dirigida: dirigida === undefined ? fc.boolean() : fc.constant(dirigida) })
    .chain(({ n, dirigida: d }) =>
      fc.record({
        n: fc.constant(n),
        dirigida: fc.constant(d),
        aristas: fc.array(fc.tuple(fc.integer({ min: 0, max: n - 1 }), fc.integer({ min: 0, max: n - 1 }), fc.constant(1)), { maxLength: 40 }),
      }),
    ) as fc.Arbitrary<GrafoAzar>;

describe('RedTransporte', () => {
  it('serializa y reconstruye la red con el mismo orden', () => {
    const red = redDocente();
    const copia = RedTransporte.desdeJSON(red.aJSON());
    expect(copia.aJSON()).toEqual(red.aJSON());
    expect(copia.numArcos).toBe(22);
  });

  it('valida con mensajes claros', () => {
    expect(validarRedJSON(null as unknown as RedJSON)).toEqual(['El archivo no contiene una red.']);
    expect(validarRedJSON({} as RedJSON).length).toBe(2);
    const mala: RedJSON = {
      nombre: 'x',
      dirigida: false,
      estaciones: [
        { id: 'A', x: 0, y: 0 },
        { id: 'A', x: 1, y: NaN },
        { id: '', x: 0, y: 0 },
      ],
      vias: [{ desde: 'A', hasta: 'Z', distanciaKm: -1, tiempoMin: 1 }, { desde: 'Q', hasta: 'A', distanciaKm: 1, tiempoMin: 1 }],
    };
    const errores = validarRedJSON(mala);
    expect(errores.some((e) => e.includes('repetido'))).toBe(true);
    expect(errores.some((e) => e.includes('coordenadas'))).toBe(true);
    expect(errores.some((e) => e.includes('no tiene id'))).toBe(true);
    expect(errores.some((e) => e.includes('Z'))).toBe(true);
    expect(errores.some((e) => e.includes('Q'))).toBe(true);
    expect(errores.some((e) => e.includes('negativo'))).toBe(true);
    expect(() => RedTransporte.desdeJSON(mala)).toThrow();
  });

  it('rechaza estaciones repetidas, índices inválidos y pesos negativos', () => {
    const r = new RedTransporte('x');
    r.agregarEstacion('A', 0, 0);
    r.agregarEstacion('B', 1, 0);
    expect(() => r.agregarEstacion('A', 0, 0)).toThrow();
    expect(() => r.agregarVia(0, 9, 1, 1)).toThrow(RangeError);
    expect(() => r.agregarVia(0, 1, -1, 1)).toThrow();
    expect(r.indiceDe('Z')).toBe(-1);
  });

  it('distingue redes dirigidas: un solo arco por vía', () => {
    const r = new RedTransporte('d', true);
    r.agregarEstacion('A', 0, 0);
    r.agregarEstacion('B', 3, 4);
    const via = r.agregarVia(0, 1, 5, 2);
    expect(r.numArcos).toBe(1);
    expect(r.via(via).arcoInverso).toBe(-1);
    expect(r.existeArco(0, 1)).toBe(true);
    expect(r.existeArco(1, 0)).toBe(false);
    expect(r.distanciaEuclidiana(0, 1)).toBe(5);
    expect(r.velocidadMaxima()).toBe(2.5);
    expect(r.origenDeArco(0)).toBe(0);
    expect(r.viaDeArco(0)).toBe(via);
    expect(r.matriz('min').peso(0, 1)).toBe(2);
    expect(r.pesos('km')[0]).toBe(5);
    expect(r.listaInvertida().grado(1)).toBe(1);
    expect(r.listaNoDirigida().grado(1)).toBe(1);
    expect(new RedTransporte('v').velocidadMaxima()).toBe(1);
  });
});

describe('BFS', () => {
  it('da el mínimo de saltos en grafos aleatorios', () => {
    fc.assert(
      fc.property(grafoAzar(), (g) => {
        const red = construir(g);
        const d = floydWarshall(g);
        for (let s = 0; s < g.n; s++) {
          const r = bfs(red, s);
          for (let t = 0; t < g.n; t++) expect(r.d[t] === -1 ? Infinity : r.d[t]).toBe(d[s][t]);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('ejecuta exactamente |V| y Σ deg = 2|E| iteraciones en un grafo no dirigido conexo', () => {
    const red = redDocente();
    const r = bfs(red, 0);
    expect(r.contadores.externas).toBe(8);
    expect(r.contadores.internas).toBe(22);
    expect(r.contadores.insertados).toBe(8);
    expect(r.contadores.maximoEstructura).toBeLessThanOrEqual(8);
  });

  it('en un grafo dirigido el ciclo interno da |E|', () => {
    const r = new RedTransporte('c', true);
    for (let i = 0; i < 4; i++) r.agregarEstacion(`N${i}`, i, 0);
    [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]].forEach(([u, v]) => r.agregarVia(u, v, 1, 1));
    const b = bfs(r, 0);
    expect(b.contadores.externas).toBe(4);
    expect(b.contadores.internas).toBe(5);
  });

  it('respeta vías bloqueadas, destino inalcanzable y origen igual a destino', () => {
    const red = redDocente();
    const bloqueados = new Uint8Array(red.numArcos);
    for (let e = 0; e < red.numArcos; e++) {
      const v = red.via(red.viaDeArco(e));
      if ((v.origen === red.indiceDe('G') && v.destino === red.indiceDe('H')) || (v.origen === red.indiceDe('H') && v.destino === red.indiceDe('G'))) bloqueados[e] = 1;
    }
    const a = red.indiceDe('A');
    const h = red.indiceDe('H');
    const r = bfs(red, a, h, { arcosBloqueados: bloqueados });
    expect(r.alcanzado).toBe(false);
    expect(r.saltos).toBe(-1);
    const igual = bfs(red, a, a);
    expect(igual.saltos).toBe(0);
    expect(Array.from(igual.ruta)).toEqual([a]);
  });

  it('registra pasos con cola, estados y ruta final', () => {
    const red = redDocente();
    const t = new TracerMemoria();
    const r = bfs(red, 0, 4, {}, t);
    const pasos = t.aArreglo();
    expect(pasos.length).toBeGreaterThan(5);
    expect(pasos[0].linea).toBe(2);
    expect(pasos[pasos.length - 1].estados[4]).toBe(ESTADO.RUTA);
    expect(pasos.some((p) => (p.cola ?? []).length > 0)).toBe(true);
    expect(pasos[pasos.length - 1].narracion).toContain('2 saltos');
    expect(r.saltos).toBe(2);
    const sinRuta = new TracerMemoria();
    const aislada = new RedTransporte('i');
    aislada.agregarEstacion('A', 0, 0);
    aislada.agregarEstacion('B', 1, 0);
    bfs(aislada, 0, 1, {}, sinRuta);
    expect(sinRuta.aArreglo().at(-1)?.narracion).toContain('No hay ruta');
  });

  it('sobre matriz da las mismas distancias y barre V² celdas', () => {
    const red = redDocente();
    const m = bfsMatriz(red.matriz('km'), 0);
    expect(Array.from(m.d)).toEqual(Array.from(bfs(red, 0).d));
    expect(m.celdas).toBe(64);
  });
});

describe('DFS', () => {
  it('la versión iterativa da el mismo resultado que la recursiva en grafos aleatorios', () => {
    fc.assert(
      fc.property(grafoAzar(), fc.integer({ min: 0, max: 13 }), (g, s0) => {
        const red = construir(g);
        const s = s0 % g.n;
        const a = dfsIterativo(red, s);
        const b = dfsRecursivo(red, s);
        expect(Array.from(a.orden.subarray(0, a.visitados))).toEqual(Array.from(b.orden.subarray(0, b.visitados)));
        expect(Array.from(a.pi)).toEqual(Array.from(b.pi));
        expect(Array.from(a.d)).toEqual(Array.from(b.d));
        expect(a.contadores.internas).toBe(b.contadores.internas);
        for (let t = 0; t < g.n; t++) {
          const x = dfsIterativo(red, s, t);
          const y = dfsRecursivo(red, s, t);
          expect(Array.from(x.ruta)).toEqual(Array.from(y.ruta));
        }
      }),
      { numRuns: 200 },
    );
  });

  it('ejecuta Σ deg iteraciones internas y usa a lo sumo 2|E| + 1 apilados', () => {
    const red = redDocente();
    const r = dfsIterativo(red, 0);
    expect(r.visitados).toBe(8);
    expect(r.contadores.internas).toBe(22);
    expect(r.contadores.insertados).toBeLessThanOrEqual(23);
    expect(r.contadores.externas).toBe(r.contadores.insertados);
  });

  it('funciona en una cadena de 5000 estaciones, también en recursivo', () => {
    const r = new RedTransporte('c');
    for (let i = 0; i < 5000; i++) r.agregarEstacion(`N${i}`, i, 0);
    for (let i = 1; i < 5000; i++) r.agregarVia(i - 1, i, 1, 1);
    expect(dfsIterativo(r, 0, 4999).saltos).toBe(4999);
    expect(dfsRecursivo(r, 0, 4999).saltos).toBe(4999);
    expect(puntosCriticos(r).articulaciones.length).toBe(4998);
  });

  it('respeta vías bloqueadas y registra la pila de pares', () => {
    const red = redDocente();
    const bloqueados = new Uint8Array(red.numArcos).fill(1);
    expect(dfsIterativo(red, 0, 7, { arcosBloqueados: bloqueados }).alcanzado).toBe(false);
    expect(dfsRecursivo(red, 0, 7, { arcosBloqueados: bloqueados }).alcanzado).toBe(false);
    const t = new TracerMemoria();
    dfsIterativo(red, 0, 4, {}, t);
    const pasos = t.aArreglo();
    expect(pasos.some((p) => (p.pilaNodos ?? []).length > 1)).toBe(true);
    expect(pasos.at(-1)?.narracion).toContain('4 saltos');
    const completo = new TracerMemoria();
    dfsIterativo(red, 0, -1, {}, completo);
    expect(completo.aArreglo().some((p) => p.linea === 6)).toBe(true);
    const vacio = new TracerMemoria();
    dfsIterativo(red, 0, 7, { arcosBloqueados: bloqueados }, vacio);
    expect(vacio.aArreglo().at(-1)?.narracion).toContain('No hay ruta');
  });

  it('sobre matriz visita lo mismo y barre V² celdas', () => {
    const red = redDocente();
    const m = dfsMatriz(red.matriz('km'), 0);
    expect(m.visitados).toBe(8);
    expect(m.celdas).toBe(64);
  });
});

describe('rutas simples', () => {
  it('coincide con una enumeración ingenua y la poda no pierde rutas válidas', () => {
    fc.assert(
      fc.property(grafoAzar(false), (g) => {
        const red = construir(g);
        const ingenua = (s: number, t: number): number => {
          let c = 0;
          const ir = (u: number, vis: number[]) => {
            if (u === t) {
              c++;
              return;
            }
            for (let e = red.adj.primero(u); e !== -1; e = red.adj.siguiente(e)) {
              const v = red.adj.destino(e);
              if (!vis.includes(v)) ir(v, [...vis, v]);
            }
          };
          ir(s, [s]);
          return c;
        };
        const t = g.n - 1;
        expect(rutasSimples(red, 0, t, { limite: 1e6 }).rutas.length).toBe(ingenua(0, t));
      }),
      { numRuns: 60 },
    );
  });

  it('aplica el límite y la poda por costo', () => {
    const red = redDocente();
    const a = red.indiceDe('A');
    const e = red.indiceDe('E');
    const lim = rutasSimples(red, a, e, { limite: 3 });
    expect(lim.rutas.length).toBe(3);
    expect(lim.truncado).toBe(true);
    const poda = rutasSimples(red, a, e, { costoMaximo: 12 });
    expect(poda.podas).toBeGreaterThan(0);
    expect(poda.rutas.every((r) => r.costo <= 12)).toBe(true);
    expect(poda.nodosExplorados).toBeLessThan(rutasSimples(red, a, e).nodosExplorados);
    expect(rutasSimples(red, a, e, { arcosBloqueados: new Uint8Array(red.numArcos).fill(1) }).rutas.length).toBe(0);
  });
});

describe('conectividad', () => {
  it('detecta componentes y alcanzabilidad en redes dirigidas', () => {
    const r = new RedTransporte('d', true);
    for (let i = 0; i < 5; i++) r.agregarEstacion(`N${i}`, i, 0);
    r.agregarVia(0, 1, 1, 1);
    r.agregarVia(1, 2, 1, 1);
    r.agregarVia(3, 4, 1, 1);
    expect(estanConectadas(r, 0, 2)).toBe(true);
    expect(estanConectadas(r, 2, 0)).toBe(false);
    expect(Array.from(alcanzablesDesde(r, 0))).toEqual([0, 1, 2]);
    const c = componentesConexas(r);
    expect(c.cantidad).toBe(2);
    expect(Array.from(c.tamanos)).toEqual([3, 2]);
    expect(c.de[0]).toBe(c.de[2]);
  });

  it('coincide con la clausura transitiva en grafos aleatorios', () => {
    fc.assert(
      fc.property(grafoAzar(false), (g) => {
        const red = construir(g);
        const d = floydWarshall(g);
        const c = componentesConexas(red);
        for (let i = 0; i < g.n; i++) for (let j = 0; j < g.n; j++) expect(c.de[i] === c.de[j]).toBe(d[i][j] !== Infinity);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Tarjan', () => {
  const componentesSin = (g: GrafoAzar, quitarNodo: number, quitarArista: number): number => {
    const vivo = (i: number) => i !== quitarNodo;
    const vis = new Array<boolean>(g.n).fill(false);
    let c = 0;
    for (let i = 0; i < g.n; i++) {
      if (!vivo(i) || vis[i]) continue;
      c++;
      const pila = [i];
      vis[i] = true;
      while (pila.length) {
        const u = pila.pop() as number;
        g.aristas.forEach(([a, b], k) => {
          if (a === b || k === quitarArista || !vivo(a) || !vivo(b)) return;
          const w = a === u ? b : b === u ? a : -1;
          if (w !== -1 && !vis[w]) {
            vis[w] = true;
            pila.push(w);
          }
        });
      }
    }
    return c;
  };

  it('coincide con quitar cada nodo y cada vía por fuerza bruta', () => {
    fc.assert(
      fc.property(grafoAzar(false), (g) => {
        const limpio: GrafoAzar = { ...g, aristas: g.aristas.filter(([u, v]) => u !== v) };
        const red = construir(limpio);
        const p = puntosCriticos(red);
        const base = componentesSin(limpio, -1, -1);
        for (let u = 0; u < g.n; u++) {
          const sinU = componentesSin(limpio, u, -1);
          const aislado = !limpio.aristas.some(([a, b]) => a === u || b === u);
          const esperado = sinU - (base - (aislado ? 1 : 0)) + 1;
          expect(p.partesAlFallar[u]).toBe(esperado);
          expect(Array.from(p.articulaciones).includes(u)).toBe(esperado > 1);
        }
        limpio.aristas.forEach((_, k) => expect(Array.from(p.puentes).includes(k)).toBe(componentesSin(limpio, -1, k) > base));
      }),
      { numRuns: 150 },
    );
  });

  it('halla los puntos críticos de la red docente y sirve en redes dirigidas', () => {
    const red = redDocente();
    const p = puntosCriticos(red);
    expect(Array.from(p.articulaciones, (i) => red.estacion(i).id)).toEqual(['F', 'G']);
    expect(Array.from(p.puentes, (i) => `${red.estacion(red.via(i).origen).id}-${red.estacion(red.via(i).destino).id}`).sort()).toEqual(['F-G', 'G-H']);
    const d = new RedTransporte('d', true);
    for (let i = 0; i < 3; i++) d.agregarEstacion(`N${i}`, i, 0);
    d.agregarVia(0, 1, 1, 1);
    d.agregarVia(1, 2, 1, 1);
    expect(Array.from(puntosCriticos(d).articulaciones)).toEqual([1]);
  });

  it('dos vías paralelas no forman un puente', () => {
    const r = new RedTransporte('p');
    r.agregarEstacion('A', 0, 0);
    r.agregarEstacion('B', 1, 0);
    r.agregarVia(0, 1, 1, 1);
    r.agregarVia(0, 1, 2, 2);
    expect(puntosCriticos(r).puentes.length).toBe(0);
  });
});

describe('utilidades', () => {
  it('reconstruye rutas y da formato', () => {
    const pi = Int32Array.from([-1, 0, 1, -1]);
    expect(Array.from(reconstruirRuta(pi, 0, 2))).toEqual([0, 1, 2]);
    expect(reconstruirRuta(pi, 0, 3).length).toBe(0);
    expect(textoRuta(Int32Array.from([1, 2]), (i) => `N${i}`)).toBe('N1 → N2');
    expect(numero(Infinity)).toBe('∞');
    expect(numero(3)).toBe('3');
    expect(numero(2.5)).toBe('2.50');
  });

  it('TracerMemoria respeta su tope', () => {
    const t = new TracerMemoria(3);
    bfs(redDocente(), 0, -1, {}, t);
    expect(t.cantidad).toBe(3);
    expect(t.truncado).toBe(true);
  });
});
