import type { RedJSON } from '../core/grafo/tipos';
import { RedTransporte } from '../core/grafo/RedTransporte';
import docente from './docente-8.json';
import fase1 from './fase1-12.json';
import buenaventura from './buenaventura.json';

export type NombrePreset = 'docente' | 'fase1' | 'buenaventura';

export const PRESETS: Record<NombrePreset, RedJSON> = {
  docente: docente as RedJSON,
  fase1: fase1 as RedJSON,
  buenaventura: buenaventura as RedJSON,
};

export function cargarPreset(nombre: NombrePreset): RedTransporte {
  return RedTransporte.desdeJSON(PRESETS[nombre]);
}
