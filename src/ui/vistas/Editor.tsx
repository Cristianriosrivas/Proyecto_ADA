import { RedTransporte, validarRedJSON } from '@core/grafo/RedTransporte';
import type { RedJSON } from '@core/grafo/tipos';
import { CheckCircle, Download, MousePointer2, Plus, Spline, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Mapa } from '../componentes/Mapa';
import { descargar, num } from '../datos/ejecutar';
import { useTienda } from '../estado/tienda';

type Herramienta = 'mover' | 'estacion' | 'via' | 'borrar';

const HERRAMIENTAS: { id: Herramienta; nombre: string; icono: typeof Plus; ayuda: string }[] = [
  { id: 'mover', nombre: 'Mover y editar', icono: MousePointer2, ayuda: 'Arrastra una estación. Haz clic en una vía para editar sus pesos.' },
  { id: 'estacion', nombre: 'Agregar estación', icono: Plus, ayuda: 'Haz clic en un punto vacío del mapa.' },
  { id: 'via', nombre: 'Agregar vía', icono: Spline, ayuda: 'Haz clic en dos estaciones. El peso sale de la distancia, y se puede editar.' },
  { id: 'borrar', nombre: 'Eliminar', icono: Trash2, ayuda: 'Haz clic en una estación o en una vía.' },
];

export function Editor() {
  const { red, versionRed, usarRed, avisar } = useTienda();
  const [doc, setDoc] = useState<RedJSON>(() => red.aJSON());
  const [herramienta, setHerramienta] = useState<Herramienta>('mover');
  const [inicioVia, setInicioVia] = useState(-1);
  const [viaSel, setViaSel] = useState(-1);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDoc(red.aJSON());
    setViaSel(-1);
    setInicioVia(-1);
    // Solo cuando llega una red nueva desde fuera: `red` cambia junto con `versionRed`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionRed]);

  const errores = useMemo(() => validarRedJSON(doc), [doc]);
  const vista = useMemo(() => (errores.length === 0 ? RedTransporte.desdeJSON(doc) : red), [doc, errores, red]);

  const siguienteId = () => {
    let i = doc.estaciones.length + 1;
    while (doc.estaciones.some((e) => e.id === `N${i}`)) i++;
    return `N${i}`;
  };

  const clicVacio = (x: number, y: number) => {
    if (herramienta !== 'estacion') return;
    const id = siguienteId();
    setDoc((d) => ({ ...d, estaciones: [...d.estaciones, { id, nombre: id, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) }] }));
  };

  const clicEstacion = (i: number) => {
    if (herramienta === 'via') {
      if (inicioVia === -1) {
        setInicioVia(i);
        return;
      }
      if (inicioVia !== i) {
        const km = Number((vista.distanciaEuclidiana(inicioVia, i) * 1.2).toFixed(3));
        const desde = doc.estaciones[inicioVia].id;
        const hasta = doc.estaciones[i].id;
        setDoc((d) => ({ ...d, vias: [...d.vias, { desde, hasta, distanciaKm: km, tiempoMin: Number((km / 0.5).toFixed(3)) }] }));
      }
      setInicioVia(-1);
    } else if (herramienta === 'borrar') {
      const id = doc.estaciones[i].id;
      setDoc((d) => ({ ...d, estaciones: d.estaciones.filter((e) => e.id !== id), vias: d.vias.filter((v) => v.desde !== id && v.hasta !== id) }));
      setViaSel(-1);
    }
  };

  const clicVia = (v: number) => {
    if (herramienta === 'borrar') {
      setDoc((d) => ({ ...d, vias: d.vias.filter((_, i) => i !== v) }));
      setViaSel(-1);
    } else if (herramienta === 'mover') setViaSel(v);
  };

  const mover = (i: number, x: number, y: number) => {
    if (herramienta !== 'mover') return;
    setDoc((d) => ({ ...d, estaciones: d.estaciones.map((e, k) => (k === i ? { ...e, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) } : e)) }));
  };

  const editarVia = (campo: 'distanciaKm' | 'tiempoMin', valor: number) => setDoc((d) => ({ ...d, vias: d.vias.map((v, i) => (i === viaSel ? { ...v, [campo]: valor } : v)) }));

  const aplicar = () => {
    if (errores.length > 0) {
      avisar(errores[0], 'mal');
      return;
    }
    usarRed(RedTransporte.desdeJSON(doc));
    avisar('La red editada ya es la red activa en todas las vistas', 'ok');
  };

  const importar = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()) as RedJSON;
      const e = validarRedJSON(j);
      if (e.length > 0) {
        avisar(`Archivo inválido: ${e[0]}`, 'mal');
        return;
      }
      setDoc(j);
      avisar(`Red importada: ${j.estaciones.length} estaciones`, 'ok');
    } catch {
      avisar('El archivo no es un JSON válido', 'mal');
    }
  };

  const ayuda = HERRAMIENTAS.find((h) => h.id === herramienta)?.ayuda ?? '';
  const via = viaSel >= 0 ? doc.vias[viaSel] : undefined;
  const grande = doc.estaciones.length > 300;
  return (
    <div className="vista-fija" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px', gridTemplateRows: 'auto minmax(0,1fr)' }}>
      <div className="fila" style={{ gridColumn: '1 / 3' }}>
        <div className="grupo" role="group" aria-label="Herramienta">
          {HERRAMIENTAS.map((h) => {
            const I = h.icono;
            return <button key={h.id} className={`boton ${herramienta === h.id ? 'activo' : ''}`} aria-pressed={herramienta === h.id} onClick={() => { setHerramienta(h.id); setInicioVia(-1); }}><I size={15} />{h.nombre}</button>;
          })}
        </div>
        <button className={`boton ${doc.dirigida ? 'activo' : ''}`} aria-pressed={doc.dirigida} onClick={() => setDoc((d) => ({ ...d, dirigida: !d.dirigida }))}>{doc.dirigida ? 'Red dirigida' : 'Red no dirigida'}</button>
        <button className="boton principal" onClick={aplicar}><CheckCircle size={15} />Usar esta red</button>
        <button className="boton" onClick={() => descargar(`${doc.nombre.replace(/\s+/g, '_')}.json`, JSON.stringify(doc, null, 2), 'application/json')}><Download size={15} />Exportar JSON</button>
        <button className="boton" onClick={() => archivo.current?.click()}><Upload size={15} />Importar JSON</button>
        <input ref={archivo} type="file" accept="application/json,.json" hidden aria-label="Archivo JSON de red" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = ''; }} />
      </div>
      <div style={{ minHeight: 0 }}>
        <Mapa red={vista} origen={inicioVia >= 0 ? inicioVia : undefined} alClicEstacion={clicEstacion} alClicVia={clicVia} alClicVacio={clicVacio} alMover={herramienta === 'mover' && !grande ? mover : undefined} />
      </div>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <p style={{ color: 'var(--texto-2)' }}>{ayuda}</p>
        <div className="metricas">
          <div className="metrica"><span>Estaciones</span><b>{doc.estaciones.length}</b></div>
          <div className="metrica"><span>Vías</span><b>{doc.vias.length}</b></div>
        </div>
        <label className="campo">Nombre de la red<input type="text" value={doc.nombre} onChange={(e) => setDoc((d) => ({ ...d, nombre: e.target.value }))} /></label>
        {via ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <b>Vía {via.desde} – {via.hasta}</b>
            <label className="campo">Distancia (km)<input type="number" min={0} step={0.1} value={via.distanciaKm} onChange={(e) => editarVia('distanciaKm', Number(e.target.value))} /></label>
            <label className="campo">Tiempo (min)<input type="number" min={0} step={0.1} value={via.tiempoMin} onChange={(e) => editarVia('tiempoMin', Number(e.target.value))} /></label>
            {errores.length === 0 && (() => {
              const v = vista.via(viaSel);
              const recta = vista.distanciaEuclidiana(v.origen, v.destino);
              return recta > v.distanciaKm + 1e-9 ? <p style={{ color: 'var(--critico)', fontSize: 12 }}>Más corta que la línea recta ({num(recta)} km): h euclidiana deja de ser admisible.</p> : <p style={{ color: 'var(--texto-3)', fontSize: 12 }}>Línea recta: {num(recta)} km.</p>;
            })()}
          </div>
        ) : (
          <p style={{ color: 'var(--texto-3)', fontSize: 12 }}>Selecciona una vía con Mover y editar para cambiar sus pesos.</p>
        )}
        {errores.length > 0 && (
          <ul style={{ color: 'var(--critico)', fontSize: 12, margin: 0, paddingLeft: 16 }}>
            {errores.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
