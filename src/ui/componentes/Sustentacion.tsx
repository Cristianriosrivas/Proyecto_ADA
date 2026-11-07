import { aEstrella } from '@core/algoritmos/aEstrella';
import { dijkstra } from '@core/algoritmos/dijkstra';
import { generarRed } from '@core/generadores/redes';
import type { NombreAlgoritmo } from '@core/instrumentacion/tipos';
import { congestionPorVia } from '@core/trafico/trafico';
import { cargarPreset } from '@redes/presets';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { num, trazar } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';
import { Mapa } from './Mapa';
import { useReproductor } from './Reproductor';

const guardados = import.meta.glob('../../../bench/resultados/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
function resultado<T>(nombre: string): T | null {
  const k = Object.keys(guardados).find((x) => x.endsWith(`/${nombre}.json`));
  return k ? (guardados[k] as T) : null;
}

function Animacion({ algoritmo, desde, hasta }: { algoritmo: NombreAlgoritmo; desde: string; hasta: string }) {
  const red = useMemo(() => cargarPreset('docente'), []);
  const s = red.indiceDe(desde);
  const t = red.indiceDe(hasta);
  const { pasos } = useMemo(() => trazar(red, algoritmo, s, t, 'km'), [red, algoritmo, s, t]);
  const r = useReproductor(pasos.length);
  const { setVelocidad, setCorriendo } = r;
  useEffect(() => {
    setVelocidad(3);
    setCorriendo(true);
  }, [setVelocidad, setCorriendo, pasos.length]);
  const p = pasos[Math.min(r.paso, pasos.length - 1)];
  const fin = r.paso >= pasos.length - 1;
  const ruta = useMemo(() => {
    const u = pasos[pasos.length - 1];
    const c: number[] = [];
    for (let v = t; v !== -1; v = u.pi[v]) c.unshift(v);
    return Int32Array.from(c);
  }, [pasos, t]);
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'minmax(0,1fr) auto', gap: 10, minHeight: 0, height: '100%' }}>
      <Mapa red={red} estados={p.estados} origen={s} destino={t} nodoActual={p.nodo} arcoActual={p.arco} ruta={fin ? ruta : undefined} minimapa={false} />
      <div className="narracion" style={{ fontSize: 20 }} aria-live="polite">{p.narracion}</div>
    </div>
  );
}

function RedDocente() {
  const red = useMemo(() => cargarPreset('docente'), []);
  return <Mapa red={red} minimapa={false} />;
}

function DueloEscena() {
  const red = useMemo(() => generarRed('geometrica', 250, 2026), []);
  const t = red.numEstaciones - 1;
  const d = useMemo(() => dijkstra(red, 0, t), [red, t]);
  const a = useMemo(() => aEstrella(red, 0, t), [red, t]);
  const estados = (orden: ArrayLike<number>) => {
    const e = new Uint8Array(red.numEstaciones);
    for (let i = 0; i < orden.length; i++) e[orden[i]] = 2;
    return e;
  };
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'minmax(0,1fr) auto', gap: 10, height: '100%', minHeight: 0 }}>
      <Mapa red={red} origen={0} destino={t} ruta={a.ruta} regiones={[{ estados: estados(d.orden), color: 'var(--frontera)' }, { estados: estados(a.orden), color: 'var(--cerrado)' }]} minimapa={false} etiquetas="ninguna" />
      <p style={{ fontSize: 22 }}>Dijkstra expandió <b>{d.contadores.expandidos}</b> nodos y A* <b>{a.contadores.expandidos}</b>, con el mismo costo: {num(a.costo)} km.</p>
    </div>
  );
}

function TraficoEscena() {
  const red = useMemo(() => cargarPreset('buenaventura'), []);
  const calor = useMemo(() => congestionPorVia(red, 7), [red]);
  return <Mapa red={red} calor={calor} minimapa={false} etiquetas="ninguna" />;
}

function Cifras() {
  const m = resultado<{ cpu: string }>('maquina');
  const ajustes = resultado<{ tipo: string; algoritmo: string; r2: number }[]>('ajustes');
  const cruce = resultado<{ n: number; vias_cruce: number | string }[]>('cruce_resumen');
  if (!m) return <div className="vacio">Sin resultados guardados.</div>;
  return (
    <div style={{ fontSize: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>Medido en {m.cpu}.</p>
      <table className="tabla mono" style={{ fontSize: 18 }}>
        <thead><tr><th>Algoritmo</th><th>R² del ajuste, red geométrica</th></tr></thead>
        <tbody>{ajustes?.filter((a) => a.tipo === 'geometrica').map((a) => <tr key={a.algoritmo}><td>{a.algoritmo}</td><td>{a.r2.toFixed(3)}</td></tr>)}</tbody>
      </table>
      {cruce && <p>Punto de cruce heap–arreglo con N = {cruce[cruce.length - 1].n}: {String(cruce[cruce.length - 1].vias_cruce || 'no se alcanzó')} vías.</p>}
    </div>
  );
}

interface Escena {
  titulo: string;
  puntos: string[];
  visual: ReactNode;
}

const ESCENAS: Escena[] = [
  {
    titulo: 'El problema',
    puntos: ['Una red de transporte es un grafo G = (V, E): estaciones y vías.', 'Preguntas distintas piden algoritmos distintos: menos trasbordos, menor costo, rutas alternas.', 'Todo está hecho con estructuras propias, sin librerías de grafos.'],
    visual: <TraficoEscena />,
  },
  {
    titulo: 'Red docente: 8 estaciones, 11 vías',
    puntos: ['Se insertan en el orden exacto del documento.', 'La lista de adyacencia inserta por la cola para conservar ese orden.', 'Cada resultado de esta exposición se verifica con un test automático.'],
    visual: <RedDocente />,
  },
  {
    titulo: 'BFS: A → C → E en 2 saltos',
    puntos: ['Cola FIFO con buffer circular.', 'Explora por niveles: por eso garantiza el mínimo de saltos.', 'Θ(V + E): |V| iteraciones externas y 2|E| internas.'],
    visual: <Animacion algoritmo="bfs" desde="A" hasta="E" />,
  },
  {
    titulo: 'DFS: A → B → C → D → E en 4 saltos',
    puntos: ['Pila LIFO con pares (nodo, padre) y vecinos en orden inverso.', 'Da una ruta, no la mejor: es el contraejemplo de la pregunta 3.', 'Con backtracking halla las 11 rutas simples de A a E.'],
    visual: <Animacion algoritmo="dfs" desde="A" hasta="E" />,
  },
  {
    titulo: 'Dijkstra: 13 km de A a F',
    puntos: ['Min-Heap indexado con decrease-key en O(lg V).', 'Al extraer u, d[u] ya es definitiva.', 'Cierra 6 nodos con parada temprana.'],
    visual: <Animacion algoritmo="dijkstra" desde="A" hasta="F" />,
  },
  {
    titulo: 'A*: 16 km de A a H',
    puntos: ['f(n) = g(n) + h(n), con h euclidiana.', 'Admisible porque cada vía mide al menos la línea recta.', 'Aquí la ruta óptima pasa por los 8 nodos: A* no puede expandir menos.'],
    visual: <Animacion algoritmo="aestrella" desde="A" hasta="H" />,
  },
  {
    titulo: 'Duelo: Dijkstra contra A*',
    puntos: ['Misma red de 250 estaciones, misma consulta.', 'Dijkstra se expande en círculo; A* va hacia el destino.', 'Mismo costo, menos nodos.'],
    visual: <DueloEscena />,
  },
  {
    titulo: 'Tráfico',
    puntos: ['Peso efectivo = base × (1 + congestión).', 'Tabla ordenable con MergeSort, QuickSort y HeapSort propios.', 'Cola de prioridad indexada: O(lg n) por actualización.'],
    visual: <TraficoEscena />,
  },
  {
    titulo: 'Laboratorio',
    puntos: ['El mismo core que se visualiza es el que se mide.', 'Curvas teóricas ajustadas por mínimos cuadrados.', 'Contadores que coinciden exactamente con la fórmula.'],
    visual: <Cifras />,
  },
  {
    titulo: 'Conclusiones',
    puntos: ['La representación importa: en redes dispersas la lista gana en memoria y tiempo.', 'Heap en redes dispersas, arreglo solo en redes muy densas.', 'A* conserva la optimalidad si h es admisible, y expande menos desde N ≥ 50.', 'Una cola de prioridad supera a reordenar toda la tabla.'],
    visual: <Cifras />,
  },
];

export function Sustentacion() {
  const cerrar = useTienda((e) => e.abrirSustentacion);
  const [i, setI] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const siguiente = useCallback(() => setI((x) => Math.min(x + 1, ESCENAS.length - 1)), []);
  const anterior = useCallback(() => setI((x) => Math.max(x - 1, 0)), []);

  useEffect(() => {
    caja.current?.requestFullscreen?.().catch(() => undefined);
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') siguiente();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') anterior();
      else if (e.key === 'Escape') cerrar(false);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [siguiente, anterior, cerrar]);

  const e = ESCENAS[i];
  return (
    <div ref={caja} className="sustentacion" role="dialog" aria-label="Modo sustentación">
      <div className="fila" style={{ justifyContent: 'space-between' }}>
        <h2>{e.titulo}</h2>
        <button className="boton icono" aria-label="Salir del modo sustentación" onClick={() => cerrar(false)}><X size={18} /></button>
      </div>
      <div className="escena">
        <ul>{e.puntos.map((p) => <li key={p}>{p}</li>)}</ul>
        <div key={i} style={{ minHeight: 0, minWidth: 0 }}>{e.visual}</div>
      </div>
      <div className="fila" style={{ justifyContent: 'space-between' }}>
        <button className="boton" onClick={anterior} disabled={i === 0}><ChevronLeft size={16} />Anterior</button>
        <span className="mono">{i + 1}/{ESCENAS.length}</span>
        <button className="boton principal" onClick={siguiente} disabled={i === ESCENAS.length - 1}>Siguiente<ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
