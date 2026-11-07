// CLI de respaldo por si falla el proyector.
// Ejemplo: npm run cli -- ruta --red docente --desde A --hasta F --algo dijkstra --traza
import { aEstrella } from '../core/algoritmos/aEstrella';
import { bfs } from '../core/algoritmos/bfs';
import { dfsIterativo } from '../core/algoritmos/dfs';
import { dijkstra } from '../core/algoritmos/dijkstra';
import { PSEUDOCODIGO } from '../core/algoritmos/pseudocodigo';
import { rutasSimples } from '../core/algoritmos/rutasSimples';
import { puntosCriticos } from '../core/algoritmos/conectividad';
import type { Metrica } from '../core/grafo/tipos';
import { TracerMemoria } from '../core/instrumentacion/TracerMemoria';
import type { NombreAlgoritmo, PasoTraza } from '../core/instrumentacion/tipos';
import { cargarPreset, type NombrePreset } from '../redes/presets';

function opciones(args: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const siguiente = args[i + 1];
      if (siguiente === undefined || siguiente.startsWith('--')) r[args[i].slice(2)] = 'si';
      else r[args[i++].slice(2)] = siguiente;
    }
  }
  return r;
}

const AYUDA = `Gestor de Rutas: CLI de respaldo

  npm run cli -- ruta --red docente --desde A --hasta F --algo dijkstra --traza
  npm run cli -- rutas --red docente --desde A --hasta E
  npm run cli -- criticos --red buenaventura
  npm run cli -- estaciones --red fase1

Redes: docente, fase1, buenaventura
Algoritmos: bfs, dfs, dijkstra, aestrella
Métricas (--metrica): km, min`;

const num = (v: number) => (v === Infinity ? '∞' : Number.isInteger(v) ? String(v) : v.toFixed(2));

function imprimirTraza(pasos: PasoTraza[], id: (i: number) => string): void {
  console.log('\n Paso | Línea | Narración');
  console.log('------+-------+-------------------------------------------------------------');
  pasos.forEach((p, i) => {
    let extra = '';
    if (p.cola) extra = ` [cola: ${p.cola.map(id).join(' ')}]`;
    if (p.pilaNodos) extra = ` [pila: ${p.pilaNodos.map(id).join(' ')}]`;
    if (p.heapIds) extra = ` [heap: ${Array.from(p.heapIds, (x, k) => `${id(x)}:${num((p.heapClaves as Float64Array)[k])}`).join(' ')}]`;
    console.log(`${String(i + 1).padStart(5)} | ${String(p.linea).padStart(5)} | ${p.narracion}${extra}`);
  });
}

function principal(): void {
  const args = process.argv.slice(2);
  const comando = args[0];
  const o = opciones(args.slice(1));
  if (!comando || comando === 'ayuda' || o.ayuda) {
    console.log(AYUDA);
    return;
  }
  const red = cargarPreset((o.red ?? 'docente') as NombrePreset);
  const metrica = (o.metrica ?? 'km') as Metrica;
  const id = (i: number) => red.estacion(i).id;

  if (comando === 'estaciones') {
    for (let i = 0; i < red.numEstaciones; i++) console.log(`${id(i).padEnd(6)} ${red.estacion(i).nombre}`);
    return;
  }
  if (comando === 'criticos') {
    const p = puntosCriticos(red);
    console.log(`Estaciones críticas: ${Array.from(p.articulaciones, (i) => `${red.estacion(i).nombre} (parte la red en ${p.partesAlFallar[i]})`).join(', ') || 'ninguna'}`);
    console.log(`Vías críticas: ${Array.from(p.puentes, (v) => `${id(red.via(v).origen)}-${id(red.via(v).destino)}`).join(', ') || 'ninguna'}`);
    return;
  }

  const s = red.indiceDe(o.desde ?? '');
  const t = red.indiceDe(o.hasta ?? '');
  if (s < 0 || t < 0) {
    console.error('Estación no encontrada. Use: npm run cli -- estaciones --red docente');
    process.exitCode = 1;
    return;
  }

  if (comando === 'rutas') {
    const r = rutasSimples(red, s, t, { metrica });
    console.log(`${r.rutas.length} rutas simples de ${id(s)} a ${id(t)}:`);
    r.rutas.forEach((x, i) => console.log(`${String(i + 1).padStart(3)}. ${num(x.costo).padStart(7)} ${metrica}  ${Array.from(x.estaciones, id).join(' → ')}`));
    return;
  }

  if (comando === 'ruta') {
    const algo = (o.algo ?? 'dijkstra') as NombreAlgoritmo;
    const tracer = o.traza ? new TracerMemoria() : undefined;
    const inicio = process.hrtime.bigint();
    let ruta: Int32Array;
    let metricaTexto: string;
    if (algo === 'bfs' || algo === 'dfs') {
      const r = algo === 'bfs' ? bfs(red, s, t, {}, tracer) : dfsIterativo(red, s, t, {}, tracer);
      ruta = r.ruta;
      metricaTexto = `${r.saltos} saltos`;
    } else {
      const r = algo === 'dijkstra' ? dijkstra(red, s, t, { metrica }, tracer) : aEstrella(red, s, t, { metrica }, tracer);
      ruta = r.ruta;
      metricaTexto = `${num(r.costo)} ${metrica}, ${r.contadores.expandidos} nodos expandidos, ${r.contadores.relajaciones} relajaciones`;
    }
    const us = Number(process.hrtime.bigint() - inicio) / 1000;
    console.log(`\n${PSEUDOCODIGO[algo].titulo}`);
    console.log(ruta.length > 0 ? `Ruta: ${Array.from(ruta, id).join(' → ')}` : 'No hay ruta.');
    console.log(`Métrica: ${metricaTexto}`);
    console.log(`Tiempo: ${us.toFixed(1)} μs${tracer ? ' (incluye el registro de la traza)' : ''}`);
    if (tracer) imprimirTraza(tracer.aArreglo(), id);
    return;
  }

  console.log(AYUDA);
}

principal();
