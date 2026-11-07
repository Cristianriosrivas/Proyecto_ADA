import type { NombreAlgoritmo } from '@core/instrumentacion/tipos';
import { Play, Route } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BuscadorEstacion } from '../componentes/Buscador';
import { LeyendaMapa, Mapa } from '../componentes/Mapa';
import { COMPLEJIDAD, correr, ESTRUCTURA, NOMBRE_ALGORITMO, num, rutaTexto, type ResultadoVista } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';

const ALGORITMOS: NombreAlgoritmo[] = ['bfs', 'dfs', 'dijkstra', 'aestrella'];

export function SelectorAlgoritmo() {
  const algoritmo = useTienda((e) => e.algoritmo);
  const elegir = useTienda((e) => e.elegirAlgoritmo);
  return (
    <div className="grupo" role="group" aria-label="Algoritmo">
      {ALGORITMOS.map((a) => (
        <button key={a} className={`boton ${algoritmo === a ? 'activo' : ''}`} aria-pressed={algoritmo === a} onClick={() => elegir(a)}>
          {NOMBRE_ALGORITMO[a]}
        </button>
      ))}
    </div>
  );
}

export function Planificador() {
  const { red, versionRed, metrica, origen, destino, algoritmo, elegirOrigen, elegirDestino, irA } = useTienda();
  const [res, setRes] = useState<ResultadoVista | null>(null);
  const [turno, setTurno] = useState<'origen' | 'destino'>('origen');

  useEffect(() => setRes(null), [versionRed, metrica, origen, destino, algoritmo]);

  const calcular = () => setRes(correr(red, algoritmo, origen, destino, { metrica }));

  const clicEstacion = (i: number) => {
    if (turno === 'origen') {
      elegirOrigen(i);
      setTurno('destino');
    } else {
      elegirDestino(i);
      setTurno('origen');
    }
  };

  const unidad = metrica === 'km' ? 'km' : 'min';
  return (
    <div className="vista-fija" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px', gridTemplateRows: 'auto minmax(0,1fr) auto' }}>
      <div className="fila" style={{ gridColumn: '1 / 3' }}>
        <BuscadorEstacion red={red} etiqueta="Origen" valor={origen} alElegir={elegirOrigen} />
        <BuscadorEstacion red={red} etiqueta="Destino" valor={destino} alElegir={elegirDestino} />
        <SelectorAlgoritmo />
        <button className="boton principal" onClick={calcular}><Route size={16} />Calcular ruta</button>
        <span className="etiqueta">Siguiente clic en el mapa: {turno}</span>
      </div>
      <div style={{ minHeight: 0 }}>
        <Mapa red={red} origen={origen} destino={destino} estados={res?.estados} ruta={res?.ruta} vehiculos alClicEstacion={clicEstacion} />
      </div>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <h3 style={{ marginBottom: 0 }}>Resultado</h3>
        {res === null ? (
          <div className="vacio">Elige origen y destino, y pulsa Calcular ruta.</div>
        ) : !res.alcanzado ? (
          <div className="vacio">No existe ruta entre esas estaciones.</div>
        ) : (
          <>
            <p style={{ fontWeight: 600 }}>{rutaTexto(red, res.ruta, red.numEstaciones > 12)}</p>
            <div className="metricas">
              <div className="metrica"><span>{res.costo === null ? 'Saltos' : `Costo (${unidad})`}</span><b>{res.costo === null ? res.saltos : num(res.costo, 3)}</b></div>
              <div className="metrica"><span>Saltos</span><b>{res.saltos}</b></div>
              <div className="metrica"><span>Nodos expandidos</span><b>{res.expandidos}</b></div>
              <div className="metrica"><span>{res.costo === null ? 'Arcos examinados' : 'Relajaciones'}</span><b>{res.relajaciones}</b></div>
              <div className="metrica"><span>Operaciones del heap</span><b>{res.opsHeap ?? 'No usa'}</b></div>
              <div className="metrica"><span>Tiempo (μs)</span><b>{num(res.microsegundos, 1)}</b></div>
            </div>
            <div className="fila">
              <span className="etiqueta mono">{COMPLEJIDAD[res.algoritmo]}</span>
              <span className="etiqueta">{ESTRUCTURA[res.algoritmo]}</span>
            </div>
            {res.algoritmo === 'dfs' && <p style={{ color: 'var(--texto-3)', fontSize: 12 }}>DFS halla una ruta, no necesariamente la mejor. Las alternativas están en el Explorador DFS.</p>}
            {res.algoritmo === 'bfs' && <p style={{ color: 'var(--texto-3)', fontSize: 12 }}>BFS minimiza saltos e ignora los pesos.</p>}
            <button className="boton" onClick={() => irA('visualizador')}><Play size={15} />Ver paso a paso</button>
          </>
        )}
      </div>
      <div style={{ gridColumn: '1 / 3' }}><LeyendaMapa /></div>
    </div>
  );
}
