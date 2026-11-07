import { useMemo } from 'react';
import { BuscadorEstacion } from '../componentes/Buscador';
import { InspectorEstructuras, Pseudocodigo } from '../componentes/Inspector';
import { LeyendaMapa, Mapa } from '../componentes/Mapa';
import { BarraReproductor, useReproductor, useTeclasReproductor } from '../componentes/Reproductor';
import { trazar } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';
import { SelectorAlgoritmo } from './Planificador';

export function Visualizador() {
  const { red, metrica, origen, destino, algoritmo, elegirOrigen, elegirDestino } = useTienda();
  const demasiado = red.numEstaciones > 1000;
  const traza = useMemo(() => (demasiado ? { pasos: [], truncado: false } : trazar(red, algoritmo, origen, destino, metrica)), [red, algoritmo, origen, destino, metrica, demasiado]);
  const r = useReproductor(traza.pasos.length);
  useTeclasReproductor(r);

  const paso = traza.pasos[Math.min(r.paso, traza.pasos.length - 1)];
  const ruta = useMemo(() => {
    if (!paso || r.paso < traza.pasos.length - 1) return undefined;
    const c: number[] = [];
    for (let v = destino; v !== -1; v = paso.pi[v]) c.unshift(v);
    return c.length > 0 && c[0] === origen ? Int32Array.from(c) : undefined;
  }, [paso, r.paso, traza.pasos.length, destino, origen]);

  if (demasiado) {
    return (
      <div className="vista">
        <div className="vacio">La animación paso a paso guarda una foto por paso y se limita a redes de hasta 1000 estaciones. Elige una red menor en la barra superior.</div>
      </div>
    );
  }
  if (!paso) return <div className="vista"><div className="vacio">Sin pasos para mostrar.</div></div>;

  return (
    <div className="vista-fija" style={{ gridTemplateColumns: 'minmax(0,1fr) 430px', gridTemplateRows: 'auto minmax(0,1fr) auto auto' }}>
      <div className="fila" style={{ gridColumn: '1 / 3' }}>
        <BuscadorEstacion red={red} etiqueta="Origen" valor={origen} alElegir={elegirOrigen} />
        <BuscadorEstacion red={red} etiqueta="Destino" valor={destino} alElegir={elegirDestino} />
        <SelectorAlgoritmo />
        {traza.truncado && <span className="etiqueta mal">Traza recortada: la red es grande</span>}
      </div>
      <div style={{ minHeight: 0 }}>
        <Mapa red={red} estados={paso.estados} origen={origen} destino={destino} nodoActual={paso.nodo} arcoActual={paso.arco} ruta={ruta} />
      </div>
      <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)', gap: 10, minHeight: 0 }}>
        <Pseudocodigo algoritmo={algoritmo} linea={paso.linea} />
        <InspectorEstructuras paso={paso} anterior={traza.pasos[r.paso - 1]} red={red} />
      </div>
      <div className="narracion" style={{ gridColumn: '1 / 3' }} aria-live="polite">{paso.narracion}</div>
      <div style={{ gridColumn: '1 / 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <BarraReproductor r={r} total={traza.pasos.length} />
        <LeyendaMapa />
      </div>
    </div>
  );
}
