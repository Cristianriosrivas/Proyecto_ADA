import { dijkstra } from '@core/algoritmos/dijkstra';
import { medir } from '@core/instrumentacion/medicion';
import { busquedaBinaria } from '@core/ordenamiento/ordenamiento';
import { bloquear, congestionPorVia, demandaHoraria, estadisticas, experimentoP6, ordenarTabla, pesosEfectivos, simularViajes, tablaCongestion, topK, type AlgoritmoOrden, type FilaCongestion, type ResultadoP6 } from '@core/trafico/trafico';
import { Ban, FlaskConical, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BuscadorEstacion } from '../componentes/Buscador';
import { Mapa } from '../componentes/Mapa';
import { num, rutaTexto } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';

const NOMBRE_ORDEN: Record<AlgoritmoOrden, string> = { merge: 'MergeSort', quick: 'QuickSort (mediana de 3)', heap: 'HeapSort' };

function horaTexto(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function Trafico() {
  const { red, versionRed, metrica, origen, destino, elegirOrigen, elegirDestino, avisar } = useTienda();
  const [hora, setHora] = useState(7);
  const [corre, setCorre] = useState(false);
  const [algoritmo, setAlgoritmo] = useState<AlgoritmoOrden>('merge');
  const [k, setK] = useState(5);
  const [viajes, setViajes] = useState(300);
  const [umbral, setUmbral] = useState(0.5);
  const [incidente, setIncidente] = useState(false);
  const [estCerradas, setEstCerradas] = useState<number[]>([]);
  const [viasCerradas, setViasCerradas] = useState<number[]>([]);
  const [p6, setP6] = useState<Record<string, number>[] | null>(null);

  useEffect(() => {
    setEstCerradas([]);
    setViasCerradas([]);
  }, [versionRed]);

  useEffect(() => {
    if (!corre) return undefined;
    const t = setInterval(() => setHora((h) => (h + 0.25) % 24), 260);
    return () => clearInterval(t);
  }, [corre]);

  const congestion = useMemo(() => congestionPorVia(red, hora), [red, hora]);
  const pesos = useMemo(() => pesosEfectivos(red, metrica, congestion), [red, metrica, congestion]);
  const bloqueados = useMemo(() => bloquear(red, estCerradas, viasCerradas), [red, estCerradas, viasCerradas]);

  // Re-ruteo en vivo: cada cambio de hora o incidente recalcula la ruta activa
  const activa = useMemo(() => dijkstra(red, origen, destino, { pesos, arcosBloqueados: bloqueados }), [red, origen, destino, pesos, bloqueados]);
  const base = useMemo(() => dijkstra(red, origen, destino, { metrica }), [red, origen, destino, metrica]);

  const ordenada = useMemo(() => {
    const comparativa = (['merge', 'quick', 'heap'] as AlgoritmoOrden[]).map((alg) => {
      const f = tablaCongestion(red, metrica, congestion);
      const c = ordenarTabla(f, alg);
      const base = tablaCongestion(red, metrica, congestion);
      const us = medir(() => void ordenarTabla(base.slice(), alg), () => performance.now(), { repeticiones: 3, minimoMs: 1, calentamiento: 1 }).medianaUs;
      return { alg, us, c, filas: f };
    });
    return { comparativa, filas: (comparativa.find((c) => c.alg === algoritmo) ?? comparativa[0]).filas };
  }, [red, metrica, congestion, algoritmo]);

  const top = useMemo(() => topK(congestion, k), [congestion, k]);
  const est = useMemo(() => estadisticas(congestion), [congestion]);
  const sim = useMemo(() => (red.numEstaciones <= 1000 ? simularViajes(red, viajes, 11, metrica, pesos, bloqueados) : null), [red, viajes, metrica, pesos, bloqueados]);
  const masTransitadas = useMemo(() => (sim ? topK(sim.pasosPorEstacion, 5) : new Int32Array(0)), [sim]);

  const hallada = useMemo(() => busquedaBinaria<FilaCongestion>(ordenada.filas, (f) => (f.congestion > umbral ? -1 : 0)), [ordenada, umbral]);

  const correrP6 = () => {
    const filas: Record<string, number>[] = [];
    const m = 100;
    for (const n of [100, 250, 500, 1000, 2000]) {
      const fila: Record<string, number> = { n };
      for (const e of ['quick', 'heap', 'cola'] as ResultadoP6['estrategia'][]) fila[e] = Number(experimentoP6(n, m, 7, e, () => performance.now()).ms.toFixed(3));
      filas.push(fila);
    }
    setP6(filas);
    avisar('Experimento de la pregunta 6 terminado', 'ok');
  };

  const clicEstacion = (i: number) => {
    if (incidente) setEstCerradas((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  };
  const clicVia = (v: number) => {
    if (incidente) setViasCerradas((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));
  };

  const marcasE = useMemo(() => {
    const m = new Uint8Array(red.numEstaciones);
    estCerradas.forEach((i) => { m[i] = 1; });
    return m;
  }, [red, estCerradas]);
  const marcasV = useMemo(() => {
    const m = new Uint8Array(red.numVias);
    viasCerradas.forEach((i) => { m[i] = 1; });
    return m;
  }, [red, viasCerradas]);

  const unidad = metrica === 'km' ? 'km' : 'min';
  const pico = demandaHoraria(hora) > 0.6;

  return (
    <div className="vista">
      <div className="fila no-imprimir">
        <button className="boton icono" aria-label={corre ? 'Pausar el reloj' : 'Iniciar el reloj'} onClick={() => setCorre((c) => !c)}>{corre ? <Pause size={15} /> : <Play size={15} />}</button>
        <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{horaTexto(hora)}</span>
        <input type="range" min={0} max={23.75} step={0.25} value={hora} onChange={(e) => setHora(Number(e.target.value))} aria-label="Hora de la simulación" style={{ flex: 1, minWidth: 180 }} />
        <span className={`etiqueta ${pico ? 'mal' : 'ok'}`}>{pico ? 'Hora pico' : 'Hora valle'}</span>
        <button className={`boton ${incidente ? 'activo' : ''}`} aria-pressed={incidente} onClick={() => setIncidente((v) => !v)}><Ban size={15} />Cerrar con clic</button>
        <button className="boton" onClick={() => { setEstCerradas([]); setViasCerradas([]); }}><RotateCcw size={15} />Reabrir todo</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 12 }} className="rejilla-trafico">
        <div style={{ height: 420 }}>
          <Mapa red={red} calor={congestion} ruta={activa.alcanzado ? activa.ruta : undefined} origen={origen} destino={destino} vehiculos estacionesCerradas={marcasE} viasCerradas={marcasV} alClicEstacion={clicEstacion} alClicVia={clicVia} />
        </div>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ marginBottom: 0 }}>Ruta activa con re-ruteo en vivo</h3>
          <div className="fila">
            <BuscadorEstacion red={red} etiqueta="Origen" valor={origen} alElegir={elegirOrigen} />
            <BuscadorEstacion red={red} etiqueta="Destino" valor={destino} alElegir={elegirDestino} />
          </div>
          {activa.alcanzado ? (
            <>
              <p className="mono" style={{ fontSize: 12.5 }}>{rutaTexto(red, activa.ruta)}</p>
              <div className="metricas">
                <div className="metrica"><span>Costo con tráfico ({unidad})</span><b>{num(activa.costo)}</b></div>
                <div className="metrica"><span>Sin tráfico ({unidad})</span><b>{num(base.costo)}</b></div>
                <div className="metrica"><span>Sobrecosto</span><b>{base.costo > 0 ? `${(100 * (activa.costo / base.costo - 1)).toFixed(0)} %` : '–'}</b></div>
              </div>
            </>
          ) : (
            <div className="vacio">Sin ruta: el incidente dejó las estaciones incomunicadas.</div>
          )}
          <h3 style={{ marginBottom: 0 }}>Estadísticas de congestión</h3>
          <div className="metricas">
            <div className="metrica"><span>Media</span><b>{num(est.media, 3)}</b></div>
            <div className="metrica"><span>Mediana</span><b>{num(est.mediana, 3)}</b></div>
            <div className="metrica"><span>Percentil 90</span><b>{num(est.percentil90, 3)}</b></div>
            <div className="metrica"><span>Desviación</span><b>{num(est.desviacion, 3)}</b></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 12 }} className="rejilla-trafico">
        <div className="panel">
          <h3>Tabla de congestión</h3>
          <div className="fila" style={{ marginBottom: 8 }}>
            <div className="grupo" role="group" aria-label="Algoritmo de ordenamiento">
              {(Object.keys(NOMBRE_ORDEN) as AlgoritmoOrden[]).map((a) => <button key={a} className={`boton ${algoritmo === a ? 'activo' : ''}`} onClick={() => setAlgoritmo(a)}>{NOMBRE_ORDEN[a]}</button>)}
            </div>
          </div>
          <div className="tabla-caja" style={{ marginBottom: 8 }}>
            <table className="tabla mono">
              <thead><tr><th>Algoritmo</th><th>Comparaciones</th><th>Movimientos</th><th>Tiempo (μs)</th></tr></thead>
              <tbody>
                {ordenada.comparativa.map((c) => (
                  <tr key={c.alg} className={c.alg === algoritmo ? 'resaltada' : ''}>
                    <td>{NOMBRE_ORDEN[c.alg]}</td><td>{c.c.comparaciones}</td><td>{c.c.movimientos}</td><td>{num(c.us, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tabla-caja" style={{ maxHeight: 250 }}>
            <table className="tabla">
              <thead><tr><th>#</th><th>Vía</th><th>Congestión</th><th>Peso base ({unidad})</th><th>Peso efectivo ({unidad})</th></tr></thead>
              <tbody>
                {ordenada.filas.slice(0, 120).map((f, i) => (
                  <tr key={f.via} className={i === hallada ? 'resaltada' : ''}>
                    <td className="mono">{i + 1}</td>
                    <td>{red.estacion(f.origen).nombre} – {red.estacion(f.destino).nombre}</td>
                    <td className="mono">{num(f.congestion, 3)}</td>
                    <td className="mono">{num(f.pesoBase)}</td>
                    <td className="mono">{num(f.pesoEfectivo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="fila" style={{ marginTop: 8 }}>
            <label className="campo">Búsqueda binaria: primera vía con congestión ≤
              <input type="number" step={0.05} min={0} value={umbral} onChange={(e) => setUmbral(Number(e.target.value))} style={{ width: 90 }} />
            </label>
            <span className="etiqueta">{hallada >= 0 ? `Posición ${hallada + 1} de ${ordenada.filas.length}` : 'Ninguna'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div className="panel">
            <h3>Top-{k} vías más congestionadas (heap, O(n + k lg n))</h3>
            <input type="range" min={1} max={Math.min(20, Math.max(red.numVias, 1))} value={k} onChange={(e) => setK(Number(e.target.value))} aria-label="Valor de k" style={{ width: '100%' }} />
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              {Array.from(top, (v) => <li key={v}>{red.estacion(red.via(v).origen).nombre} – {red.estacion(red.via(v).destino).nombre}: <span className="mono">{num(congestion[v], 3)}</span></li>)}
            </ol>
          </div>
          <div className="panel">
            <h3>Viajes simulados</h3>
            {sim === null ? (
              <p style={{ color: 'var(--texto-3)' }}>Se simulan viajes en redes de hasta 1000 estaciones.</p>
            ) : (
              <>
                <label className="campo" style={{ width: '100%' }}>M = {viajes} viajes
                  <input type="range" min={50} max={1500} step={50} value={viajes} onChange={(e) => setViajes(Number(e.target.value))} />
                </label>
                <div className="metricas" style={{ margin: '6px 0' }}>
                  <div className="metrica"><span>Tiempo promedio ({unidad})</span><b>{num(sim.costoPromedio)}</b></div>
                  <div className="metrica"><span>Sin ruta</span><b>{sim.sinRuta}</b></div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--texto-3)' }}>Estaciones más transitadas</p>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                  {Array.from(masTransitadas, (i) => <li key={i}>{red.estacion(i).nombre}: <span className="mono">{sim.pasosPorEstacion[i]}</span></li>)}
                </ol>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Experimento de la pregunta 6: mantener la tabla con m = 100 actualizaciones</h3>
        <p style={{ color: 'var(--texto-2)', marginBottom: 8 }}>Tras cada actualización se pide la vía más congestionada. Reordenar cuesta O(m·n lg n); la cola de prioridad indexada cuesta O(m lg n) y consulta el máximo en O(1).</p>
        <button className="boton" onClick={correrP6}><FlaskConical size={15} />Correr experimento</button>
        {p6 && (
          <div style={{ height: 260, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={p6} margin={{ top: 8, right: 16, bottom: 18, left: 8 }}>
                <CartesianGrid stroke="var(--linea)" strokeDasharray="2 4" />
                <XAxis dataKey="n" stroke="var(--texto-2)" label={{ value: 'n, vías en la tabla', position: 'insideBottom', offset: -8, fill: 'var(--texto-2)' }} />
                <YAxis stroke="var(--texto-2)" label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: 'var(--texto-2)' }} />
                <Tooltip contentStyle={{ background: 'var(--superficie)', border: '1px solid var(--linea)' }} />
                <Legend verticalAlign="top" />
                <Line dataKey="quick" name="Reordenar con QuickSort" stroke="var(--s1)" strokeWidth={2} dot={{ r: 4 }} />
                <Line dataKey="heap" name="Reordenar con HeapSort" stroke="var(--s2)" strokeWidth={2} dot={{ r: 4 }} />
                <Line dataKey="cola" name="Cola de prioridad" stroke="var(--s3)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
