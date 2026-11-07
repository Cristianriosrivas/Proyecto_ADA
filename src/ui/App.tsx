import { BookOpen, ClipboardCheck, Command, Compass, FlaskConical, GitBranch, Home, Moon, PencilRuler, Play, Sun, Swords, TrafficCone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Component, useEffect, type ComponentType, type ReactNode } from 'react';
import { PaletaComandos, VISTAS } from './componentes/Paleta';
import { Sustentacion } from './componentes/Sustentacion';
import { CATALOGO } from './datos/catalogo';
import { useTienda, type Vista } from './estado/tienda';
import { Duelo } from './vistas/Duelo';
import { Editor } from './vistas/Editor';
import { Explorador } from './vistas/Explorador';
import { Inicio } from './vistas/Inicio';
import { Laboratorio } from './vistas/Laboratorio';
import { Planificador } from './vistas/Planificador';
import { PruebaEscritorio } from './vistas/PruebaEscritorio';
import { Teoria } from './vistas/Teoria';
import { Trafico } from './vistas/Trafico';
import { Visualizador } from './vistas/Visualizador';

const ICONOS: Record<Vista, LucideIcon> = {
  inicio: Home,
  planificador: Compass,
  visualizador: Play,
  escritorio: ClipboardCheck,
  explorador: GitBranch,
  duelo: Swords,
  trafico: TrafficCone,
  laboratorio: FlaskConical,
  teoria: BookOpen,
  editor: PencilRuler,
};

const COMPONENTES: Record<Vista, ComponentType> = {
  inicio: Inicio,
  planificador: Planificador,
  visualizador: Visualizador,
  escritorio: PruebaEscritorio,
  explorador: Explorador,
  duelo: Duelo,
  trafico: Trafico,
  laboratorio: Laboratorio,
  teoria: Teoria,
  editor: Editor,
};

/** Si una vista falla, muestra qué hacer en vez de dejar la pantalla en blanco. */
class Barrera extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };

  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }

  override render() {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="vista">
        <div className="vacio">
          <p>Esta vista encontró un error: {this.state.error}</p>
          <button className="boton" style={{ marginTop: 10 }} onClick={() => this.setState({ error: null })}>Reintentar</button>
        </div>
      </div>
    );
  }
}

function Marca() {
  return (
    <div className="marca">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <path d="M3 21 L10 8 L17 15 L23 5" fill="none" stroke="var(--ruta)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="3" cy="21" r="2.6" fill="var(--origen)" />
        <circle cx="10" cy="8" r="2.4" fill="var(--texto)" />
        <circle cx="17" cy="15" r="2.4" fill="var(--texto)" />
        <circle cx="23" cy="5" r="2.6" fill="var(--destino)" />
      </svg>
      <span>Gestor de Rutas<small>CONTROL DE MOVILIDAD</small></span>
    </div>
  );
}

export function App() {
  const { vista, irA, tema, alternarTema, redId, elegirRed, red, versionRed, metrica, elegirMetrica, avisos, sustentacion, paleta, abrirPaleta } = useTienda();

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        abrirPaleta(!useTienda.getState().paleta);
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [abrirPaleta]);

  const Actual = COMPONENTES[vista];
  return (
    <div className="shell">
      <aside className="barra-lateral">
        <Marca />
        <nav className="nav" aria-label="Secciones">
          {VISTAS.map((v) => {
            const I = ICONOS[v.id];
            return (
              <button key={v.id} aria-current={vista === v.id ? 'page' : undefined} onClick={() => irA(v.id)}>
                <I size={16} />{v.nombre}
              </button>
            );
          })}
        </nav>
      </aside>
      <header className="barra-superior">
        <label className="fila" style={{ gap: 6 }}>
          <span style={{ color: 'var(--texto-3)', fontSize: 12 }}>Red</span>
          <select aria-label="Red activa" value={CATALOGO.some((c) => c.id === redId) ? redId : ''} onChange={(e) => elegirRed(e.target.value)}>
            {!CATALOGO.some((c) => c.id === redId) && <option value="">{red.nombre} (editada)</option>}
            {CATALOGO.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <div className="grupo" role="group" aria-label="Métrica">
          <button className={`boton ${metrica === 'km' ? 'activo' : ''}`} aria-pressed={metrica === 'km'} onClick={() => elegirMetrica('km')}>km</button>
          <button className={`boton ${metrica === 'min' ? 'activo' : ''}`} aria-pressed={metrica === 'min'} onClick={() => elegirMetrica('min')}>min</button>
        </div>
        <span className="etiqueta mono" title="Estaciones, vías y tipo de red">V = {red.numEstaciones} · E = {red.numVias} · {red.dirigida ? 'dirigida' : 'no dirigida'}</span>
        <span className="espacio" />
        <button className="boton" onClick={() => abrirPaleta(true)} aria-label="Abrir paleta de comandos"><Command size={14} />Ctrl+K</button>
        <button className="boton icono" onClick={alternarTema} aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>{tema === 'oscuro' ? <Sun size={16} /> : <Moon size={16} />}</button>
      </header>
      <main className="contenido">
        {/* La clave reinicia la vista al cambiar de red: ningún resultado viejo apunta a estaciones que ya no existen */}
        <Barrera>
          <Actual key={versionRed} />
        </Barrera>
      </main>
      {paleta && <PaletaComandos />}
      {sustentacion && <Sustentacion />}
      <div className="toasts" role="status" aria-live="polite">
        {avisos.map((a) => <div key={a.id} className={`toast ${a.tipo}`}>{a.texto}</div>)}
      </div>
    </div>
  );
}
