import { describe, expect, it } from 'vitest';
import { aEstrella } from '../src/core/algoritmos/aEstrella';
import { bfs } from '../src/core/algoritmos/bfs';
import { dfsIterativo, dfsRecursivo } from '../src/core/algoritmos/dfs';
import { dijkstra, dijkstraArreglo } from '../src/core/algoritmos/dijkstra';
import { costosHastaDestino, heuristicaEuclidiana, validarHeuristica } from '../src/core/algoritmos/heuristica';
import { rutasSimples } from '../src/core/algoritmos/rutasSimples';
import { TracerMemoria } from '../src/core/instrumentacion/TracerMemoria';
import { redDocente, texto } from './ayudas';

/** Sección 3 del proyecto: la prueba de escritorio oficial, con resultados exactos. */
describe('prueba de escritorio de la red docente', () => {
  const red = redDocente();
  const i = (id: string) => red.indiceDe(id);

  it('tiene 8 estaciones, 11 vías y las listas de adyacencia exactas', () => {
    expect(red.numEstaciones).toBe(8);
    expect(red.numVias).toBe(11);
    expect(red.numArcos).toBe(22);
    const lista = (id: string) => {
      const r: string[] = [];
      for (let e = red.adj.primero(i(id)); e !== -1; e = red.adj.siguiente(e)) r.push(red.estacion(red.adj.destino(e)).id);
      return r.join(', ');
    };
    expect(lista('A')).toBe('B, C');
    expect(lista('B')).toBe('A, C, D');
    expect(lista('C')).toBe('A, B, D, E');
    expect(lista('D')).toBe('B, C, E, F');
    expect(lista('E')).toBe('C, D, F');
    expect(lista('F')).toBe('D, E, G');
    expect(lista('G')).toBe('F, H');
    expect(lista('H')).toBe('G');
  });

  it('BFS (A, E) da A → C → E con 2 saltos', () => {
    const r = bfs(red, i('A'), i('E'));
    expect(texto(red, r.ruta)).toBe('A → C → E');
    expect(r.saltos).toBe(2);
  });

  it('DFS (A, E) da A → B → C → D → E con 4 saltos, en las dos versiones', () => {
    const it1 = dfsIterativo(red, i('A'), i('E'));
    const rec = dfsRecursivo(red, i('A'), i('E'));
    expect(texto(red, it1.ruta)).toBe('A → B → C → D → E');
    expect(it1.saltos).toBe(4);
    expect(texto(red, rec.ruta)).toBe('A → B → C → D → E');
  });

  it('Dijkstra (A, F) da A → C → B → D → E → F con 13 km y cierra 6 nodos', () => {
    const r = dijkstra(red, i('A'), i('F'));
    expect(texto(red, r.ruta)).toBe('A → C → B → D → E → F');
    expect(r.costo).toBe(13);
    expect(r.contadores.expandidos).toBe(6);
    expect(texto(red, r.orden)).toBe('A → C → B → D → E → F');
    expect(dijkstraArreglo(red, i('A'), i('F')).costo).toBe(13);
  });

  it('A* (A, H) da A → C → B → D → E → F → G → H con 16 km y expande los 8 nodos', () => {
    const r = aEstrella(red, i('A'), i('H'));
    expect(texto(red, r.ruta)).toBe('A → C → B → D → E → F → G → H');
    expect(r.costo).toBe(16);
    expect(r.contadores.expandidos).toBe(8);
    expect(r.contadores.reaperturas).toBe(0);
  });

  it('hay exactamente 11 rutas simples de A a E, y la más barata cuesta 10 km', () => {
    const r = rutasSimples(red, i('A'), i('E'));
    expect(r.rutas.length).toBe(11);
    expect(r.truncado).toBe(false);
    expect(texto(red, r.rutas[0].estaciones)).toBe('A → C → B → D → E');
    expect(r.rutas[0].costo).toBe(10);
    for (let k = 1; k < r.rutas.length; k++) expect(r.rutas[k].costo).toBeGreaterThanOrEqual(r.rutas[k - 1].costo);
  });

  it('h es consistente y admisible, con los valores h/h* de la tabla', () => {
    const t = i('H');
    const h = heuristicaEuclidiana(red, t, 'km');
    const real = costosHastaDestino(red, t, 'km');
    const esperado: Record<string, [number, number]> = { A: [14.07, 16], C: [12.92, 14], B: [11.96, 13], D: [7.09, 8], E: [5.73, 6], F: [2.88, 3], G: [1.94, 2], H: [0, 0] };
    for (const [id, [hv, real0]] of Object.entries(esperado)) {
      expect(Number(h[i(id)].toFixed(2))).toBe(hv);
      expect(real[i(id)]).toBe(real0);
    }
    const reporte = validarHeuristica(red, h, t, 'km');
    expect(reporte.admisible).toBe(true);
    expect(reporte.consistente).toBe(true);
    expect(reporte.viasMenoresQueRecta).toBe(0);
  });

  it('los valores de la figura del docente serían inadmisibles', () => {
    const t = i('H');
    const h = heuristicaEuclidiana(red, t, 'km');
    h[i('F')] = 6.3;
    h[i('G')] = 2.2;
    const reporte = validarHeuristica(red, h, t, 'km');
    expect(reporte.admisible).toBe(false);
    expect(reporte.admisibilidad.map((v) => red.estacion(v.nodo).id).sort()).toEqual(['F', 'G']);
    expect(reporte.consistente).toBe(false);
  });

  it('en minutos da el mismo resultado, porque la red docente va a 1 km/min', () => {
    expect(aEstrella(red, i('A'), i('H'), { metrica: 'min' }).costo).toBe(16);
    expect(red.velocidadMaxima()).toBeCloseTo(1, 9);
    expect(validarHeuristica(red, heuristicaEuclidiana(red, i('H'), 'min'), i('H'), 'min').admisible).toBe(true);
  });

  it('las trazas son deterministas y narran lo que pide la especificación', () => {
    const correr = () => {
      const t = new TracerMemoria();
      dijkstra(red, i('A'), i('F'), {}, t);
      return t.aArreglo();
    };
    const a = correr();
    const b = correr();
    expect(a.map((p) => p.narracion)).toEqual(b.map((p) => p.narracion));
    expect(a.map((p) => p.linea)).toEqual(b.map((p) => p.linea));
    const textos = a.map((p) => p.narracion);
    expect(textos).toContain('Se extrae D del heap con d = 8.');
    expect(textos).toContain('Se relaja D → E: 8 + 2 = 10 < 12, se actualiza d[E] = 10 y π[E] = D.');
  });
});
