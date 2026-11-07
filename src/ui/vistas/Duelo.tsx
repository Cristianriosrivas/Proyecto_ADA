import { aEstrella } from '@core/algoritmos/aEstrella';
import { dijkstra } from '@core/algoritmos/dijkstra';
import { heuristicaEuclidiana, validarHeuristica } from '@core/algoritmos/heuristica';
import { TracerMemoria } from '@core/instrumentacion/TracerMemoria';
import type { PasoTraza } from '@core/instrumentacion/tipos';
import { useEffect, useMemo, useState } from 'react';
import { BuscadorEstacion } from '../componentes/Buscador';
import { Mapa } from '../componentes/Mapa';
import { BarraReproductor, useReproductor, useTeclasReproductor } from '../componentes/Reproductor';
import { num } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';

type Heuristica = 'euclidiana' | 'cero' | 'inflada' | 'manhattan';

const NOMBRES: Record<Heuristica, string> = { euclidiana: 'Euclidiana', cero: 'h = 0', inflada: 'Euclidiana × 3 (mala)', manhattan: 'Manhattan' };

function pasosClave(p: PasoTraza[]): PasoTraza[] {
  // Se comparan iteraciones del ciclo, no sift-ups: así los dos avanzan al mismo ritmo
  const r: PasoTraza[] = [];
  let ultima = -1;
  for (const x of p) {
    if (x.iteracion !== ultima) {
      r.push(x);
      ultima = x.iteracion;
    }
  }
  r.push(p[p.length - 1]);
  return r;
}

export function Duelo() {
  const { red, metrica, origen, destino, elegirOrigen, elegirDestino } = useTienda();
  const [w, setW] = useState(1);
  const [tipo, setTipo] = useState<Heuristica>('euclidiana');
  const [superponer, setSuperponer] = useState(false);
  const grande = red.numEstaciones > 1000;

  const h = useMemo(() => {
    const base = heuristicaEuclidiana(red, destino, metrica);
    if (tipo === 'euclidiana') return base;
    if (tipo === 'cero') return new Float64Array(base.length);
    if (tipo === 'inflada') return base.map((v) => v * 3);
    const div = metrica === 'min' ? red.velocidadMaxima() : 1;
    const t = red.estacion(destino);
    return Float64Array.from({ length: base.length }, (_, i) => (Math.abs(red.estacion(i).x - t.x) + Math.abs(red.estacion(i).y - t.y)) / div);
  }, [red, destino, metrica, tipo]);

  const reporte = useMemo(() => validarHeuristica(red, h, destino, metrica), [red, h, destino, metrica]);

  const corrida = useMemo(() => {
    if (grande) return null;
    const td = new TracerMemoria(60000);
    const ta = new TracerMemoria(60000);
    const d = dijkstra(red, origen, destino, { metrica }, td);
    const a = aEstrella(red, origen, destino, { metrica, h, pesoHeuristica: w }, ta);
    return { d, a, pd: pasosClave(td.aArreglo()), pa: pasosClave(ta.aArreglo()) };
  }, [red, origen, destino, metrica, h, w, grande]);

  const total = corrida ? Math.max(corrida.pd.length, corrida.pa.length) : 0;
  const r = useReproductor(total);
  useTeclasReproductor(r);
  const { setPaso } = r;
  useEffect(() => setPaso(total > 0 ? total - 1 : 0), [total, setPaso]);

  if (grande || !corrida) return <div className="vista"><div className="vacio">El duelo anima redes de hasta 1000 estaciones. Elige una red menor en la barra superior.</div></div>;

  const pd = corrida.pd[Math.min(r.paso, corrida.pd.length - 1)];
  const pa = corrida.pa[Math.min(r.paso, corrida.pa.length - 1)];
  const terminoD = r.paso >= corrida.pd.length - 1;
  const terminoA = r.paso >= corrida.pa.length - 1;
  const optimo = Math.abs(corrida.a.costo - corrida.d.costo) < 1e-9;
  const ahorro = corrida.d.contadores.expandidos > 0 ? 100 * (1 - corrida.a.contadores.expandidos / corrida.d.contadores.expandidos) : 0;
  const veredicto = !optimo
    ? `A* perdió la optimalidad: su ruta cuesta ${num(corrida.a.costo)} y la mejor cuesta ${num(corrida.d.costo)}.`
    : ahorro > 0.5
      ? `A* halló la misma ruta óptima y expandió ${ahorro.toFixed(0)} % menos nodos.`
      : 'Empate en nodos expandidos: en esta consulta la heurística no ayudó.';
  const color = { d: 'var(--frontera)', a: 'var(--cerrado)' };

  return (
    <div className="vista-fija" style={{ gridTemplateColumns: superponer ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gridTemplateRows: 'auto minmax(0,1fr) auto auto' }}>
      <div className="fila" style={{ gridColumn: '1 / -1' }}>
        <BuscadorEstacion red={red} etiqueta="Origen" valor={origen} alElegir={elegirOrigen} />
        <BuscadorEstacion red={red} etiqueta="Destino" valor={destino} alElegir={elegirDestino} />
        <label className="campo">Heurística
          <select value={tipo} onChange={(e) => setTipo(e.target.value as Heuristica)}>
            {(Object.keys(NOMBRES) as Heuristica[]).map((k) => <option key={k} value={k}>{NOMBRES[k]}</option>)}
          </select>
        </label>
        <label className="campo">A* ponderado: w = {w.toFixed(1)}
          <input type="range" min={1} max={5} step={0.1} value={w} onChange={(e) => setW(Number(e.target.value))} />
        </label>
        <button className={`boton ${superponer ? 'activo' : ''}`} aria-pressed={superponer} onClick={() => setSuperponer((s) => !s)}>Superponer regiones</button>
        <span className={`etiqueta ${reporte.admisible ? 'ok' : 'mal'}`}>{reporte.admisible ? 'Admisible' : `Inadmisible en ${reporte.admisibilidad.length} estaciones`}</span>
        <span className={`etiqueta ${reporte.consistente ? 'ok' : 'mal'}`}>{reporte.consistente ? 'Consistente' : `Inconsistente en ${reporte.consistencia.length} arcos`}</span>
      </div>
      {superponer ? (
        <div style={{ minHeight: 0 }}>
          <Mapa red={red} origen={origen} destino={destino} regiones={[{ estados: pd.estados, color: color.d }, { estados: pa.estados, color: color.a }]} ruta={terminoA ? corrida.a.ruta : undefined} rutaSecundaria={terminoD ? corrida.d.ruta : undefined} />
        </div>
      ) : (
        <>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <b>Dijkstra</b>
            <div style={{ flex: 1, minHeight: 0 }}><Mapa red={red} estados={pd.estados} origen={origen} destino={destino} regiones={[{ estados: pd.estados, color: color.d }]} ruta={terminoD ? corrida.d.ruta : undefined} minimapa={false} etiquetas="ninguna" /></div>
          </div>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <b>A*{w > 1 ? ` ponderado (w = ${w.toFixed(1)})` : ''}{tipo === 'cero' ? ' con h = 0' : ''}</b>
            <div style={{ flex: 1, minHeight: 0 }}><Mapa red={red} estados={pa.estados} origen={origen} destino={destino} regiones={[{ estados: pa.estados, color: color.a }]} ruta={terminoA ? corrida.a.ruta : undefined} minimapa={false} etiquetas="ninguna" /></div>
          </div>
        </>
      )}
      <div className="panel" style={{ gridColumn: '1 / -1', padding: 8 }}>
        <div className="metricas">
          <div className="metrica"><span>Costo Dijkstra</span><b>{num(corrida.d.costo, 3)}</b></div>
          <div className="metrica"><span>Costo A*</span><b>{num(corrida.a.costo, 3)}</b></div>
          <div className="metrica"><span>Expandidos Dijkstra</span><b>{corrida.d.contadores.expandidos}</b></div>
          <div className="metrica"><span>Expandidos A*</span><b>{corrida.a.contadores.expandidos}</b></div>
          <div className="metrica"><span>Relajaciones D / A*</span><b>{corrida.d.contadores.relajaciones} / {corrida.a.contadores.relajaciones}</b></div>
          <div className="metrica"><span>Reaperturas A*</span><b>{corrida.a.contadores.reaperturas}</b></div>
        </div>
        <p style={{ marginTop: 6, fontWeight: 600 }} aria-live="polite">{veredicto}</p>
      </div>
      <div style={{ gridColumn: '1 / -1' }}><BarraReproductor r={r} total={total} /></div>
    </div>
  );
}
