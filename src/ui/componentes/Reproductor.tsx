import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Reloj del reproductor: paso actual, play/pausa y velocidad, compartido por varias vistas. */
export function useReproductor(total: number) {
  const [paso, setPaso] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [velocidad, setVelocidad] = useState(4);
  const ultimo = useRef(total - 1);
  ultimo.current = total - 1;

  useEffect(() => {
    setPaso(0);
    setCorriendo(false);
  }, [total]);

  useEffect(() => {
    if (!corriendo) return undefined;
    const t = setInterval(() => {
      setPaso((p) => {
        if (p >= ultimo.current) {
          setCorriendo(false);
          return p;
        }
        return p + 1;
      });
    }, 1000 / velocidad);
    return () => clearInterval(t);
  }, [corriendo, velocidad]);

  const adelante = useCallback(() => setPaso((p) => Math.min(p + 1, ultimo.current)), []);
  const atras = useCallback(() => setPaso((p) => Math.max(p - 1, 0)), []);
  const alternar = useCallback(() => {
    setPaso((p) => (p >= ultimo.current ? 0 : p));
    setCorriendo((c) => !c);
  }, []);
  return { paso, setPaso, corriendo, setCorriendo, velocidad, setVelocidad, adelante, atras, alternar };
}

export type Reproductor = ReturnType<typeof useReproductor>;

/** Espacio = play, ← y → = paso. Se ignoran mientras se escribe en un campo. */
export function useTeclasReproductor(r: Reproductor, activo = true) {
  const { alternar, adelante, atras } = r;
  useEffect(() => {
    if (!activo) return undefined;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (e.key === ' ') {
        e.preventDefault();
        alternar();
      } else if (e.key === 'ArrowRight') adelante();
      else if (e.key === 'ArrowLeft') atras();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [alternar, adelante, atras, activo]);
}

export function BarraReproductor({ r, total }: { r: Reproductor; total: number }) {
  return (
    <div className="fila" role="group" aria-label="Controles de reproducción">
      <div className="grupo">
        <button className="boton icono" onClick={() => r.setPaso(0)} aria-label="Volver al inicio"><RotateCcw size={15} /></button>
        <button className="boton icono" onClick={r.atras} aria-label="Paso atrás"><ChevronLeft size={16} /></button>
        <button className="boton icono principal" onClick={r.alternar} aria-label={r.corriendo ? 'Pausar' : 'Reproducir'}>{r.corriendo ? <Pause size={15} /> : <Play size={15} />}</button>
        <button className="boton icono" onClick={r.adelante} aria-label="Paso adelante"><ChevronRight size={16} /></button>
      </div>
      <input type="range" min={0} max={Math.max(total - 1, 0)} value={r.paso} onChange={(e) => r.setPaso(Number(e.target.value))} style={{ flex: 1, minWidth: 120 }} aria-label="Línea de tiempo" />
      <span className="mono" style={{ minWidth: 76, textAlign: 'right' }}>{Math.min(r.paso + 1, total)}/{total}</span>
      <label className="campo" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        Velocidad
        <input type="range" min={1} max={30} value={r.velocidad} onChange={(e) => r.setVelocidad(Number(e.target.value))} aria-label="Velocidad" style={{ width: 90 }} />
      </label>
    </div>
  );
}
