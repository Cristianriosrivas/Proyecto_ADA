import { aEstrella } from '@core/algoritmos/aEstrella';
import { alcanzablesDesde } from '@core/algoritmos/conectividad';
import { dijkstra } from '@core/algoritmos/dijkstra';
import { generarRed } from '@core/generadores/redes';
import { ESTADO, type NombreAlgoritmo } from '@core/instrumentacion/tipos';
import { bloquear, congestionPorVia } from '@core/trafico/trafico';
import { cargarRedOSM, georreferencia } from '@redes/osm';
import { cargarPreset } from '@redes/presets';
import { ChevronLeft, ChevronRight, Construction, RotateCcw, Smartphone, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import config from '../../../proyecto.config.json';
import { num, trazar } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';
import { CodigoQR } from './CodigoQR';
import { Mapa, type Region } from './Mapa';
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

/** Marca como cerradas las estaciones de una lista, para pintarlas como región. */
function marcarRegion(n: number, lista: ArrayLike<number>): Uint8Array {
  const e = new Uint8Array(n);
  for (let i = 0; i < lista.length; i++) e[lista[i]] = ESTADO.CERRADO;
  return e;
}

/**
 * Las calles reales de Buenaventura: Dijkstra y A* del Malecón a la Univalle, con lo que exploró
 * cada uno. Las cifras se calculan aquí mismo con el core, no están escritas a mano.
 */
function BuenaventuraReal() {
  const red = useMemo(() => cargarRedOSM(), []);
  const s = 0;
  const t = red.numEstaciones - 1;
  const d = useMemo(() => dijkstra(red, s, t, { metrica: 'km' }), [red, t]);
  const a = useMemo(() => aEstrella(red, s, t, { metrica: 'km' }), [red, t]);
  const regiones = useMemo<Region[]>(
    () => [
      { estados: marcarRegion(red.numEstaciones, d.orden), color: 'var(--frontera)' },
      { estados: marcarRegion(red.numEstaciones, a.orden), color: 'var(--cerrado)' },
    ],
    [red, d, a],
  );
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'minmax(0,1fr) auto', gap: 10, height: '100%', minHeight: 0 }}>
      <Mapa red={red} origen={s} destino={t} ruta={a.ruta} regiones={regiones} minimapa={false} />
      <p style={{ fontSize: 20 }}>
        {red.numEstaciones} cruces reales. Dijkstra exploró <b>{d.contadores.expandidos}</b> y A* <b>{a.contadores.expandidos}</b>, con el mismo costo: {num(a.costo)} km.
      </p>
    </div>
  );
}

/**
 * "Rompe la ciudad": el público elige qué cerrar y Dijkstra recalcula al instante. Un clic cierra
 * un cruce o una calle (en sus dos sentidos). Si el origen y el destino quedan incomunicados, se
 * pinta de un color lo que todavía se alcanza desde el origen y de otro lo que quedó aislado.
 */
function RompeLaCiudad() {
  const red = useMemo(() => cargarRedOSM(), []);
  const geo = georreferencia(red);
  const n = red.numEstaciones;
  const s = 0;
  const t = n - 1;
  const [cruces, setCruces] = useState<number[]>([]);
  const [calles, setCalles] = useState<number[]>([]);
  const alternar = (lista: number[], vs: number[]) => (vs.every((x) => lista.includes(x)) ? lista.filter((x) => !vs.includes(x)) : [...lista, ...vs.filter((x) => !lista.includes(x))]);
  const conGemela = (v: number) => (geo && geo.gemela[v] >= 0 ? [v, geo.gemela[v]] : [v]);
  const puente = geo?.puentes.find((p) => p.nombre.startsWith('Puente El Piñal'));
  const puenteCerrado = puente !== undefined && Array.from(puente.vias).every((v) => calles.includes(v));

  const base = useMemo(() => dijkstra(red, s, t, { metrica: 'km' }), [red, t]);
  const bloqueados = useMemo(() => bloquear(red, cruces, calles), [red, cruces, calles]);
  const r = useMemo(() => dijkstra(red, s, t, { metrica: 'km', arcosBloqueados: bloqueados }), [red, t, bloqueados]);
  const partes = useMemo(() => {
    if (r.alcanzado) return null;
    const lado = alcanzablesDesde(red, s, bloqueados);
    const deOrigen = marcarRegion(n, lado);
    const aislado = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (deOrigen[i] === 0) aislado[i] = ESTADO.CERRADO;
    return { regiones: [{ estados: deOrigen, color: 'var(--origen)' }, { estados: aislado, color: 'var(--critico)' }] as Region[], alcanzables: lado.length };
  }, [red, r.alcanzado, bloqueados, n]);
  const marcasE = useMemo(() => {
    const m = new Uint8Array(n);
    cruces.forEach((i) => (m[i] = 1));
    return m;
  }, [n, cruces]);
  const marcasV = useMemo(() => {
    const m = new Uint8Array(red.numVias);
    calles.forEach((v) => (m[v] = 1));
    return m;
  }, [red, calles]);

  const nCerrados = cruces.length + calles.filter((v) => !geo || geo.gemela[v] < 0 || geo.gemela[v] > v).length;
  let mensaje: ReactNode;
  if (!r.alcanzado && partes) mensaje = <>¡La ciudad quedó partida en dos! Desde el {red.estacion(s).nombre} solo se llega a <b>{partes.alcanzables}</b> de {n} cruces.</>;
  else if (nCerrados === 0) mensaje = <>¿Qué calle cerramos? Haz clic en una calle o en un cruce. Ruta actual: <b>{num(r.costo)} km</b>.</>;
  else mensaje = <>Dijkstra encontró otra ruta: <b>{num(r.costo)} km</b>{r.costo > base.costo + 1e-9 ? <>, {num(r.costo - base.costo)} km más que antes</> : ', igual de corta'}.</>;

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'minmax(0,1fr) auto auto', gap: 10, height: '100%', minHeight: 0 }}>
      <Mapa
        red={red}
        origen={s}
        destino={t}
        ruta={r.alcanzado ? r.ruta : undefined}
        regiones={partes?.regiones}
        estacionesCerradas={marcasE}
        viasCerradas={marcasV}
        alClicEstacion={(i) => i !== s && i !== t && setCruces((c) => alternar(c, [i]))}
        alClicVia={(v) => setCalles((c) => alternar(c, conGemela(v)))}
        minimapa={false}
      />
      <p style={{ fontSize: 20, margin: 0 }} aria-live="polite">{mensaje}</p>
      <div className="fila">
        {puente && (
          <button className={`boton ${puenteCerrado ? 'activo' : ''}`} aria-pressed={puenteCerrado} onClick={() => setCalles((c) => alternar(c, Array.from(puente.vias)))}>
            <Construction size={16} />
            {puenteCerrado ? 'Reabrir el Puente El Piñal' : 'Cerrar el Puente El Piñal'}
          </button>
        )}
        <button className="boton" onClick={() => { setCruces([]); setCalles([]); }} disabled={nCerrados === 0}><RotateCcw size={16} />Reabrir todo</button>
      </div>
    </div>
  );
}

/** Primera escena: el público abre la misma aplicación en su celular mientras se expone. */
function PruebaloEnTuCelular() {
  const url = (config as { urlPublica?: string }).urlPublica;
  if (!url) return null;
  return (
    <div className="qr-escena">
      <CodigoQR texto={url} tamano={190} />
      <div>
        <p className="qr-titulo"><Smartphone size={22} />Pruébalo en tu celular</p>
        <p>Escanea el código y busca tu propia ruta por las calles de Buenaventura mientras exponemos.</p>
        <p className="mono qr-url">{url.replace(/^https:\/\//, '')}</p>
      </div>
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
      {cruce && (
        <p>
          Punto de cruce heap–arreglo con N = {cruce[cruce.length - 1].n}: {cruce[cruce.length - 1].vias_cruce ? `${String(cruce[cruce.length - 1].vias_cruce)} vías` : 'no se alcanzó en las redes medidas'}.
        </p>
      )}
    </div>
  );
}

interface Escena {
  titulo: string;
  puntos: string[];
  visual: ReactNode;
  /** Algo más bajo los puntos, como el código QR de la primera escena. */
  extra?: ReactNode;
}

const ESCENAS: Escena[] = [
  {
    titulo: 'El problema',
    puntos: ['Una red de transporte es un grafo G = (V, E): estaciones y vías.', 'Preguntas distintas piden algoritmos distintos: menos trasbordos, menor costo, rutas alternas.', 'Todo está hecho con estructuras propias, sin librerías de grafos.'],
    visual: <TraficoEscena />,
    extra: <PruebaloEnTuCelular />,
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
    titulo: 'Buenaventura de verdad',
    puntos: ['Las calles reales, tomadas de OpenStreetMap: cada cruce es una estación y las calles de un solo sentido son vías dirigidas.', 'El mismo código de la red docente, ahora con miles de cruces.', 'Azul: lo que exploró Dijkstra. Naranja: lo que exploró A*. Mismo costo, menos trabajo.', 'El botón de capas pone la red sobre el mapa real.'],
    visual: <BuenaventuraReal />,
  },
  {
    titulo: 'Rompe la ciudad',
    puntos: ['¿Qué calle cerramos? Un clic en una calle o en un cruce la cierra.', 'Dijkstra recalcula la ruta al instante, con el mismo código de siempre.', 'Si se cae el Puente El Piñal, la isla queda incomunicada: la ciudad se parte en dos.', 'En la red simulada, Tarjan ya marcaba ese paso como vía crítica.'],
    visual: <RompeLaCiudad />,
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
        <div className="escena-texto">
          <ul>{e.puntos.map((p) => <li key={p}>{p}</li>)}</ul>
          {e.extra}
        </div>
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
