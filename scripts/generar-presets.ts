// Genera los presets fase1-12 y buenaventura. Los pesos salen de las coordenadas, con semilla fija.
import { writeFileSync } from 'node:fs';
import { mulberry32 } from '../src/core/generadores/azar';
import type { RedJSON } from '../src/core/grafo/tipos';

type Punto = [id: string, nombre: string, x: number, y: number, linea?: string];

const VELOCIDADES = [0.3, 0.4, 0.5, 0.6];

function armar(nombre: string, descripcion: string, puntos: Punto[], enlaces: [string, string][], semilla: number): RedJSON {
  const azar = mulberry32(semilla);
  const pos = new Map(puntos.map((p) => [p[0], p]));
  const vias = enlaces.map(([a, b]) => {
    const p = pos.get(a);
    const q = pos.get(b);
    if (!p || !q) throw new Error(`Enlace inválido ${a}-${b}`);
    const recta = Math.hypot(p[2] - q[2], p[3] - q[3]);
    const km = Number((recta * (1.15 + azar() * 0.45)).toFixed(3));
    const velocidad = VELOCIDADES[Math.floor(azar() * VELOCIDADES.length)];
    return { desde: a, hasta: b, distanciaKm: km, tiempoMin: Number((km / velocidad).toFixed(3)) };
  });
  return { nombre, descripcion, dirigida: false, estaciones: puntos.map(([id, n, x, y, linea]) => ({ id, nombre: n, x, y, linea })), vias };
}

const fase1 = armar(
  'Red Fase 1 (12)',
  'Red de 12 estaciones para cumplir el mínimo de 10 de la Fase 1. Datos simulados.',
  [
    ['E1', 'Portal Norte', 0.5, 7.2],
    ['E2', 'Mercado', 2.6, 7.8],
    ['E3', 'Hospital', 4.9, 7.1],
    ['E4', 'Estadio', 7.3, 7.6],
    ['E5', 'Plaza Central', 2.2, 4.8],
    ['E6', 'Biblioteca', 4.6, 4.4],
    ['E7', 'Parque', 6.9, 4.9],
    ['E8', 'Colegio', 9.1, 5.2],
    ['E9', 'Terminal', 1.4, 2.1],
    ['E10', 'Universidad', 4.1, 1.6],
    ['E11', 'Puerto', 6.7, 2.0],
    ['E12', 'Portal Sur', 9.4, 1.8],
  ],
  [
    ['E1', 'E2'], ['E2', 'E3'], ['E3', 'E4'], ['E1', 'E5'], ['E2', 'E5'], ['E3', 'E6'], ['E4', 'E7'], ['E4', 'E8'],
    ['E5', 'E6'], ['E6', 'E7'], ['E7', 'E8'], ['E5', 'E9'], ['E6', 'E10'], ['E7', 'E11'], ['E8', 'E12'], ['E9', 'E10'], ['E10', 'E11'], ['E11', 'E12'],
  ],
  12,
);

// Zona isla Cascajal al occidente, puente El Piñal y eje de la Av. Simón Bolívar hacia el oriente.
// Coordenadas aproximadas en km, solo para fines académicos. Donde no hay certeza del nombre,
// se usa un nombre genérico de sector.
const I = 'Isla Cascajal';
const C = 'Continente';
const buenaventura = armar(
  'Red Buenaventura',
  'Red simulada con fines académicos. Coordenadas aproximadas proyectadas a km.',
  [
    ['MT', 'Muelle Turístico', 0.2, 2.6, I],
    ['PC', 'Parque Central', 0.7, 2.2, I],
    ['CE', 'Centro', 1.2, 2.5, I],
    ['TM', 'Terminal Marítimo', 0.5, 3.3, I],
    ['PN', 'Pueblo Nuevo', 1.7, 1.7, I],
    ['LP', 'La Pilota', 2.0, 2.8, I],
    ['VL', 'Viento Libre', 1.1, 1.3, I],
    ['PL', 'La Playita', 2.5, 1.2, I],
    ['AL', 'Alfonso López', 2.8, 2.2, I],
    ['LL', 'Lleras', 3.0, 3.1, I],
    ['MI', 'Miramar', 3.4, 1.5, I],
    ['CA', 'Calimita', 3.7, 2.5, I],
    ['PP', 'Puente El Piñal', 4.6, 2.0, 'Conexión'],
    ['EP', 'El Piñal', 5.4, 2.3, C],
    ['BV', 'Bellavista', 5.9, 1.3, C],
    ['SB3', 'Simón Bolívar km 3', 6.6, 2.1, C],
    ['JX', 'Juan XXIII', 7.1, 3.1, C],
    ['SB4', 'Simón Bolívar km 4', 7.7, 1.8, C],
    ['AN', 'Antonio Nariño', 7.9, 0.8, C],
    ['NA', 'Nayita', 8.5, 2.9, C],
    ['SB5', 'Simón Bolívar km 5', 8.9, 1.5, C],
    ['LA', 'Las Américas', 9.4, 0.5, C],
    ['IN', 'La Independencia', 9.7, 2.6, C],
    ['TT', 'Terminal de Transporte', 10.1, 1.3, C],
    ['SB7', 'Simón Bolívar km 7', 11.0, 1.0, C],
    ['UV', 'Unión de Vivienda', 11.3, 2.2, C],
    ['SE', 'Sector Oriental', 11.8, 0.1, C],
    ['SB8', 'Simón Bolívar km 8', 12.2, 0.8, C],
    ['UN', 'Univalle Sede Pacífico', 13.2, 0.6, C],
    ['CN', 'Ciudadela Nueva', 13.0, 1.9, C],
    ['SB10', 'Simón Bolívar km 10', 14.3, 0.3, C],
    ['ZI', 'Zona Industrial', 14.7, 1.4, C],
    ['AE', 'Aeropuerto', 15.5, -0.5, C],
    ['SB12', 'Simón Bolívar km 12', 16.2, 0.2, C],
  ],
  [
    ['MT', 'PC'], ['MT', 'TM'], ['PC', 'CE'], ['TM', 'CE'], ['CE', 'LP'], ['CE', 'PN'], ['PC', 'VL'], ['VL', 'PN'], ['PN', 'PL'], ['PN', 'AL'], ['LP', 'AL'],
    ['LP', 'LL'], ['AL', 'CA'], ['LL', 'CA'], ['PL', 'MI'], ['AL', 'MI'], ['MI', 'CA'], ['CA', 'PP'], ['MI', 'PP'],
    ['PP', 'EP'], ['EP', 'BV'], ['EP', 'SB3'], ['BV', 'SB3'], ['SB3', 'JX'], ['SB3', 'SB4'], ['JX', 'SB4'], ['BV', 'AN'], ['SB4', 'AN'], ['JX', 'NA'], ['SB4', 'NA'],
    ['SB4', 'SB5'], ['AN', 'SB5'], ['NA', 'SB5'], ['AN', 'LA'], ['SB5', 'LA'], ['NA', 'IN'], ['SB5', 'IN'], ['SB5', 'TT'], ['LA', 'TT'], ['IN', 'TT'], ['IN', 'UV'],
    ['TT', 'SB7'], ['UV', 'SB7'], ['LA', 'SE'], ['SB7', 'SE'], ['SB7', 'SB8'], ['SE', 'SB8'], ['UV', 'CN'], ['SB8', 'UN'], ['SB8', 'CN'], ['CN', 'UN'],
    ['UN', 'SB10'], ['CN', 'ZI'], ['SB10', 'ZI'], ['SB10', 'AE'], ['SB10', 'SB12'], ['AE', 'SB12'], ['ZI', 'SB12'],
  ],
  2026,
);

writeFileSync('src/redes/fase1-12.json', JSON.stringify(fase1, null, 2) + '\n');
writeFileSync('src/redes/buenaventura.json', JSON.stringify(buenaventura, null, 2) + '\n');
console.log(`Fase 1: ${fase1.estaciones.length} estaciones, ${fase1.vias.length} vías`);
console.log(`Buenaventura: ${buenaventura.estaciones.length} estaciones, ${buenaventura.vias.length} vías`);
