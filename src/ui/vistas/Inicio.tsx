import { trazar } from '../datos/ejecutar';
import { Mapa } from '../componentes/Mapa';
import { useReproductor } from '../componentes/Reproductor';
import { useTienda } from '../estado/tienda';
import config from '../../../proyecto.config.json';
import { cargarPreset } from '@redes/presets';
import { Compass, Presentation } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const LOGO = './logo-univalle.png';

/** Red de Buenaventura resolviéndose sola: es lo primero que debe verse del proyecto. */
function RedViva() {
  const red = useMemo(() => cargarPreset('buenaventura'), []);
  const s = red.indiceDe('MT');
  const t = red.indiceDe('UN');
  const { pasos } = useMemo(() => trazar(red, 'aestrella', s, t, 'km'), [red, s, t]);
  const r = useReproductor(pasos.length);
  const { setCorriendo, setVelocidad, setPaso, paso } = r;

  useEffect(() => {
    setVelocidad(14);
    setCorriendo(true);
  }, [setCorriendo, setVelocidad, pasos.length]);

  // Al terminar, deja la ruta unos segundos y vuelve a empezar
  useEffect(() => {
    if (paso < pasos.length - 1) return undefined;
    const t0 = setTimeout(() => {
      setPaso(0);
      setCorriendo(true);
    }, 5200);
    return () => clearTimeout(t0);
  }, [paso, pasos.length, setPaso, setCorriendo]);

  const p = pasos[Math.min(paso, pasos.length - 1)];
  const final = paso >= pasos.length - 1;
  const ruta = useMemo(() => {
    const u = pasos[pasos.length - 1];
    const r0: number[] = [];
    for (let v = t; v !== -1; v = u.pi[v]) r0.unshift(v);
    return Int32Array.from(r0);
  }, [pasos, t]);
  return <Mapa red={red} estados={p.estados} origen={s} destino={t} nodoActual={p.nodo} arcoActual={p.arco} ruta={final ? ruta : undefined} vehiculos={final} etiquetas="ninguna" minimapa={false} etiquetaAria="Red de Buenaventura resolviendo la ruta del muelle a la universidad" />;
}

export function Inicio() {
  const irA = useTienda((e) => e.irA);
  const abrirSustentacion = useTienda((e) => e.abrirSustentacion);
  const [logo, setLogo] = useState(true);
  return (
    <div className="hero">
      <div className="col-hero" style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center', minWidth: 0 }}>
        <div className="fila" style={{ gap: 12 }}>
          <div className="logo-espacio">{logo ? <img src={LOGO} alt="Logo de la Universidad del Valle" onError={() => setLogo(false)} /> : <span>public/ logo-univalle.png</span>}</div>
          <div style={{ fontSize: 12.5, color: 'var(--texto-2)' }}>
            {config.universidad}
            <br />
            {config.curso} ({config.codigoCurso}) · {config.periodo}
            <br />
            Docente: {config.docente}
          </div>
        </div>
        <h1>Centro de Control de Movilidad <span>Pacífico</span></h1>
        <p style={{ color: 'var(--texto-2)', fontSize: 15, maxWidth: '54ch' }}>
          {config.proyecto}: una red de transporte simulada para comparar BFS, DFS, Dijkstra y A* con estructuras de datos propias, y medir su costo real.
        </p>
        <div className="fila">
          <button className="boton principal" onClick={() => abrirSustentacion(true)}><Presentation size={16} />Iniciar sustentación</button>
          <button className="boton" onClick={() => irA('planificador')}><Compass size={16} />Abrir planificador</button>
        </div>
        <div>
          <p style={{ fontSize: 11.5, color: 'var(--texto-3)', marginBottom: 4 }}>Integrantes</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
            {config.integrantes.map((p, i) => (
              <li key={i}>{p.nombre} {p.apellidos} · <span className="mono">{p.codigo}</span></li>
            ))}
          </ul>
        </div>
        <p style={{ fontSize: 11, color: 'var(--texto-3)' }}>Red simulada con fines académicos.</p>
      </div>
      <div style={{ minHeight: 360, minWidth: 0 }}><RedViva /></div>
    </div>
  );
}
