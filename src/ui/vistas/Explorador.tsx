import { alcanzablesDesde, componentesConexas, estanConectadas, puntosCriticos } from '@core/algoritmos/conectividad';
import { rutasSimples } from '@core/algoritmos/rutasSimples';
import { Search, Waypoints } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BuscadorEstacion } from '../componentes/Buscador';
import { Mapa } from '../componentes/Mapa';
import { num, rutaTexto } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';

export function Explorador() {
  const { red, versionRed, metrica, origen, destino, elegirOrigen, elegirDestino } = useTienda();
  const [limite, setLimite] = useState(500);
  const [costoMax, setCostoMax] = useState('');
  const [res, setRes] = useState<ReturnType<typeof rutasSimples> | null>(null);
  const [sel, setSel] = useState(0);
  const [verCriticos, setVerCriticos] = useState(true);

  useEffect(() => {
    setRes(null);
    setSel(0);
  }, [versionRed, origen, destino, metrica]);

  const criticos = useMemo(() => puntosCriticos(red), [red]);
  const componentes = useMemo(() => componentesConexas(red), [red]);
  const marcas = useMemo(() => {
    const c = new Uint8Array(red.numEstaciones);
    criticos.articulaciones.forEach((i) => { c[i] = 1; });
    const p = new Uint8Array(red.numVias);
    criticos.puentes.forEach((i) => { p[i] = 1; });
    return { c, p };
  }, [red, criticos]);

  const conectadas = useMemo(() => estanConectadas(red, origen, destino), [red, origen, destino]);
  const alcanzables = useMemo(() => alcanzablesDesde(red, origen).length, [red, origen]);

  const buscar = () => {
    const c = Number(costoMax);
    setRes(rutasSimples(red, origen, destino, { metrica, limite, costoMaximo: costoMax !== '' && Number.isFinite(c) ? c : undefined }));
    setSel(0);
  };

  const ruta = res?.rutas[sel]?.estaciones;
  const unidad = metrica === 'km' ? 'km' : 'min';
  return (
    <div className="vista-fija" style={{ gridTemplateColumns: 'minmax(0,1fr) 400px', gridTemplateRows: 'auto minmax(0,1fr)' }}>
      <div className="fila" style={{ gridColumn: '1 / 3' }}>
        <BuscadorEstacion red={red} etiqueta="Origen" valor={origen} alElegir={elegirOrigen} />
        <BuscadorEstacion red={red} etiqueta="Destino" valor={destino} alElegir={elegirDestino} />
        <label className="campo">Máximo de rutas<input type="number" min={1} max={100000} value={limite} onChange={(e) => setLimite(Number(e.target.value) || 1)} style={{ width: 100 }} /></label>
        <label className="campo">Poda por costo<input type="number" min={0} value={costoMax} placeholder="Sin poda" onChange={(e) => setCostoMax(e.target.value)} style={{ width: 100 }} /></label>
        <button className="boton principal" onClick={buscar}><Search size={15} />Hallar todas las rutas</button>
        <button className={`boton ${verCriticos ? 'activo' : ''}`} aria-pressed={verCriticos} onClick={() => setVerCriticos((v) => !v)}><Waypoints size={15} />Puntos críticos</button>
      </div>
      <div style={{ minHeight: 0 }}>
        <Mapa red={red} origen={origen} destino={destino} ruta={ruta} criticas={verCriticos ? marcas.c : undefined} puentes={verCriticos ? marcas.p : undefined} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'auto' }}>
        <div className="panel">
          <h3>Conectividad</h3>
          <div className="metricas">
            <div className="metrica"><span>¿{red.estacion(origen).id} llega a {red.estacion(destino).id}?</span><b>{conectadas ? 'Sí' : 'No'}</b></div>
            <div className="metrica"><span>Componentes</span><b>{componentes.cantidad}</b></div>
            <div className="metrica"><span>Alcanzables</span><b>{alcanzables}/{red.numEstaciones}</b></div>
          </div>
          {red.dirigida && <p style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 6 }}>Red dirigida: las componentes ignoran la dirección; la alcanzabilidad la respeta.</p>}
        </div>
        <div className="panel">
          <h3>Estaciones y vías críticas (Tarjan)</h3>
          {criticos.articulaciones.length === 0 && criticos.puentes.length === 0 ? (
            <p style={{ color: 'var(--texto-3)' }}>Ninguna: la red resiste la caída de cualquier estación o vía.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16, maxHeight: 130, overflow: 'auto' }}>
              {Array.from(criticos.articulaciones.subarray(0, 40), (i) => <li key={`e${i}`}>Si {red.estacion(i).nombre} falla, la red se parte en {criticos.partesAlFallar[i]}.</li>)}
              {Array.from(criticos.puentes.subarray(0, 40), (v) => <li key={`v${v}`}>Vía crítica: {red.estacion(red.via(v).origen).nombre} – {red.estacion(red.via(v).destino).nombre}.</li>)}
            </ul>
          )}
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 200 }}>
          <h3>Rutas simples</h3>
          {res === null ? (
            <div className="vacio">Pulsa Hallar todas las rutas. Es un DFS con backtracking, ordenado con el MergeSort propio.</div>
          ) : res.rutas.length === 0 ? (
            <div className="vacio">No hay rutas con esas condiciones.</div>
          ) : (
            <>
              <p style={{ marginBottom: 6 }}><b>{res.rutas.length}</b> rutas{res.truncado ? ' (se alcanzó el límite: puede haber más)' : ''}. {res.nodosExplorados} llamadas, {res.podas} podas.</p>
              <div className="tabla-caja" style={{ maxHeight: 260 }}>
                <table className="tabla">
                  <thead><tr><th>#</th><th>Costo ({unidad})</th><th>Ruta</th></tr></thead>
                  <tbody>
                    {res.rutas.slice(0, 300).map((r, i) => (
                      <tr key={i} className={i === sel ? 'resaltada' : ''} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{i + 1}</td>
                        <td className="mono">{num(r.costo)}</td>
                        <td className="mono">{rutaTexto(red, r.estaciones)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
