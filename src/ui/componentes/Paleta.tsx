import { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGO } from '../datos/catalogo';
import { useTienda, type Vista } from '../estado/tienda';

interface Comando {
  texto: string;
  grupo: string;
  accion: () => void;
}

export const VISTAS: { id: Vista; nombre: string }[] = [
  { id: 'inicio', nombre: 'Inicio' },
  { id: 'planificador', nombre: 'Planificador' },
  { id: 'visualizador', nombre: 'Visualizador' },
  { id: 'escritorio', nombre: 'Prueba de Escritorio' },
  { id: 'explorador', nombre: 'Explorador DFS' },
  { id: 'duelo', nombre: 'Duelo' },
  { id: 'trafico', nombre: 'Tráfico' },
  { id: 'laboratorio', nombre: 'Laboratorio' },
  { id: 'teoria', nombre: 'Teoría' },
  { id: 'editor', nombre: 'Editor' },
];

export function PaletaComandos() {
  const { irA, elegirRed, alternarTema, abrirSustentacion, abrirPaleta, elegirMetrica } = useTienda();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const comandos = useMemo<Comando[]>(
    () => [
      ...VISTAS.map((v) => ({ texto: v.nombre, grupo: 'Ir a', accion: () => irA(v.id) })),
      ...CATALOGO.map((c) => ({ texto: c.nombre, grupo: 'Red', accion: () => elegirRed(c.id) })),
      { texto: 'Iniciar sustentación', grupo: 'Acción', accion: () => abrirSustentacion(true) },
      { texto: 'Cambiar tema', grupo: 'Acción', accion: alternarTema },
      { texto: 'Métrica en kilómetros', grupo: 'Acción', accion: () => elegirMetrica('km') },
      { texto: 'Métrica en minutos', grupo: 'Acción', accion: () => elegirMetrica('min') },
    ],
    [irA, elegirRed, alternarTema, abrirSustentacion, elegirMetrica],
  );

  const lista = useMemo(() => {
    const t = q.toLowerCase().trim();
    return t === '' ? comandos : comandos.filter((c) => c.texto.toLowerCase().includes(t) || c.grupo.toLowerCase().includes(t));
  }, [comandos, q]);

  useEffect(() => ref.current?.focus(), []);
  useEffect(() => setSel(0), [q]);

  const ejecutar = (c: Comando | undefined) => {
    if (!c) return;
    abrirPaleta(false);
    c.accion();
  };

  return (
    <div className="paleta-fondo" onClick={() => abrirPaleta(false)}>
      <div className="paleta" role="dialog" aria-label="Paleta de comandos" onClick={(e) => e.stopPropagation()}>
        <input
          ref={ref}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca una vista, una red o una acción"
          aria-label="Buscar comando"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, lista.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            } else if (e.key === 'Enter') ejecutar(lista[sel]);
            else if (e.key === 'Escape') abrirPaleta(false);
          }}
        />
        <ul>
          {lista.map((c, i) => (
            <li key={`${c.grupo}${c.texto}`} className={i === sel ? 'sel' : ''}>
              <button onClick={() => ejecutar(c)}><span>{c.texto}</span><span style={{ color: 'var(--texto-3)', fontSize: 12 }}>{c.grupo}</span></button>
            </li>
          ))}
          {lista.length === 0 && <li style={{ padding: 10, color: 'var(--texto-3)' }}>Sin resultados.</li>}
        </ul>
      </div>
    </div>
  );
}
