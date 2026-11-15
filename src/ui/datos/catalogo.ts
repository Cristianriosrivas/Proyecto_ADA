import { generarRed, type TipoRed } from '@core/generadores/redes';
import type { RedTransporte } from '@core/grafo/RedTransporte';
import { cargarRedOSM } from '@redes/osm';
import { cargarPreset, type NombrePreset } from '@redes/presets';

export interface EntradaCatalogo {
  id: string;
  nombre: string;
  crear: () => RedTransporte;
}

const preset = (id: NombrePreset, nombre: string): EntradaCatalogo => ({ id, nombre, crear: () => cargarPreset(id) });
const gen = (tipo: TipoRed, n: number, nombre: string, semilla = 2026): EntradaCatalogo => ({ id: `${tipo}-${n}`, nombre, crear: () => generarRed(tipo, n, semilla) });

/** Redes del selector superior. Las generadas usan semilla fija, así son siempre las mismas. */
export const CATALOGO: EntradaCatalogo[] = [
  preset('docente', 'Red Docente (8)'),
  preset('fase1', 'Red Fase 1 (12)'),
  preset('buenaventura', 'Red Buenaventura (34)'),
  // Calles reales de OpenStreetMap: el mapa real se elige con el botón de capas del mapa
  { id: 'buenaventura-osm', nombre: 'Buenaventura, calles reales (4429)', crear: cargarRedOSM },
  gen('geometrica', 50, 'Geométrica N = 50'),
  gen('geometrica', 100, 'Geométrica N = 100'),
  gen('geometrica', 250, 'Geométrica N = 250'),
  gen('cuadricula', 225, 'Cuadrícula N = 225'),
  gen('metro', 120, 'Metro N = 120'),
  gen('geometrica', 1000, 'Geométrica N = 1000 (lienzo)'),
  gen('geometrica', 5000, 'Geométrica N = 5000 (lienzo)'),
];

export function entradaCatalogo(id: string): EntradaCatalogo {
  return CATALOGO.find((c) => c.id === id) ?? CATALOGO[0];
}
