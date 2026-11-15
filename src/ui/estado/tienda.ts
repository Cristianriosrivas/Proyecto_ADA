import type { RedTransporte } from '@core/grafo/RedTransporte';
import type { Metrica } from '@core/grafo/tipos';
import type { NombreAlgoritmo } from '@core/instrumentacion/tipos';
import { create } from 'zustand';
import { entradaCatalogo } from '../datos/catalogo';

export type Vista = 'inicio' | 'planificador' | 'visualizador' | 'escritorio' | 'explorador' | 'duelo' | 'trafico' | 'laboratorio' | 'teoria' | 'editor';
export type Tema = 'oscuro' | 'claro';
/** Fondo del mapa en las redes con coordenadas reales: esquema, calles guardadas o mapa real. */
export type FondoMapa = 'esquema' | 'calles' | 'real';

export interface Aviso {
  id: number;
  texto: string;
  tipo: 'info' | 'ok' | 'mal';
}

interface Estado {
  vista: Vista;
  tema: Tema;
  fondo: FondoMapa;
  redId: string;
  red: RedTransporte;
  /** Cambia cada vez que se reemplaza la red, para que las vistas reinicien sus resultados. */
  versionRed: number;
  metrica: Metrica;
  origen: number;
  destino: number;
  algoritmo: NombreAlgoritmo;
  avisos: Aviso[];
  sustentacion: boolean;
  paleta: boolean;
  irA: (v: Vista) => void;
  alternarTema: () => void;
  elegirFondo: (f: FondoMapa) => void;
  elegirRed: (id: string) => void;
  usarRed: (red: RedTransporte, id?: string) => void;
  elegirMetrica: (m: Metrica) => void;
  elegirOrigen: (i: number) => void;
  elegirDestino: (i: number) => void;
  elegirAlgoritmo: (a: NombreAlgoritmo) => void;
  avisar: (texto: string, tipo?: Aviso['tipo']) => void;
  abrirSustentacion: (v: boolean) => void;
  abrirPaleta: (v: boolean) => void;
}

const inicial = entradaCatalogo('docente').crear();
let contador = 0;

function temaGuardado(): Tema {
  try {
    return localStorage.getItem('gestor-tema') === 'claro' ? 'claro' : 'oscuro';
  } catch {
    return 'oscuro';
  }
}

/** Por defecto, las calles guardadas: funcionan sin internet. El mapa real se elige a mano. */
function fondoGuardado(): FondoMapa {
  try {
    const f = localStorage.getItem('gestor-fondo');
    return f === 'esquema' || f === 'real' ? f : 'calles';
  } catch {
    return 'calles';
  }
}

/** Origen y destino por defecto: los extremos de la red, para que el primer cálculo diga algo. */
function extremos(red: RedTransporte): { origen: number; destino: number } {
  return { origen: 0, destino: Math.max(red.numEstaciones - 1, 0) };
}

export const useTienda = create<Estado>((set, get) => ({
  vista: 'inicio',
  tema: temaGuardado(),
  fondo: fondoGuardado(),
  redId: 'docente',
  red: inicial,
  versionRed: 1,
  metrica: 'km',
  ...extremos(inicial),
  algoritmo: 'dijkstra',
  avisos: [],
  sustentacion: false,
  paleta: false,
  irA: (vista) => set({ vista }),
  alternarTema: () => {
    const tema: Tema = get().tema === 'oscuro' ? 'claro' : 'oscuro';
    try {
      localStorage.setItem('gestor-tema', tema);
    } catch {
      /* sin almacenamiento: el tema dura hasta recargar */
    }
    set({ tema });
  },
  elegirFondo: (fondo) => {
    try {
      localStorage.setItem('gestor-fondo', fondo);
    } catch {
      /* sin almacenamiento: la elección dura hasta recargar */
    }
    set({ fondo });
  },
  elegirRed: (id) => {
    const red = entradaCatalogo(id).crear();
    set((e) => ({ redId: id, red, versionRed: e.versionRed + 1, ...extremos(red) }));
  },
  usarRed: (red, id = 'editada') => set((e) => ({ redId: id, red, versionRed: e.versionRed + 1, ...extremos(red) })),
  elegirMetrica: (metrica) => set({ metrica }),
  elegirOrigen: (origen) => set({ origen }),
  elegirDestino: (destino) => set({ destino }),
  elegirAlgoritmo: (algoritmo) => set({ algoritmo }),
  avisar: (texto, tipo = 'info') => {
    const id = ++contador;
    set((e) => ({ avisos: [...e.avisos, { id, texto, tipo }] }));
    setTimeout(() => set((e) => ({ avisos: e.avisos.filter((a) => a.id !== id) })), 3800);
  },
  abrirSustentacion: (sustentacion) => set({ sustentacion }),
  abrirPaleta: (paleta) => set({ paleta }),
}));
