import { cargarPreset } from '@redes/presets';
import { Check, Download, Printer, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Mapa } from '../componentes/Mapa';
import { casoACsv, CASOS, ejecutarCaso } from '../datos/escritorio';
import { descargar } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';

export function PruebaEscritorio() {
  const red = useMemo(() => cargarPreset('docente'), []);
  const resultados = useMemo(() => CASOS.map((c) => ejecutarCaso(red, c)), [red]);
  const [sel, setSel] = useState(0);
  const avisar = useTienda((e) => e.avisar);
  const r = resultados[sel];
  const fin = r.pasos[r.pasos.length - 1];
  const ruta = useMemo(() => Int32Array.from(r.ruta.split(' → '), (x) => red.indiceDe(x)), [r, red]);
  const todos = resultados.every((x) => x.coincide);

  return (
    <div className="vista">
      <div className="encabezado">
        <h2>Prueba de escritorio</h2>
        <p>Red docente de 8 estaciones y 11 vías, en el orden exacto del documento. Cada fila se ejecuta con el código real y se compara con la tabla del docente.</p>
      </div>
      <div className="panel">
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr><th>Algoritmo</th><th>Entrada</th><th>Ruta esperada</th><th>Ruta obtenida</th><th>Métrica</th><th>Complejidad</th><th>Estructura</th><th>Verificación</th></tr>
            </thead>
            <tbody>
              {resultados.map((x, i) => (
                <tr key={x.caso.nombre} className={i === sel ? 'resaltada' : ''} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                  <td><b>{x.caso.nombre}</b></td>
                  <td className="mono">({x.caso.desde}, {x.caso.hasta})</td>
                  <td className="mono">{x.caso.rutaEsperada}</td>
                  <td className="mono">{x.ruta}</td>
                  <td className="mono">{x.metrica}</td>
                  <td className="mono">{x.caso.complejidad}</td>
                  <td>{x.caso.estructura}</td>
                  <td>{x.coincide ? <span className="etiqueta ok"><Check size={13} />Coincide</span> : <span className="etiqueta mal"><X size={13} />No coincide</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 8, color: 'var(--texto-3)', fontSize: 12 }}>
          {todos ? 'Los 4 casos coinciden.' : 'Hay casos que no coinciden.'} La tabla del docente admite "2 o 3 saltos" para BFS; con BFS correcto siempre son 2, porque C es el único vecino de A adyacente a E.
        </p>
      </div>
      <div className="fila no-imprimir">
        <div className="grupo" role="group" aria-label="Caso">
          {resultados.map((x, i) => <button key={x.caso.nombre} className={`boton ${i === sel ? 'activo' : ''}`} onClick={() => setSel(i)}>{x.caso.nombre}</button>)}
        </div>
        <button className="boton" onClick={() => { descargar(`traza_${r.caso.algoritmo}.csv`, casoACsv(r)); avisar('Traza exportada a CSV', 'ok'); }}><Download size={15} />Exportar CSV</button>
        <button className="boton" onClick={() => window.print()}><Printer size={15} />Imprimir o guardar PDF</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div style={{ height: 320, gridColumn: 'span 1' }} className="no-imprimir">
          <Mapa red={red} estados={fin.estados} ruta={ruta} origen={red.indiceDe(r.caso.desde)} destino={red.indiceDe(r.caso.hasta)} minimapa={false} />
        </div>
        <div className="panel" style={{ gridColumn: '1 / -1' }}>
          <h3>Traza de {r.caso.nombre} ({r.caso.desde}, {r.caso.hasta}), una fila por iteración</h3>
          <div className="tabla-caja" style={{ maxHeight: 420 }}>
            <table className="tabla mono">
              <thead><tr><th>#</th><th>Evento</th><th>Estructura al final</th><th>d[]</th><th>π[]</th><th>Cerrados</th></tr></thead>
              <tbody>
                {r.filas.map((f, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td style={{ fontFamily: 'Sora, sans-serif', minWidth: 200 }}>{f.evento}</td>
                    <td>{f.estructura}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{f.d}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{f.pi}</td>
                    <td>{f.visitados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.heuristicas && <p className="mono" style={{ fontSize: 12, marginTop: 8 }}>h(n) evaluada: {r.heuristicas}</p>}
        </div>
      </div>
    </div>
  );
}
