/** Métrica de costo activa. */
export type Metrica = 'km' | 'min';

/** Una estación es un nodo de G = (V, E). Las coordenadas están en km. */
export interface Estacion {
  id: string;
  nombre: string;
  x: number;
  y: number;
  /** Línea o zona, solo para colorear el mapa. */
  linea?: string;
}

/** Una vía es una arista de G, con sus dos pesos. */
export interface Via {
  origen: number;
  destino: number;
  distanciaKm: number;
  tiempoMin: number;
  /** Arco u → v, y en redes no dirigidas también el arco v → u. */
  arco: number;
  arcoInverso: number;
}

/** Forma JSON de una red: es lo que importa y exporta el editor. */
export interface RedJSON {
  nombre: string;
  descripcion?: string;
  dirigida: boolean;
  estaciones: { id: string; nombre?: string; x: number; y: number; linea?: string }[];
  vias: { desde: string; hasta: string; distanciaKm: number; tiempoMin: number }[];
}
