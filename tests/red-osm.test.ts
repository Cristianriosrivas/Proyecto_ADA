import { describe, expect, it } from 'vitest';
import { aEstrella } from '../src/core/algoritmos/aEstrella';
import { estanConectadas } from '../src/core/algoritmos/conectividad';
import { dijkstra } from '../src/core/algoritmos/dijkstra';
import { heuristicaEuclidiana, validarHeuristica } from '../src/core/algoritmos/heuristica';
import { cargarRedOSM, georreferencia, kmAPixelMundo, metrosPorPixel } from '../src/redes/osm';

/** La red de calles reales de Buenaventura, tomada de OpenStreetMap. */
describe('red de calles reales (OpenStreetMap)', () => {
  const red = cargarRedOSM();
  const geo = georreferencia(red)!;
  const buscar = (prefijo: string) => {
    for (let i = 0; i < red.numEstaciones; i++) if (red.estacion(i).nombre.startsWith(prefijo)) return i;
    return -1;
  };

  it('es una red dirigida de miles de cruces, con su georreferencia y su atribución', () => {
    expect(red.dirigida).toBe(true);
    expect(red.numEstaciones).toBeGreaterThan(4000);
    expect(red.numVias).toBe(red.numArcos);
    expect(geo).toBeDefined();
    expect(geo.fuente).toContain('OpenStreetMap');
    expect(geo.clase.length).toBe(red.numVias);
    expect(geo.fondo.costa.length).toBeGreaterThan(0);
  });

  it('cada tramo de doble sentido tiene su gemela en sentido contrario, con el mismo largo', () => {
    let dobles = 0;
    for (let i = 0; i < red.numVias; i++) {
      const j = geo.gemela[i];
      if (j < 0) continue;
      dobles++;
      expect(geo.gemela[j]).toBe(i);
      expect(red.via(j).origen).toBe(red.via(i).destino);
      expect(red.via(j).distanciaKm).toBe(red.via(i).distanciaKm);
    }
    // Hay calles de un solo sentido: no todas las vías tienen gemela
    expect(dobles).toBeGreaterThan(0);
    expect(dobles).toBeLessThan(red.numVias);
  });

  it('ninguna vía mide menos que la línea recta: la heurística euclidiana es consistente', () => {
    for (let i = 0; i < red.numVias; i++) {
      const v = red.via(i);
      expect(v.distanciaKm).toBeGreaterThanOrEqual(red.distanciaEuclidiana(v.origen, v.destino));
    }
    const t = buscar('Universidad del Valle');
    for (const metrica of ['km', 'min'] as const) {
      const r = validarHeuristica(red, heuristicaEuclidiana(red, t, metrica), t, metrica);
      expect(r.admisible).toBe(true);
      expect(r.consistente).toBe(true);
    }
  });

  it('A* da el mismo costo que Dijkstra en 60 consultas al azar, y expande menos', () => {
    let semilla = 2026;
    const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    let expD = 0;
    let expA = 0;
    for (let q = 0; q < 60; q++) {
      const s = Math.floor(azar() * red.numEstaciones);
      const t = Math.floor(azar() * red.numEstaciones);
      const metrica = q % 2 === 0 ? 'km' : 'min';
      const d = dijkstra(red, s, t, { metrica });
      const a = aEstrella(red, s, t, { metrica });
      // La red es fuertemente conexa: toda consulta tiene ruta
      expect(d.alcanzado).toBe(true);
      expect(a.costo).toBeCloseTo(d.costo, 9);
      expD += d.contadores.expandidos;
      expA += a.contadores.expandidos;
    }
    expect(expA).toBeLessThan(expD);
  });

  it('los lugares conocidos están en la red: del Malecón a la Universidad del Valle hay ruta', () => {
    const malecon = buscar('Malecón');
    const univalle = buscar('Universidad del Valle');
    expect(malecon).toBe(0);
    expect(univalle).toBe(red.numEstaciones - 1);
    expect(geo.lugares.length).toBeGreaterThan(20);
    const r = dijkstra(red, malecon, univalle, { metrica: 'km' });
    expect(r.alcanzado).toBe(true);
    // La ruta por calles es más larga que la línea recta, pero no absurdamente
    const recta = red.distanciaEuclidiana(malecon, univalle);
    expect(r.costo).toBeGreaterThan(recta);
    expect(r.costo).toBeLessThan(recta * 1.6);
  });

  it('si se cae el Puente El Piñal, la isla queda incomunicada; la Vía Alterna no la conecta', () => {
    const malecon = buscar('Malecón');
    const univalle = buscar('Universidad del Valle');
    const bloquear = (nombre: string) => {
      const b = new Uint8Array(red.numArcos);
      for (const v of geo.puentes.find((p) => p.nombre.startsWith(nombre))!.vias) b[red.via(v).arco] = 1;
      return b;
    };
    expect(estanConectadas(red, malecon, univalle, bloquear('Puente El Piñal'))).toBe(false);
    expect(estanConectadas(red, malecon, univalle, bloquear('Puente de la Vía Alterna'))).toBe(true);
  });

  it('la proyección coincide con las teselas: 1 km en la red mide 1 km en el mapa real', () => {
    const z = 16;
    const a = kmAPixelMundo(geo, 0, 0, z);
    const b = kmAPixelMundo(geo, 1, 0, z);
    const c = kmAPixelMundo(geo, 0, 1, z);
    const mpp = metrosPorPixel(geo, z);
    expect((b.px - a.px) * mpp).toBeCloseTo(1000, 6);
    // Hacia el norte la y de las teselas disminuye
    expect((a.py - c.py) * mpp).toBeCloseTo(1000, 6);
    // El origen cae en la tesela de Buenaventura en el zoom 15
    const o = kmAPixelMundo(geo, 0, 0, 15);
    expect(Math.floor(o.px / 256)).toBeGreaterThan(9360);
    expect(Math.floor(o.px / 256)).toBeLessThan(9380);
  });
});
