// Descarga una sola vez los datos de OpenStreetMap de Buenaventura con la API de Overpass.
// Guarda la respuesta cruda en datos-osm/, que no va al repositorio. Después se convierte con
// `node scripts/osm-convertir.mjs`. Datos © colaboradores de OpenStreetMap, licencia ODbL.
import { mkdirSync, writeFileSync } from 'node:fs';
import { RECUADRO } from './osm-recuadro.mjs';

const CALLES = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|road|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';

function consulta() {
  const b = `${RECUADRO.sur},${RECUADRO.oeste},${RECUADRO.norte},${RECUADRO.este}`;
  return `[out:json][timeout:120];
(
  way["highway"~"^(${CALLES})$"](${b});
  way["natural"="coastline"](${b});
  way["natural"="water"](${b});
  way["natural"="wetland"]["wetland"="mangrove"](${b});
);
out body;
>;
out skel qt;
(
  nwr["name"]["amenity"~"^(university|college|hospital|bus_station|ferry_terminal|marketplace|townhall|police|fire_station|library|clinic)$"](${b});
  nwr["name"]["tourism"~"^(attraction|museum|viewpoint)$"](${b});
  nwr["name"]["leisure"~"^(park|stadium|sports_centre)$"](${b});
  nwr["name"]["man_made"="pier"](${b});
  nwr["name"]["shop"="mall"](${b});
  nwr["name"]["aeroway"="aerodrome"](${b});
  nwr["name"]["bridge"="yes"](${b});
);
out center tags;`;
}

const respuesta = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'GestorRutas-ADA/1.0 (proyecto academico)' },
  body: 'data=' + encodeURIComponent(consulta()),
});
if (!respuesta.ok) {
  console.error('Overpass respondió', respuesta.status, (await respuesta.text()).slice(0, 300));
  process.exit(1);
}
const texto = await respuesta.text();
mkdirSync('datos-osm', { recursive: true });
writeFileSync('datos-osm/buenaventura-crudo.json', texto);
const datos = JSON.parse(texto);
const cuenta = { node: 0, way: 0, relation: 0 };
for (const e of datos.elements) cuenta[e.type]++;
console.log('Descargado:', (texto.length / 1e6).toFixed(2), 'MB', cuenta, 'base del', datos.osm3s?.timestamp_osm_base);
