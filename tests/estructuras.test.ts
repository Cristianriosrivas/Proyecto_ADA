import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ArregloDinamico } from '../src/core/estructuras/ArregloDinamico';
import { ColaCircular } from '../src/core/estructuras/ColaCircular';
import { KDTree } from '../src/core/estructuras/KDTree';
import { ListaAdyacencia } from '../src/core/estructuras/ListaAdyacencia';
import { ListaEnlazada } from '../src/core/estructuras/ListaEnlazada';
import { MatrizAdyacencia } from '../src/core/estructuras/MatrizAdyacencia';
import { MinHeapIndexado } from '../src/core/estructuras/MinHeapIndexado';
import { MinHeapPerezoso } from '../src/core/estructuras/MinHeapPerezoso';
import { Pila } from '../src/core/estructuras/Pila';
import { fnv1a, TablaHash } from '../src/core/estructuras/TablaHash';

describe('ArregloDinamico', () => {
  it('crece, conserva el orden y controla el rango', () => {
    const a = new ArregloDinamico<number>(1);
    for (let i = 0; i < 100; i++) a.agregar(i);
    expect(a.tamano).toBe(100);
    expect(a.capacidad).toBeGreaterThanOrEqual(100);
    expect(a.obtener(37)).toBe(37);
    a.establecer(37, -1);
    expect(a.aArreglo()[37]).toBe(-1);
    expect(a.quitarUltimo()).toBe(99);
    expect(() => a.obtener(99)).toThrow(RangeError);
    expect(() => a.establecer(-1, 0)).toThrow(RangeError);
    a.vaciar();
    expect(a.tamano).toBe(0);
    expect(() => a.quitarUltimo()).toThrow(RangeError);
    expect(new ArregloDinamico<number>(0).capacidad).toBe(1);
  });
});

describe('ColaCircular', () => {
  it('cumple FIFO frente a un modelo, con crecimiento y vuelta del buffer', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.integer(), fc.constant(null))), (ops) => {
        const c = new ColaCircular<number>(2);
        const modelo: number[] = [];
        for (const op of ops) {
          if (op === null) {
            if (modelo.length > 0) expect(c.desencolar()).toBe(modelo.shift());
          } else {
            c.encolar(op);
            modelo.push(op);
          }
          expect(c.tamano).toBe(modelo.length);
          expect(c.aArreglo()).toEqual(modelo);
          if (modelo.length > 0) expect(c.frente()).toBe(modelo[0]);
        }
      }),
    );
  });

  it('avisa si está vacía y duplica su capacidad', () => {
    const c = new ColaCircular<number>(0);
    expect(c.estaVacia()).toBe(true);
    expect(() => c.desencolar()).toThrow(RangeError);
    expect(() => c.frente()).toThrow(RangeError);
    c.encolar(1);
    c.encolar(2);
    expect(c.capacidad).toBe(2);
    c.encolar(3);
    expect(c.capacidad).toBe(4);
  });
});

describe('Pila', () => {
  it('cumple LIFO frente a un modelo', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.integer(), fc.constant(null))), (ops) => {
        const p = new Pila<number>(1);
        const modelo: number[] = [];
        for (const op of ops) {
          if (op === null) {
            if (modelo.length > 0) expect(p.desapilar()).toBe(modelo.pop());
          } else {
            p.apilar(op);
            modelo.push(op);
          }
          expect(p.tamano).toBe(modelo.length);
          expect(p.aArreglo()).toEqual(modelo);
          if (modelo.length > 0) expect(p.cima()).toBe(modelo[modelo.length - 1]);
        }
      }),
    );
  });

  it('avisa si está vacía', () => {
    const p = new Pila<number>(0);
    expect(p.estaVacia()).toBe(true);
    expect(() => p.desapilar()).toThrow(RangeError);
    expect(() => p.cima()).toThrow(RangeError);
  });
});

describe('ListaEnlazada', () => {
  it('agrega al final, busca y elimina en cualquier posición', () => {
    const l = new ListaEnlazada<number>();
    expect(l.estaVacia()).toBe(true);
    [1, 2, 3, 4].forEach((v) => l.agregarAlFinal(v));
    expect(l.aArreglo()).toEqual([1, 2, 3, 4]);
    expect(l.buscar((v) => v > 2)).toBe(3);
    expect(l.buscar((v) => v > 9)).toBe(null);
    expect(l.eliminar((v) => v === 1)).toBe(true);
    expect(l.eliminar((v) => v === 4)).toBe(true);
    expect(l.eliminar((v) => v === 9)).toBe(false);
    l.agregarAlFinal(5);
    expect(l.aArreglo()).toEqual([2, 3, 5]);
    expect(l.tamano).toBe(3);
  });
});

describe('ListaAdyacencia', () => {
  it('conserva el orden de inserción, también al recorrer al revés', () => {
    const a = new ListaAdyacencia(1, 1);
    for (let i = 0; i < 5; i++) a.agregarVertice();
    [4, 2, 3, 1].forEach((v, i) => a.agregarArco(0, v, v * 2, i));
    const hacia: number[] = [];
    for (let e = a.primero(0); e !== -1; e = a.siguiente(e)) hacia.push(a.destino(e));
    const atras: number[] = [];
    for (let e = a.ultimo(0); e !== -1; e = a.anterior(e)) atras.push(a.destino(e));
    expect(hacia).toEqual([4, 2, 3, 1]);
    expect(atras).toEqual([1, 3, 2, 4]);
    expect(a.grado(0)).toBe(4);
    expect(a.grado(1)).toBe(0);
    expect(a.primero(1)).toBe(-1);
    expect(a.distanciaKm(a.primero(0))).toBe(8);
    expect(a.tiempoMin(a.ultimo(0))).toBe(3);
    expect([...a.copiarPesos('km')]).toEqual([8, 4, 6, 2]);
    expect([...a.copiarPesos('min')]).toEqual([0, 1, 2, 3]);
    expect(a.numVertices).toBe(5);
    expect(a.numArcos).toBe(4);
    expect(a.bytesTeoricos()).toBe(5 * 12 + 4 * 28);
  });
});

describe('MatrizAdyacencia', () => {
  it('guarda pesos y calcula grados barriendo la fila', () => {
    const m = new MatrizAdyacencia(3);
    m.poner(0, 1, 2.5);
    m.poner(0, 2, 1);
    expect(m.peso(0, 1)).toBe(2.5);
    expect(m.existe(1, 0)).toBe(false);
    expect(m.grado(0)).toBe(2);
    expect(m.bytesTeoricos()).toBe(72);
  });
});

describe('MinHeapIndexado', () => {
  it('mantiene la propiedad de heap después de cada operación y extrae en orden', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.integer({ min: 0, max: 40 }), fc.integer({ min: 0, max: 100 })), { maxLength: 120 }), (ops) => {
        const h = new MinHeapIndexado(41);
        const modelo: (number | undefined)[] = new Array(41).fill(undefined);
        for (const [id, clave] of ops) {
          if (!h.contiene(id)) {
            h.insertar(id, clave);
            modelo[id] = clave;
          } else if (clave < (modelo[id] as number)) {
            h.disminuirClave(id, clave);
            modelo[id] = clave;
          } else {
            h.actualizarClave(id, clave);
            modelo[id] = clave;
          }
          expect(h.esValido()).toBe(true);
        }
        const esperado = modelo
          .map((c, id) => ({ c, id }))
          .filter((x) => x.c !== undefined)
          .sort((a, b) => (a.c as number) - (b.c as number) || a.id - b.id)
          .map((x) => x.id);
        const real: number[] = [];
        while (!h.estaVacio()) {
          real.push(h.extraerMin());
          expect(h.esValido()).toBe(true);
        }
        expect(real).toEqual(esperado);
      }),
    );
  });

  it('desempata por el id menor', () => {
    const h = new MinHeapIndexado(5);
    [3, 1, 4, 0, 2].forEach((id) => h.insertar(id, 7));
    expect([h.extraerMin(), h.extraerMin(), h.extraerMin()]).toEqual([0, 1, 2]);
  });

  it('BUILD-MIN-HEAP queda válido y cuenta menos de 2n comparaciones por nivel', () => {
    const n = 1000;
    const ids = Int32Array.from({ length: n }, (_, i) => i);
    const claves = Float64Array.from({ length: n }, (_, i) => (i * 7919) % n);
    const h = new MinHeapIndexado(n);
    h.construir(ids, claves);
    expect(h.esValido()).toBe(true);
    expect(h.tamano).toBe(n);
    // BUILD-HEAP es O(n): a lo sumo unas 2n comparaciones por nivel recorrido, sin factor lg n
    expect(h.comparaciones).toBeLessThan(4 * n);
    expect(h.clave(h.minimo())).toBe(0);
    expect(h.fotoIds().length).toBe(n);
    h.construir(ids.subarray(0, 3), claves.subarray(0, 3));
    expect(h.tamano).toBe(3);
    expect(h.contiene(10)).toBe(false);
  });

  it('valida su uso y avisa al observador', () => {
    const h = new MinHeapIndexado(3);
    const eventos: string[] = [];
    h.observador = (e) => eventos.push(e.tipo);
    expect(() => h.minimo()).toThrow(RangeError);
    expect(() => h.extraerMin()).toThrow(RangeError);
    h.insertar(0, 5);
    expect(() => h.insertar(0, 1)).toThrow();
    expect(() => h.disminuirClave(1, 1)).toThrow();
    expect(() => h.actualizarClave(1, 1)).toThrow();
    expect(() => h.disminuirClave(0, 9)).toThrow();
    h.insertar(1, 3);
    h.insertar(2, 1);
    expect(() => h.insertar(2, 1)).toThrow();
    expect(() => h.construir(new Int32Array(9), new Float64Array(9))).toThrow(RangeError);
    expect(eventos).toContain('subir');
    const otro = new MinHeapIndexado(4);
    otro.observador = (e) => eventos.push(e.tipo);
    [1, 5, 2, 9].forEach((clave, id) => otro.insertar(id, clave));
    otro.extraerMin();
    expect(eventos).toContain('bajar');
    const lleno = new MinHeapIndexado(1);
    lleno.insertar(0, 1);
    expect(() => lleno.insertar(0, 1)).toThrow();
  });

  it('esValido detecta un heap dañado', () => {
    const h = new MinHeapIndexado(3);
    h.insertar(0, 1);
    h.insertar(1, 2);
    h.insertar(2, 3);
    (h as unknown as { claves: Float64Array }).claves[0] = 99;
    expect(h.esValido()).toBe(false);
    const g = new MinHeapIndexado(3);
    g.insertar(0, 1);
    (g as unknown as { posicion: Int32Array }).posicion[0] = 2;
    expect(g.esValido()).toBe(false);
  });
});

describe('MinHeapPerezoso', () => {
  it('extrae en orden, crece y registra su máximo', () => {
    const h = new MinHeapPerezoso(1);
    const claves = [5, 3, 8, 1, 9, 2, 7];
    claves.forEach((c, i) => h.insertar(i, c));
    expect(h.maximo).toBe(7);
    expect(h.tamano).toBe(7);
    const salida: number[] = [];
    while (!h.estaVacio()) {
      salida.push(h.claveMinima());
      h.extraerId();
    }
    expect(salida).toEqual([1, 2, 3, 5, 7, 8, 9]);
    expect(() => h.extraerId()).toThrow(RangeError);
    expect(() => h.claveMinima()).toThrow(RangeError);
  });
});

describe('TablaHash', () => {
  it('fnv1a da los valores publicados', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  it('se comporta como un diccionario frente a un modelo', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.string({ maxLength: 4 }), fc.integer(), fc.boolean()), { maxLength: 200 }), (ops) => {
        const t = new TablaHash<number>(1);
        const modelo = new Map<string, number>();
        for (const [k, v, borrar] of ops) {
          if (borrar) expect(t.eliminar(k)).toBe(modelo.delete(k));
          else {
            t.poner(k, v);
            modelo.set(k, v);
          }
          expect(t.tamano).toBe(modelo.size);
          expect(t.obtener(k)).toBe(modelo.get(k));
          expect(t.contiene(k)).toBe(modelo.has(k));
        }
        expect(t.claves().sort()).toEqual([...modelo.keys()].sort());
      }),
    );
  });

  it('redimensiona al pasar de 0.75, sin perder entradas ni encadenar de más', () => {
    const t = new TablaHash<number>(4);
    for (let i = 0; i < 5000; i++) {
      t.poner(`estacion-${i}`, i);
      expect(t.factorCarga).toBeLessThanOrEqual(0.75);
    }
    expect(t.redimensionamientos).toBeGreaterThan(5);
    for (let i = 0; i < 5000; i++) expect(t.obtener(`estacion-${i}`)).toBe(i);
    expect(t.cubetaMasLarga()).toBeLessThan(12);
    expect(t.numCubetas).toBeGreaterThan(5000 / 0.75);
  });

  it('resuelve colisiones en una sola cubeta', () => {
    const t = new TablaHash<number>(1);
    t.poner('a', 1);
    expect(t.numCubetas).toBe(2);
    t.poner('a', 2);
    expect(t.obtener('a')).toBe(2);
    expect(t.tamano).toBe(1);
  });
});

describe('KDTree', () => {
  const fuerzaBruta = (xs: number[], ys: number[], px: number, py: number, k: number, excluir: number) =>
    xs
      .map((x, i) => ({ i, d: (x - px) ** 2 + (ys[i] - py) ** 2 }))
      .filter((p) => p.i !== excluir)
      .sort((a, b) => a.d - b.d || a.i - b.i)
      .slice(0, k)
      .map((p) => p.i);

  it('coincide con la fuerza bruta en puntos aleatorios', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 })), { minLength: 1, maxLength: 80 }),
        fc.integer({ min: -60, max: 60 }),
        fc.integer({ min: -60, max: 60 }),
        fc.integer({ min: 1, max: 6 }),
        (puntos, px, py, k) => {
          const xs = puntos.map((p) => p[0]);
          const ys = puntos.map((p) => p[1]);
          const t = new KDTree(xs, ys);
          expect(t.tamano).toBe(puntos.length);
          expect([...t.kMasCercanos(px, py, k)]).toEqual(fuerzaBruta(xs, ys, px, py, k, -1));
          expect(t.masCercano(px, py)).toBe(fuerzaBruta(xs, ys, px, py, 1, -1)[0]);
          expect([...t.kMasCercanos(xs[0], ys[0], k, 0)]).toEqual(fuerzaBruta(xs, ys, xs[0], ys[0], k, 0));
        },
      ),
    );
  });

  it('visita pocos nodos en un conjunto grande y maneja el vacío', () => {
    const n = 4096;
    const xs = Array.from({ length: n }, (_, i) => (i * 2654435761) % 10007);
    const ys = Array.from({ length: n }, (_, i) => (i * 40503) % 10007);
    const t = new KDTree(xs, ys);
    t.masCercano(5000, 5000);
    expect(t.visitados).toBeLessThan(n / 8);
    expect(new KDTree([], []).masCercano(0, 0)).toBe(-1);
  });
});
