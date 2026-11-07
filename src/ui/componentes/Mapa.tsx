import { KDTree } from '@core/estructuras/KDTree';
import type { RedTransporte } from '@core/grafo/RedTransporte';
import { ESTADO } from '@core/instrumentacion/tipos';
import { Maximize, Minus, Plus } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as PE, type WheelEvent as WE } from 'react';

export interface Region {
  estados: Uint8Array;
  color: string;
}

export interface PropsMapa {
  red: RedTransporte;
  estados?: Uint8Array;
  ruta?: ArrayLike<number>;
  rutaSecundaria?: ArrayLike<number>;
  origen?: number;
  destino?: number;
  nodoActual?: number;
  arcoActual?: number;
  /** Congestión por vía: colorea el mapa de calor. */
  calor?: Float64Array;
  /** Estaciones y vías críticas o cerradas: marcas por índice. */
  criticas?: Uint8Array;
  puentes?: Uint8Array;
  estacionesCerradas?: Uint8Array;
  viasCerradas?: Uint8Array;
  /** Halos de región explorada, para el duelo. */
  regiones?: Region[];
  vehiculos?: boolean;
  etiquetas?: 'auto' | 'todas' | 'ninguna';
  minimapa?: boolean;
  alClicEstacion?: (i: number) => void;
  alClicVia?: (via: number) => void;
  alClicVacio?: (x: number, y: number) => void;
  alMover?: (i: number, x: number, y: number) => void;
  /** Texto para lectores de pantalla. */
  etiquetaAria?: string;
}

interface Vista {
  k: number;
  tx: number;
  ty: number;
}

const LIMITE_SVG = 300;

function leerToken(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

function colorCalor(c: number): string {
  // Secuencial: verde pálido a rojo, con la congestión acotada a [0, 2]
  const t = Math.max(0, Math.min(1, c / 1.6));
  const h = 150 - 150 * t;
  return `hsl(${h} 85% ${52 - t * 8}%)`;
}

/** Vía con esquina a 45°, como un mapa de metro: tramo recto más tramo diagonal con curva. */
function trazoMetro(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 2 || ay < 2 || Math.abs(ax - ay) < 2) return `M${x1} ${y1}L${x2} ${y2}`;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  let cx: number;
  let cy: number;
  if (ax > ay) {
    cx = x1 + sx * (ax - ay);
    cy = y1;
  } else {
    cx = x1;
    cy = y1 + sy * (ay - ax);
  }
  const r = Math.min(10, Math.hypot(cx - x1, cy - y1) / 2, Math.hypot(x2 - cx, y2 - cy) / 2);
  const l1 = Math.hypot(cx - x1, cy - y1) || 1;
  const l2 = Math.hypot(x2 - cx, y2 - cy) || 1;
  const ax1 = cx - ((cx - x1) / l1) * r;
  const ay1 = cy - ((cy - y1) / l1) * r;
  const bx1 = cx + ((x2 - cx) / l2) * r;
  const by1 = cy + ((y2 - cy) / l2) * r;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${ax1.toFixed(1)} ${ay1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx1.toFixed(1)} ${by1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function rutaComoPath(ruta: ArrayLike<number>, X: (i: number) => number, Y: (i: number) => number, esquema: boolean): string {
  let d = '';
  for (let i = 1; i < ruta.length; i++) {
    const seg = esquema ? trazoMetro(X(ruta[i - 1]), Y(ruta[i - 1]), X(ruta[i]), Y(ruta[i])) : `M${X(ruta[i - 1])} ${Y(ruta[i - 1])}L${X(ruta[i])} ${Y(ruta[i])}`;
    d += i === 1 ? seg : seg.replace(/^M[^L]*/, '');
  }
  return d;
}

/** Forma del nodo según su estado: color y forma, para no depender solo del color. */
function FormaNodo({ estado, x, y, r, origen, destino, critica, cerrada }: { estado: number; x: number; y: number; r: number; origen: boolean; destino: boolean; critica: boolean; cerrada: boolean }) {
  if (cerrada) {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="var(--fondo)" stroke="var(--critico)" strokeWidth={2.5} />
        <path d={`M${x - r * 0.6} ${y - r * 0.6}L${x + r * 0.6} ${y + r * 0.6}M${x + r * 0.6} ${y - r * 0.6}L${x - r * 0.6} ${y + r * 0.6}`} stroke="var(--critico)" strokeWidth={2.2} />
      </g>
    );
  }
  if (origen) return <path d={`M${x} ${y - r * 1.25}L${x + r * 1.15} ${y + r * 0.85}L${x - r * 1.15} ${y + r * 0.85}Z`} fill="var(--origen)" stroke="var(--halo)" strokeWidth={2} />;
  if (destino) {
    const R = r * 1.3;
    const q = R * 0.45;
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? R : q;
      d += `${i === 0 ? 'M' : 'L'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
    }
    return <path d={`${d}Z`} fill="var(--destino)" stroke="var(--halo)" strokeWidth={1.8} />;
  }
  if (estado === ESTADO.RUTA) return <circle cx={x} cy={y} r={r * 1.05} fill="var(--ruta)" stroke="var(--texto)" strokeWidth={2.2} />;
  if (estado === ESTADO.CERRADO) return <rect x={x - r * 0.88} y={y - r * 0.88} width={r * 1.76} height={r * 1.76} rx={2} fill="var(--cerrado)" stroke="var(--halo)" strokeWidth={1.8} />;
  if (estado === ESTADO.FRONTERA) return <rect x={x - r * 0.82} y={y - r * 0.82} width={r * 1.64} height={r * 1.64} fill="var(--frontera)" stroke="var(--halo)" strokeWidth={1.8} transform={`rotate(45 ${x} ${y})`} />;
  return <circle cx={x} cy={y} r={r} fill="var(--fondo-2)" stroke={critica ? 'var(--critico)' : 'var(--no-visitado)'} strokeWidth={critica ? 3.2 : 2.4} />;
}

function Leyenda() {
  return (
    <div className="leyenda" aria-label="Leyenda del mapa">
      <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="var(--no-visitado)" strokeWidth="2" /></svg>No visitada</span>
      <span><svg width="14" height="14"><rect x="3" y="3" width="8" height="8" fill="var(--frontera)" transform="rotate(45 7 7)" /></svg>Frontera</span>
      <span><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" rx="1" fill="var(--cerrado)" /></svg>Cerrada</span>
      <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--ruta)" /></svg>Ruta</span>
      <span><svg width="14" height="14"><path d="M7 1L13 12H1Z" fill="var(--origen)" /></svg>Origen</span>
      <span><svg width="14" height="14"><path d="M7 1l1.8 4 4.2.4-3.2 2.8 1 4.2L7 10.2 3.2 12.4l1-4.2L1 5.4 5.2 5Z" fill="var(--destino)" /></svg>Destino</span>
    </div>
  );
}

export const LeyendaMapa = memo(Leyenda);

export function Mapa(p: PropsMapa) {
  const { red } = p;
  const caja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 640, h: 420 });
  const [vista, setVista] = useState<Vista>({ k: 1, tx: 0, ty: 0 });
  const n = red.numEstaciones;

  const limites = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const xs = red.coordenadasX();
    const ys = red.coordenadasY();
    for (let i = 0; i < n; i++) {
      if (xs[i] < minX) minX = xs[i];
      if (xs[i] > maxX) maxX = xs[i];
      if (ys[i] < minY) minY = ys[i];
      if (ys[i] > maxY) maxY = ys[i];
    }
    if (n === 0) return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    return { minX, minY, maxX, maxY };
  }, [red, n]);

  const encuadre = useCallback((): Vista => {
    const m = 42;
    const w = Math.max(limites.maxX - limites.minX, 1);
    const h = Math.max(limites.maxY - limites.minY, 1);
    const k = Math.min((tam.w - 2 * m) / w, (tam.h - 2 * m) / h);
    return { k, tx: (tam.w - k * (limites.minX + limites.maxX)) / 2, ty: (tam.h + k * (limites.minY + limites.maxY)) / 2 };
  }, [limites, tam]);

  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return undefined;
    const medir = () => setTam({ w: el.clientWidth || 640, h: el.clientHeight || 420 });
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => setVista(encuadre()), [encuadre]);

  const X = useCallback((i: number) => vista.tx + vista.k * red.estacion(i).x, [vista, red]);
  const Y = useCallback((i: number) => vista.ty - vista.k * red.estacion(i).y, [vista, red]);
  const aMundo = useCallback((sx: number, sy: number) => ({ x: (sx - vista.tx) / vista.k, y: (vista.ty - sy) / vista.k }), [vista]);

  const arbol = useMemo(() => new KDTree(red.coordenadasX(), red.coordenadasY()), [red]);

  const zoom = useCallback(
    (f: number, cx: number, cy: number) =>
      setVista((v) => {
        const k = Math.max(0.5, Math.min(v.k * f, 4000));
        const g = k / v.k;
        return { k, tx: cx - (cx - v.tx) * g, ty: cy - (cy - v.ty) * g };
      }),
    [],
  );

  const alRueda = (e: WE) => {
    const r = caja.current?.getBoundingClientRect();
    if (!r) return;
    zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top);
  };

  const arrastre = useRef<{ x: number; y: number; movido: boolean; nodo: number } | null>(null);
  const alBajar = (e: PE) => {
    const r = caja.current?.getBoundingClientRect();
    if (!r) return;
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    let nodo = -1;
    if (p.alMover && n > 0) {
      const w = aMundo(sx, sy);
      const i = arbol.masCercano(w.x, w.y);
      if (i >= 0 && Math.hypot(X(i) - sx, Y(i) - sy) < 16) nodo = i;
    }
    arrastre.current = { x: e.clientX, y: e.clientY, movido: false, nodo };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const alMoverPuntero = (e: PE) => {
    const a = arrastre.current;
    if (!a) return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!a.movido && Math.hypot(dx, dy) < 4) return;
    a.movido = true;
    if (a.nodo >= 0 && p.alMover) {
      const r = caja.current?.getBoundingClientRect();
      if (r) {
        const w = aMundo(e.clientX - r.left, e.clientY - r.top);
        p.alMover(a.nodo, w.x, w.y);
      }
      return;
    }
    a.x = e.clientX;
    a.y = e.clientY;
    setVista((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  };
  const alSoltar = (e: PE) => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || a.movido) return;
    const r = caja.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const w = aMundo(sx, sy);
    // La estación más cercana al clic sale del árbol k-d propio, en O(lg n) esperado
    const i = arbol.masCercano(w.x, w.y);
    if (i >= 0 && Math.hypot(X(i) - sx, Y(i) - sy) < 18) {
      p.alClicEstacion?.(i);
      return;
    }
    if (p.alClicVia) {
      const via = viaCercana(red, w.x, w.y, 12 / vista.k);
      if (via >= 0) {
        p.alClicVia(via);
        return;
      }
    }
    p.alClicVacio?.(w.x, w.y);
  };

  const propsLienzo = { onWheel: alRueda, onPointerDown: alBajar, onPointerMove: alMoverPuntero, onPointerUp: alSoltar };

  // Escala gráfica: el mayor de 1-2-5 × 10^k que quepa en 120 px
  const escalaKm = useMemo(() => {
    const objetivo = 120 / vista.k;
    const base = 10 ** Math.floor(Math.log10(objetivo || 1));
    for (const f of [5, 2, 1]) if (f * base <= objetivo) return f * base;
    return base;
  }, [vista.k]);

  return (
    <div ref={caja} className="mapa" role="application" aria-label={p.etiquetaAria ?? `Mapa de ${red.nombre}`}>
      {n <= LIMITE_SVG ? <CapaSvg {...p} tam={tam} vista={vista} X={X} Y={Y} lienzo={propsLienzo} escalaKm={escalaKm} /> : <CapaCanvas {...p} tam={tam} vista={vista} X={X} Y={Y} lienzo={propsLienzo} />}
      <div className="controles no-imprimir">
        <button className="boton icono" aria-label="Acercar" onClick={() => zoom(1.3, tam.w / 2, tam.h / 2)}><Plus size={15} /></button>
        <button className="boton icono" aria-label="Alejar" onClick={() => zoom(1 / 1.3, tam.w / 2, tam.h / 2)}><Minus size={15} /></button>
        <button className="boton icono" aria-label="Encuadrar la red" onClick={() => setVista(encuadre())}><Maximize size={15} /></button>
      </div>
      <div className="escala" aria-hidden="true"><i style={{ width: escalaKm * vista.k }} />{escalaKm} km</div>
      {p.minimapa !== false && tam.w > 420 && <Minimapa red={red} vista={vista} tam={tam} limites={limites} ruta={p.ruta} />}
    </div>
  );
}

function viaCercana(red: RedTransporte, x: number, y: number, tolerancia: number): number {
  let mejor = -1;
  let dm = tolerancia;
  for (let i = 0; i < red.numVias; i++) {
    const v = red.via(i);
    const a = red.estacion(v.origen);
    const b = red.estacion(v.destino);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
    const d = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
    if (d < dm) {
      dm = d;
      mejor = i;
    }
  }
  return mejor;
}

interface PropsCapa extends PropsMapa {
  tam: { w: number; h: number };
  vista: Vista;
  X: (i: number) => number;
  Y: (i: number) => number;
  lienzo: { onWheel: (e: WE) => void; onPointerDown: (e: PE) => void; onPointerMove: (e: PE) => void; onPointerUp: (e: PE) => void };
}

/** Cuadrícula sutil en km. Los pasos se adaptan al zoom. */
function Cuadricula({ tam, vista, paso }: { tam: { w: number; h: number }; vista: Vista; paso: number }) {
  const lineas = [];
  const p = paso * vista.k;
  if (p > 12) {
    const x0 = ((vista.tx % p) + p) % p;
    const y0 = ((vista.ty % p) + p) % p;
    for (let x = x0; x < tam.w; x += p) lineas.push(<line key={`x${x}`} className="cuadricula" x1={x} x2={x} y1={0} y2={tam.h} />);
    for (let y = y0; y < tam.h; y += p) lineas.push(<line key={`y${y}`} className="cuadricula" x1={0} x2={tam.w} y1={y} y2={y} />);
  }
  return <g aria-hidden="true">{lineas}</g>;
}

function CapaSvg(p: PropsCapa & { escalaKm: number }) {
  const { red, tam, vista, X, Y, estados, ruta, rutaSecundaria, origen, destino, nodoActual, arcoActual, calor, criticas, puentes, estacionesCerradas, viasCerradas, regiones, vehiculos, etiquetas = 'auto', lienzo, escalaKm } = p;
  const n = red.numEstaciones;
  const grueso = n <= 60 ? 5 : n <= 150 ? 3 : 2;
  const r = n <= 12 ? 11 : n <= 60 ? 8 : n <= 150 ? 5 : 3.6;
  const esquema = n <= 150;
  const mostrar = etiquetas === 'todas' || (etiquetas === 'auto' && (n <= 60 || vista.k > 34));
  const pathVia = useMemo(() => {
    const r0: string[] = new Array(red.numVias);
    for (let i = 0; i < red.numVias; i++) {
      const v = red.via(i);
      r0[i] = esquema ? trazoMetro(X(v.origen), Y(v.origen), X(v.destino), Y(v.destino)) : `M${X(v.origen).toFixed(1)} ${Y(v.origen).toFixed(1)}L${X(v.destino).toFixed(1)} ${Y(v.destino).toFixed(1)}`;
    }
    return r0;
  }, [red, X, Y, esquema]);

  const rotulos = useMemo(() => (mostrar ? colocarEtiquetas(red, X, Y, r, origen, destino) : []), [mostrar, red, X, Y, r, origen, destino]);

  const dRuta = ruta && ruta.length > 1 ? rutaComoPath(ruta, X, Y, esquema) : '';
  const dSec = rutaSecundaria && rutaSecundaria.length > 1 ? rutaComoPath(rutaSecundaria, X, Y, esquema) : '';
  const claveRuta = ruta ? Array.from(ruta).join('-') : '';

  const viaActual = arcoActual !== undefined && arcoActual >= 0 ? red.viaDeArco(arcoActual) : -1;

  return (
    <svg className="lienzo" viewBox={`0 0 ${tam.w} ${tam.h}`} {...lienzo}>
      <Cuadricula tam={tam} vista={vista} paso={escalaKm} />
      {regiones?.map((reg, ri) => (
        <g key={ri} opacity={0.22} aria-hidden="true">
          {Array.from(reg.estados, (e, i) => (e === ESTADO.CERRADO || e === ESTADO.RUTA ? <circle key={i} cx={X(i)} cy={Y(i)} r={Math.max(r * 3.2, 12)} fill={reg.color} /> : null))}
        </g>
      ))}
      <g>
        {pathVia.map((d, i) => {
          const c = viasCerradas?.[i] === 1;
          return (
            <path
              key={i}
              d={d}
              className="via"
              style={{
                strokeWidth: puentes?.[i] === 1 ? grueso + 2 : grueso,
                stroke: c ? 'var(--critico)' : calor ? colorCalor(calor[i]) : puentes?.[i] === 1 ? 'var(--critico)' : undefined,
                opacity: calor ? 0.95 : undefined,
                strokeDasharray: c ? '4 7' : undefined,
              }}
            />
          );
        })}
      </g>
      {viaActual >= 0 && <path d={pathVia[viaActual]} className="via-activa" style={{ strokeWidth: grueso + 2 }} />}
      {dSec && <path d={dSec} fill="none" stroke="var(--destino)" strokeWidth={grueso + 1} strokeLinecap="round" strokeDasharray="2 8" />}
      {dRuta && <path key={claveRuta} d={dRuta} pathLength={1} className="via-ruta" style={{ strokeWidth: grueso + 2 }} />}
      {vehiculos && dRuta && <Vehiculos d={dRuta} clave={claveRuta} />}
      <g>
        {Array.from({ length: n }, (_, i) => {
          const x = X(i);
          const y = Y(i);
          return (
            <g key={i} className="nodo">
              <FormaNodo estado={estados ? estados[i] : 0} x={x} y={y} r={r} origen={i === origen} destino={i === destino} critica={criticas?.[i] === 1} cerrada={estacionesCerradas?.[i] === 1} />
              {i === nodoActual && <circle className="pulso" cx={x} cy={y} r={r + 3} style={{ transformOrigin: `${x}px ${y}px` }} />}
            </g>
          );
        })}
      </g>
      {mostrar && (
        <g>
          {rotulos.map((e) => (
            <text key={e.i} className="etq" x={e.x} y={e.y} textAnchor={e.ancla}>
              {red.estacion(e.i).nombre}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

interface Rotulo {
  i: number;
  x: number;
  y: number;
  ancla: 'start' | 'end';
}

/**
 * Coloca los nombres sin que se pisen: prueba cuatro posiciones por estación y omite la
 * etiqueta si ninguna cabe. Origen y destino van primero para que nunca se pierdan.
 */
function colocarEtiquetas(red: RedTransporte, X: (i: number) => number, Y: (i: number) => number, r: number, origen?: number, destino?: number): Rotulo[] {
  const n = red.numEstaciones;
  const ocupadas: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const res: Rotulo[] = [];
  const orden: number[] = [];
  if (origen !== undefined && origen >= 0 && origen < n) orden.push(origen);
  if (destino !== undefined && destino >= 0 && destino < n && destino !== origen) orden.push(destino);
  for (let i = 0; i < n; i++) if (i !== origen && i !== destino) orden.push(i);
  for (const i of orden) {
    const w = red.estacion(i).nombre.length * 6.3 + 4;
    const x = X(i);
    const y = Y(i);
    const d = r + 3;
    const opciones: Rotulo[] = [
      { i, x: x + d, y: y - d + 2, ancla: 'start' },
      { i, x: x + d, y: y + d + 9, ancla: 'start' },
      { i, x: x - d, y: y - d + 2, ancla: 'end' },
      { i, x: x - d, y: y + d + 9, ancla: 'end' },
    ];
    for (const o of opciones) {
      const x0 = o.ancla === 'start' ? o.x : o.x - w;
      const c = { x0, y0: o.y - 11, x1: x0 + w, y1: o.y + 3 };
      if (!ocupadas.some((b) => c.x0 < b.x1 && c.x1 > b.x0 && c.y0 < b.y1 && c.y1 > b.y0)) {
        ocupadas.push(c);
        res.push(o);
        break;
      }
    }
  }
  return res;
}

/** Vehículos que recorren la ruta, escalonados para que se vea como servicio. */
function Vehiculos({ d, clave }: { d: string; clave: string }) {
  return (
    <g key={clave} aria-hidden="true">
      {[0, 1.2, 2.4].map((inicio) => (
        <rect key={inicio} x={-7} y={-4} width={14} height={8} rx={2.5} fill="var(--texto)" stroke="var(--ruta)" strokeWidth={1.5}>
          <animateMotion dur="3.6s" begin={`-${inicio}s`} repeatCount="indefinite" rotate="auto" path={d} />
        </rect>
      ))}
    </g>
  );
}

/** Lienzo para redes grandes: dibujar miles de nodos en SVG congelaría la interfaz. */
function CapaCanvas(p: PropsCapa) {
  const { red, tam, vista, X, Y, estados, ruta, origen, destino, calor, regiones, lienzo } = p;
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = tam.w * dpr;
    c.height = tam.h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, tam.w, tam.h);
    const n = red.numEstaciones;
    const col = {
      via: leerToken('--no-visitado'),
      ruta: leerToken('--ruta'),
      fr: leerToken('--frontera'),
      ce: leerToken('--cerrado'),
      or: leerToken('--origen'),
      de: leerToken('--destino'),
    };
    regiones?.forEach((reg) => {
      g.globalAlpha = 0.16;
      g.fillStyle = reg.color;
      for (let i = 0; i < n; i++) {
        if (reg.estados[i] === ESTADO.CERRADO || reg.estados[i] === ESTADO.RUTA) {
          g.beginPath();
          g.arc(X(i), Y(i), 8, 0, 6.3);
          g.fill();
        }
      }
    });
    g.globalAlpha = 0.5;
    g.lineWidth = 1;
    g.strokeStyle = col.via;
    if (calor) {
      g.globalAlpha = 0.9;
      for (let i = 0; i < red.numVias; i++) {
        const v = red.via(i);
        g.strokeStyle = colorCalor(calor[i]);
        g.beginPath();
        g.moveTo(X(v.origen), Y(v.origen));
        g.lineTo(X(v.destino), Y(v.destino));
        g.stroke();
      }
    } else {
      g.beginPath();
      for (let i = 0; i < red.numVias; i++) {
        const v = red.via(i);
        g.moveTo(X(v.origen), Y(v.origen));
        g.lineTo(X(v.destino), Y(v.destino));
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < n; i++) {
      const e = estados ? estados[i] : 0;
      g.fillStyle = e === ESTADO.FRONTERA ? col.fr : e === ESTADO.CERRADO ? col.ce : e === ESTADO.RUTA ? col.ruta : col.via;
      g.fillRect(X(i) - 1.6, Y(i) - 1.6, 3.2, 3.2);
    }
    if (ruta && ruta.length > 1) {
      g.strokeStyle = col.ruta;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(X(ruta[0]), Y(ruta[0]));
      for (let i = 1; i < ruta.length; i++) g.lineTo(X(ruta[i]), Y(ruta[i]));
      g.stroke();
    }
    if (origen !== undefined && origen >= 0 && origen < n) {
      g.fillStyle = col.or;
      g.beginPath();
      g.arc(X(origen), Y(origen), 6, 0, 6.3);
      g.fill();
    }
    if (destino !== undefined && destino >= 0 && destino < n) {
      g.fillStyle = col.de;
      g.beginPath();
      g.arc(X(destino), Y(destino), 6, 0, 6.3);
      g.fill();
    }
  }, [red, tam, vista, X, Y, estados, ruta, origen, destino, calor, regiones]);

  return <canvas ref={ref} className="lienzo" {...lienzo} />;
}

/** Minimapa: la red completa y el rectángulo de lo que se ve. */
function Minimapa({ red, vista, tam, limites, ruta }: { red: RedTransporte; vista: Vista; tam: { w: number; h: number }; limites: { minX: number; minY: number; maxX: number; maxY: number }; ruta?: ArrayLike<number> }) {
  const W = 112;
  const H = 76;
  const m = 6;
  const w = Math.max(limites.maxX - limites.minX, 1);
  const h = Math.max(limites.maxY - limites.minY, 1);
  const k = Math.min((W - 2 * m) / w, (H - 2 * m) / h);
  const mx = (x: number) => m + (x - limites.minX) * k;
  const my = (y: number) => H - m - (y - limites.minY) * k;
  const puntos = useMemo(() => {
    const paso = Math.ceil(red.numEstaciones / 220);
    const r = [];
    for (let i = 0; i < red.numEstaciones; i += paso) {
      const e = red.estacion(i);
      r.push(<circle key={i} cx={mx(e.x)} cy={my(e.y)} r={1.1} fill="var(--no-visitado)" />);
    }
    return r;
    // mx y my se derivan de los límites y la red, que son las dependencias reales
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [red, limites]);
  const x0 = (0 - vista.tx) / vista.k;
  const x1 = (tam.w - vista.tx) / vista.k;
  const y1 = (vista.ty - 0) / vista.k;
  const y0 = (vista.ty - tam.h) / vista.k;
  return (
    <svg className="minimapa" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {puntos}
      {ruta && ruta.length > 1 && <polyline fill="none" stroke="var(--ruta)" strokeWidth={1.4} points={Array.from(ruta, (i) => `${mx(red.estacion(i).x)},${my(red.estacion(i).y)}`).join(' ')} />}
      <rect x={mx(x0)} y={my(y1)} width={Math.max((x1 - x0) * k, 2)} height={Math.max((y1 - y0) * k, 2)} fill="none" stroke="var(--frontera)" strokeWidth={1} />
    </svg>
  );
}
