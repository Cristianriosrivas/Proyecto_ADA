import { TablaHash } from '@core/estructuras/TablaHash';
import type { RedTransporte } from '@core/grafo/RedTransporte';
import { useId, useMemo, useState } from 'react';

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Distancia de edición limitada: permite errores de tipeo en el buscador. */
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = t;
    }
  }
  return fila[b.length];
}

/** Índice de búsqueda de una red: id y nombre normalizado en la tabla hash propia. */
export function indiceBusqueda(red: RedTransporte): TablaHash<number> {
  const t = new TablaHash<number>(red.numEstaciones * 2 + 1);
  for (let i = 0; i < red.numEstaciones; i++) {
    const e = red.estacion(i);
    t.poner(normalizar(e.id), i);
    t.poner(normalizar(e.nombre), i);
  }
  return t;
}

/** Primero busca exacto en la tabla hash, O(1) esperado. Si falla, hace coincidencia aproximada. */
export function buscarEstacion(red: RedTransporte, indice: TablaHash<number>, texto: string, maximo = 7): number[] {
  const q = normalizar(texto);
  if (q === '') return [];
  const r: number[] = [];
  const exacto = indice.obtener(q);
  if (exacto !== undefined) r.push(exacto);
  const candidatos: { i: number; p: number }[] = [];
  const limite = Math.min(red.numEstaciones, 800);
  for (let i = 0; i < limite; i++) {
    if (i === exacto) continue;
    const nombre = normalizar(red.estacion(i).nombre);
    if (nombre.includes(q)) candidatos.push({ i, p: nombre.indexOf(q) * 0.01 });
    else if (q.length >= 3) {
      const d = distancia(q, nombre.slice(0, q.length + 2));
      if (d <= Math.max(1, Math.floor(q.length / 3))) candidatos.push({ i, p: d + 1 });
    }
  }
  candidatos.sort((a, b) => a.p - b.p);
  for (const c of candidatos) if (r.length < maximo) r.push(c.i);
  return r;
}

export function BuscadorEstacion({ red, etiqueta, valor, alElegir }: { red: RedTransporte; etiqueta: string; valor: number; alElegir: (i: number) => void }) {
  const id = useId();
  const [texto, setTexto] = useState<string | null>(null);
  const indice = useMemo(() => indiceBusqueda(red), [red]);
  const opciones = useMemo(() => (texto === null ? [] : buscarEstacion(red, indice, texto)), [red, indice, texto]);
  const nombre = valor >= 0 && valor < red.numEstaciones ? red.estacion(valor).nombre : '';
  return (
    <label className="campo" htmlFor={id} style={{ position: 'relative', minWidth: 170 }}>
      {etiqueta}
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={texto ?? nombre}
        onFocus={() => setTexto('')}
        onBlur={() => setTimeout(() => setTexto(null), 150)}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && opciones.length > 0) {
            alElegir(opciones[0]);
            setTexto(null);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Escribe una estación"
      />
      {opciones.length > 0 && (
        <span className="panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, padding: 4, boxShadow: 'var(--sombra)' }}>
          {opciones.map((i) => (
            <button
              key={i}
              className="boton"
              style={{ width: '100%', justifyContent: 'flex-start', border: 0, background: 'none' }}
              onMouseDown={(e) => {
                e.preventDefault();
                alElegir(i);
                setTexto(null);
              }}
            >
              {red.estacion(i).nombre}
            </button>
          ))}
        </span>
      )}
    </label>
  );
}
