import { ajustarConstante, CURVAS } from '@core/instrumentacion/medicion';
import { Download, FlaskConical, ImageDown, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Trabajador from '../../workers/laboratorio.worker?worker&inline';
import { descargar, num } from '../datos/ejecutar';
import { experimentos, type ConfigLaboratorio, type FilaLab } from '../datos/experimentos';
import { useTienda } from '../estado/tienda';

const TAMANOS = [10, 50, 100, 250, 500, 1000, 2500, 5000];
const guardados = import.meta.glob('../../../bench/resultados/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

function resultado<T>(nombre: string): T | null {
  const k = Object.keys(guardados).find((x) => x.endsWith(`/${nombre}.json`));
  return k ? (guardados[k] as T) : null;
}

type Tiempo = Extract<FilaLab, { tipo: 'tiempo' }>;

function Grafica({ titulo, children, nombre }: { titulo: string; children: ReactNode; nombre: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = () => {
    const s = ref.current?.querySelector('svg.recharts-surface');
    if (!s) return null;
    const c = s.cloneNode(true) as SVGElement;
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(c);
  };
  const png = () => {
    const t = svg();
    const s = ref.current?.querySelector('svg.recharts-surface');
    if (!t || !s) return;
    const r = s.getBoundingClientRect();
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = r.width * 2;
      c.height = r.height * 2;
      const g = c.getContext('2d');
      if (!g) return;
      g.fillStyle = getComputedStyle(document.body).backgroundColor;
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `${nombre}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}`;
  };
  return (
    <div className="panel">
      <div className="fila" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ marginBottom: 0 }}>{titulo}</h3>
        <div className="fila no-imprimir">
          <button className="boton icono" aria-label={`Exportar ${titulo} como SVG`} onClick={() => { const t = svg(); if (t) descargar(`${nombre}.svg`, t, 'image/svg+xml'); }}><Download size={14} /></button>
          <button className="boton icono" aria-label={`Exportar ${titulo} como PNG`} onClick={png}><ImageDown size={14} /></button>
        </div>
      </div>
      <div ref={ref} style={{ height: 280 }}>{children}</div>
    </div>
  );
}

const ejes = { stroke: 'var(--texto-2)', tick: { fontSize: 11 } };
const tooltip = { contentStyle: { background: 'var(--superficie)', border: '1px solid var(--linea)' } };

function GraficaTiempos({ filas, algoritmo, curva, logLog, nombre }: { filas: Tiempo[]; algoritmo: string; curva: keyof typeof CURVAS; logLog: boolean; nombre: string }) {
  const serie = filas.filter((f) => f.algoritmo === algoritmo);
  const f = serie.map((x) => CURVAS[curva](x.n, x.arcos));
  const a = ajustarConstante(f, serie.map((x) => x.us));
  const datos = serie.map((x, i) => ({ n: x.n, medido: x.us, teorico: a.c * f[i] }));
  const etiquetaCurva = curva === 'lineal' ? 'c·(V + E)' : curva === 'lineal_log' ? 'c·(V + E)·lg V' : 'c·V²';
  return (
    <Grafica titulo={`${algoritmo}: tiempo contra N (R² = ${a.r2.toFixed(3)})`} nombre={nombre}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 18, left: 10 }}>
          <CartesianGrid stroke="var(--linea)" strokeDasharray="2 4" />
          <XAxis dataKey="n" {...ejes} scale={logLog ? 'log' : 'linear'} type="number" domain={['dataMin', 'dataMax']} label={{ value: 'N, estaciones', position: 'insideBottom', offset: -8, fill: 'var(--texto-2)' }} />
          <YAxis {...ejes} scale={logLog ? 'log' : 'linear'} domain={logLog ? ['auto', 'auto'] : [0, 'auto']} allowDataOverflow={logLog} label={{ value: 'μs', angle: -90, position: 'insideLeft', fill: 'var(--texto-2)' }} />
          <Tooltip {...tooltip} formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : String(v))} />
          <Legend verticalAlign="top" />
          <Line dataKey="medido" name="Medido" stroke="var(--s1)" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
          <Line dataKey="teorico" name={etiquetaCurva} stroke="var(--s2)" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Grafica>
  );
}

interface MaquinaGuardada {
  cpu: string;
  ramGB: number;
  node: string;
  fecha: string;
}

function ResultadosGuardados() {
  const maquina = resultado<MaquinaGuardada>('maquina');
  const cruce = resultado<{ n: number; densidad_cruce: number | string; vias_cruce: number | string; vias_teoricas: number }[]>('cruce_resumen');
  const ajustes = resultado<{ tipo: string; algoritmo: string; curva: string; r2: number }[]>('ajustes');
  if (!maquina) return <div className="vacio">Aún no hay resultados guardados. Ejecuta npm run bench.</div>;
  return (
    <div className="panel">
      <h3>Resultados de `npm run bench` (los que usa el informe)</h3>
      <p style={{ color: 'var(--texto-2)', marginBottom: 8 }}>{maquina.cpu}, {maquina.ramGB} GB de RAM, Node {maquina.node}.</p>
      <div className="tabla-caja" style={{ maxHeight: 220 }}>
        <table className="tabla mono">
          <thead><tr><th>Red</th><th>Algoritmo</th><th>Curva</th><th>R²</th></tr></thead>
          <tbody>{ajustes?.map((a, i) => <tr key={i}><td>{a.tipo}</td><td>{a.algoritmo}</td><td>{a.curva}</td><td>{a.r2.toFixed(4)}</td></tr>)}</tbody>
        </table>
      </div>
      {cruce && <p style={{ marginTop: 8 }}>Punto de cruce medido: {cruce.map((c) => `N = ${c.n}: ${c.vias_cruce === '' ? 'el heap siempre ganó' : `${c.vias_cruce} vías`}`).join(' · ')}.</p>}
    </div>
  );
}

export function Laboratorio() {
  const avisar = useTienda((e) => e.avisar);
  const [filas, setFilas] = useState<FilaLab[]>([]);
  const [progreso, setProgreso] = useState<{ texto: string; fraccion: number } | null>(null);
  const [logLog, setLogLog] = useState(false);
  const [elegidos, setElegidos] = useState<number[]>([10, 50, 100, 250, 500, 1000]);
  const [modo, setModo] = useState('');
  const detener = useRef<() => void>(() => undefined);

  useEffect(() => () => detener.current(), []);

  const recibir = useCallback((f: FilaLab) => {
    if (f.tipo === 'progreso') setProgreso({ texto: f.texto, fraccion: f.fraccion });
    else setFilas((a) => [...a, f]);
  }, []);

  const iniciar = () => {
    setFilas([]);
    setProgreso({ texto: 'Preparando', fraccion: 0 });
    const c: ConfigLaboratorio = { tamanos: [...elegidos].sort((a, b) => a - b), semilla: 20262, repeticiones: 9 };
    try {
      const w = new Trabajador();
      setModo('Web Worker');
      detener.current = () => {
        w.terminate();
        setProgreso(null);
      };
      w.onmessage = (e: MessageEvent<FilaLab | { tipo: 'fin' }>) => {
        if (e.data.tipo === 'fin') {
          w.terminate();
          setProgreso(null);
          avisar('Laboratorio terminado', 'ok');
        } else recibir(e.data);
      };
      w.onerror = () => {
        w.terminate();
        porLotes(c);
      };
      w.postMessage(c);
    } catch {
      porLotes(c);
    }
  };

  /** Plan B: si el navegador no permite el worker, corre por lotes y le cede el turno a la interfaz. */
  const porLotes = (c: ConfigLaboratorio) => {
    setModo('Por lotes en el hilo principal');
    const g = experimentos(c);
    let vivo = true;
    detener.current = () => {
      vivo = false;
      setProgreso(null);
    };
    const paso = () => {
      if (!vivo) return;
      const r = g.next();
      if (r.done) {
        setProgreso(null);
        avisar('Laboratorio terminado', 'ok');
        return;
      }
      recibir(r.value);
      setTimeout(paso, 0);
    };
    paso();
  };

  const tiempos = useMemo(() => filas.filter((f): f is Tiempo => f.tipo === 'tiempo'), [filas]);
  const contadores = filas.filter((f) => f.tipo === 'contador') as Extract<FilaLab, { tipo: 'contador' }>[];
  const matriz = filas.filter((f) => f.tipo === 'matriz') as Extract<FilaLab, { tipo: 'matriz' }>[];
  const cruce = filas.filter((f) => f.tipo === 'cruce') as Extract<FilaLab, { tipo: 'cruce' }>[];
  const estrella = filas.filter((f) => f.tipo === 'aestrella') as Extract<FilaLab, { tipo: 'aestrella' }>[];
  const orden = filas.filter((f) => f.tipo === 'orden') as Extract<FilaLab, { tipo: 'orden' }>[];

  const exportar = () => {
    const c = ['categoria,algoritmo,n,medida,valor'];
    for (const f of filas) {
      if (f.tipo === 'tiempo') c.push(`tiempo,${f.algoritmo},${f.n},us,${f.us}`);
      if (f.tipo === 'contador') c.push(`contador,BFS,${f.n},internas,${f.internas}`);
      if (f.tipo === 'matriz') c.push(`matriz,BFS matriz,${f.n},us,${f.matrizUs}`, `matriz,BFS lista,${f.n},us,${f.listaUs}`);
      if (f.tipo === 'cruce') c.push(`cruce,heap,${f.vias},us,${f.heapUs}`, `cruce,arreglo,${f.vias},us,${f.arregloUs}`);
      if (f.tipo === 'aestrella') c.push(`aestrella,Dijkstra,${f.n},expandidos,${f.expD}`, `aestrella,A*,${f.n},expandidos,${f.expA}`);
      if (f.tipo === 'orden') c.push(`orden,${f.algoritmo},${f.n},comparaciones,${f.comparaciones}`);
    }
    descargar('laboratorio.csv', c.join('\n'));
  };

  return (
    <div className="vista">
      <div className="encabezado">
        <h2>Laboratorio de complejidad</h2>
        <p>Mide en este navegador el mismo código que usa el resto de la aplicación. La curva teórica se ajusta por mínimos cuadrados.</p>
      </div>
      <ResultadosGuardados />
      <div className="panel">
        <h3>Medir ahora</h3>
        <div className="fila" style={{ marginBottom: 8 }}>
          {TAMANOS.map((n) => (
            <label key={n} className="etiqueta" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={elegidos.includes(n)} onChange={(e) => setElegidos((a) => (e.target.checked ? [...a, n] : a.filter((x) => x !== n)))} />
              N = {n}
            </label>
          ))}
        </div>
        <div className="fila">
          <button className="boton principal" disabled={progreso !== null || elegidos.length === 0} onClick={iniciar}><FlaskConical size={15} />Correr experimentos</button>
          {progreso && <button className="boton" onClick={() => detener.current()}><Square size={14} />Detener</button>}
          <button className={`boton ${logLog ? 'activo' : ''}`} aria-pressed={logLog} onClick={() => setLogLog((v) => !v)}>Escala log-log</button>
          <button className="boton" disabled={filas.length === 0} onClick={exportar}><Download size={15} />Exportar CSV</button>
          {modo && <span className="etiqueta">{modo}</span>}
        </div>
        {progreso && (
          <div style={{ marginTop: 8 }} role="status">
            <div style={{ height: 6, background: 'var(--fondo-2)', borderRadius: 3 }}><div style={{ height: 6, width: `${progreso.fraccion * 100}%`, background: 'var(--frontera)', borderRadius: 3, transition: 'width .2s' }} /></div>
            <p style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 4 }}>{progreso.texto}</p>
          </div>
        )}
      </div>

      {tiempos.length === 0 && !progreso && <div className="vacio">Elige los tamaños y pulsa Correr experimentos.</div>}
      {tiempos.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
          <GraficaTiempos filas={tiempos} algoritmo="BFS" curva="lineal" logLog={logLog} nombre="bfs" />
          <GraficaTiempos filas={tiempos} algoritmo="DFS" curva="lineal" logLog={logLog} nombre="dfs" />
          <GraficaTiempos filas={tiempos} algoritmo="Dijkstra heap" curva="lineal_log" logLog={logLog} nombre="dijkstra-heap" />
          <GraficaTiempos filas={tiempos} algoritmo="Dijkstra arreglo" curva="cuadratica" logLog={logLog} nombre="dijkstra-arreglo" />
        </div>
      )}

      {contadores.length > 0 && (
        <div className="panel">
          <h3>Contadores contra la fórmula (pregunta 2)</h3>
          <div className="tabla-caja">
            <table className="tabla mono">
              <thead><tr><th>N</th><th>|E|</th><th>Ciclo externo</th><th>|V|</th><th>Ciclo interno</th><th>2|E|</th><th>Coincide</th></tr></thead>
              <tbody>{contadores.map((c) => <tr key={c.n}><td>{c.n}</td><td>{c.vias}</td><td>{c.externas}</td><td>{c.teoricoExterno}</td><td>{c.internas}</td><td>{c.teoricoInterno}</td><td>{c.externas === c.teoricoExterno && c.internas === c.teoricoInterno ? 'Sí' : 'No'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {matriz.length > 0 && (
        <div className="panel">
          <h3>Matriz contra lista en redes dispersas (pregunta 1)</h3>
          <div className="tabla-caja">
            <table className="tabla mono">
              <thead><tr><th>N</th><th>Bytes lista</th><th>Bytes matriz</th><th>BFS lista (μs)</th><th>BFS matriz (μs)</th><th>DFS lista (μs)</th><th>DFS matriz (μs)</th></tr></thead>
              <tbody>{matriz.map((m) => <tr key={m.n}><td>{m.n}</td><td>{m.bytesLista}</td><td>{m.bytesMatriz}</td><td>{num(m.listaUs, 1)}</td><td>{num(m.matrizUs, 1)}</td><td>{num(m.dfsListaUs, 1)}</td><td>{num(m.dfsMatrizUs, 1)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {cruce.length > 1 && (
        <Grafica titulo={`Dijkstra heap contra arreglo, N = ${cruce[0].n} (pregunta 4)`} nombre="cruce-dijkstra">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cruce} margin={{ top: 8, right: 16, bottom: 18, left: 10 }}>
              <CartesianGrid stroke="var(--linea)" strokeDasharray="2 4" />
              <XAxis dataKey="vias" {...ejes} type="number" domain={['dataMin', 'dataMax']} label={{ value: '|E|, vías', position: 'insideBottom', offset: -8, fill: 'var(--texto-2)' }} />
              <YAxis {...ejes} label={{ value: 'μs', angle: -90, position: 'insideLeft', fill: 'var(--texto-2)' }} />
              <Tooltip {...tooltip} />
              <Legend verticalAlign="top" />
              <Line dataKey="heapUs" name="Con Min-Heap" stroke="var(--s1)" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
              <Line dataKey="arregloUs" name="Con arreglo" stroke="var(--s2)" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Grafica>
      )}

      {estrella.length > 1 && (
        <Grafica titulo="Nodos expandidos: A* contra Dijkstra, promedio de 20 consultas" nombre="aestrella-dijkstra">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={estrella} margin={{ top: 8, right: 16, bottom: 18, left: 10 }}>
              <CartesianGrid stroke="var(--linea)" strokeDasharray="2 4" />
              <XAxis dataKey="n" {...ejes} type="number" domain={['dataMin', 'dataMax']} label={{ value: 'N, estaciones', position: 'insideBottom', offset: -8, fill: 'var(--texto-2)' }} />
              <YAxis {...ejes} />
              <Tooltip {...tooltip} />
              <Legend verticalAlign="top" />
              <Line dataKey="expD" name="Dijkstra" stroke="var(--s1)" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
              <Line dataKey="expA" name="A*" stroke="var(--s2)" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Grafica>
      )}

      {orden.length > 0 && (
        <div className="panel">
          <h3>Ordenamientos</h3>
          <div className="tabla-caja">
            <table className="tabla mono">
              <thead><tr><th>n</th><th>Algoritmo</th><th>Comparaciones</th><th>Tiempo (μs)</th></tr></thead>
              <tbody>{orden.map((o, i) => <tr key={i}><td>{o.n}</td><td>{o.algoritmo}</td><td>{o.comparaciones}</td><td>{num(o.us, 1)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
