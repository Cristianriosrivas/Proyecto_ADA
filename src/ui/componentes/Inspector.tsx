import { PSEUDOCODIGO } from '@core/algoritmos/pseudocodigo';
import type { RedTransporte } from '@core/grafo/RedTransporte';
import type { NombreAlgoritmo, PasoTraza } from '@core/instrumentacion/tipos';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { num } from '../datos/ejecutar';

export function Pseudocodigo({ algoritmo, linea }: { algoritmo: NombreAlgoritmo; linea: number }) {
  const ref = useRef<HTMLOListElement>(null);
  const p = PSEUDOCODIGO[algoritmo];
  useEffect(() => {
    ref.current?.querySelector('.actual')?.scrollIntoView({ block: 'nearest' });
  }, [linea]);
  return (
    <div className="panel pseudo mono" aria-label={`Pseudocódigo de ${p.titulo}`}>
      <h3>{p.titulo}</h3>
      <ol ref={ref}>
        {p.lineas.map((l, i) => (
          <li key={i} className={i + 1 === linea ? 'actual' : ''} aria-current={i + 1 === linea ? 'step' : undefined}>
            {l}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Tren({ cola, id }: { cola: number[]; id: (i: number) => string }) {
  const sin = useReducedMotion();
  return (
    <div>
      <div className="leyenda" style={{ justifyContent: 'space-between' }}><span>Frente, sale primero</span><span>Final, entra aquí</span></div>
      <div className="tren mono" aria-label="Cola">
        {cola.length === 0 && <span style={{ color: 'var(--texto-3)' }}>Cola vacía</span>}
        {cola.map((x, i) => (
          <motion.div key={`${x}-${i}`} layout={!sin} className="vagon" initial={sin ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
            {id(x)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Torre({ nodos, padres, id }: { nodos: number[]; padres: number[]; id: (i: number) => string }) {
  return (
    <div className="torre mono" aria-label="Pila">
      {nodos.length === 0 && <span style={{ color: 'var(--texto-3)' }}>Pila vacía</span>}
      {nodos.map((x, i) => (
        <div key={i} className={`bloque ${i === nodos.length - 1 ? 'cima' : ''}`}>
          ({id(x)}, {padres[i] === -1 ? 'NIL' : id(padres[i])})
        </div>
      ))}
    </div>
  );
}

/** El Min-Heap como árbol binario y como arreglo, con la pareja recién intercambiada resaltada. */
function Heap({ ids, claves, cambio, id }: { ids: Int32Array; claves: Float64Array; cambio?: [number, number]; id: (i: number) => string }) {
  const n = ids.length;
  const niveles = n > 0 ? Math.floor(Math.log2(n)) + 1 : 1;
  const W = 300;
  const Hh = 34 * niveles + 10;
  const pos = (i: number) => {
    const nivel = Math.floor(Math.log2(i + 1));
    const enNivel = i + 1 - 2 ** nivel;
    return { x: ((enNivel + 0.5) / 2 ** nivel) * W, y: 16 + nivel * 34 };
  };
  const mostrar = Math.min(n, 31);
  return (
    <div>
      {n === 0 ? (
        <span style={{ color: 'var(--texto-3)' }}>Heap vacío</span>
      ) : (
        <svg viewBox={`0 0 ${W} ${Hh}`} style={{ width: '100%', maxHeight: 170 }} aria-label="Min-Heap como árbol">
          {Array.from({ length: mostrar }, (_, i) => {
            if (i === 0) return null;
            const a = pos(i);
            const b = pos((i - 1) >> 1);
            return <line key={`l${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--linea)" strokeWidth={1.4} />;
          })}
          {Array.from({ length: mostrar }, (_, i) => {
            const a = pos(i);
            const hot = cambio !== undefined && (i === cambio[0] || i === cambio[1]);
            return (
              <g key={i}>
                <circle cx={a.x} cy={a.y} r={12} fill={hot ? 'var(--cerrado)' : 'var(--superficie-2)'} stroke="var(--frontera)" strokeWidth={1.3} />
                <text x={a.x} y={a.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={700} fill={hot ? '#1a1200' : 'var(--texto)'}>{id(ids[i])}</text>
                <text x={a.x + 13} y={a.y - 8} fontSize={7.5} fill="var(--texto-3)">{num(claves[i], 1)}</text>
              </g>
            );
          })}
        </svg>
      )}
      <div className="celdas mono" aria-label="Min-Heap como arreglo">
        {Array.from({ length: Math.min(n, 40) }, (_, i) => (
          <div key={i} className={`celda ${cambio !== undefined && (i === cambio[0] || i === cambio[1]) ? 'cambio' : ''}`}>
            <small>{i}</small>
            {id(ids[i])}:{num(claves[i], 1)}
          </div>
        ))}
      </div>
    </div>
  );
}

const COLOR = ['BLANCO', 'GRIS', 'NEGRO', 'RUTA'];

function Tablas({ paso, red, anterior }: { paso: PasoTraza; red: RedTransporte; anterior?: PasoTraza }) {
  const n = red.numEstaciones;
  const limite = Math.min(n, 24);
  const conH = paso.h !== undefined;
  return (
    <div className="tabla-caja" style={{ maxHeight: 230 }}>
      <table className="tabla mono">
        <thead>
          <tr>
            <th>v</th>
            <th>{conH ? 'g[v]' : 'd[v]'}</th>
            {conH && <th>h[v]</th>}
            {conH && <th>f[v]</th>}
            <th>π[v]</th>
            <th>color[v]</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: limite }, (_, i) => {
            const cambio = anterior !== undefined && (anterior.d[i] !== paso.d[i] || anterior.pi[i] !== paso.pi[i]);
            const h = paso.h?.[i] ?? NaN;
            return (
              <tr key={i} className={cambio ? 'resaltada' : ''}>
                <td>{red.estacion(i).id}</td>
                <td>{num(paso.d[i])}</td>
                {conH && <td>{num(h)}</td>}
                {conH && <td>{Number.isNaN(h) ? '–' : num(paso.d[i] + h)}</td>}
                <td>{paso.pi[i] === -1 ? 'NIL' : red.estacion(paso.pi[i]).id}</td>
                <td>{COLOR[paso.estados[i]]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {n > limite && <p style={{ color: 'var(--texto-3)', fontSize: 11 }}>Se muestran {limite} de {n} estaciones.</p>}
    </div>
  );
}

export function InspectorEstructuras({ paso, anterior, red }: { paso: PasoTraza; anterior?: PasoTraza; red: RedTransporte }) {
  const id = (i: number) => red.estacion(i).id;
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'auto' }}>
      <h3 style={{ marginBottom: 0 }}>Estructuras en vivo</h3>
      {paso.cola && <Tren cola={paso.cola} id={id} />}
      {paso.pilaNodos && <Torre nodos={paso.pilaNodos} padres={paso.pilaPadres ?? []} id={id} />}
      {paso.heapIds && <Heap ids={paso.heapIds} claves={paso.heapClaves as Float64Array} cambio={paso.heapIntercambio} id={id} />}
      <Tablas paso={paso} anterior={anterior} red={red} />
    </div>
  );
}
