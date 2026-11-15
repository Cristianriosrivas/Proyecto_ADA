# Manual de usuario

## Cómo abrir la aplicación

Abre `GestorRutas.html` con doble clic. No necesita internet ni servidor. Funciona en Edge, Chrome y Firefox.

También está publicada en internet: https://gestor-rutas-ada.cristian-david-rios.workers.dev. Se abre en cualquier computador o celular, sin instalar nada.

La barra superior elige la red activa y la métrica, km o minutos. La barra lateral cambia de vista. `Ctrl+K` abre la paleta de comandos, y el botón de sol o luna cambia el tema.

## Vistas

**Inicio.** Muestra el proyecto y una red que se resuelve sola. El botón **Iniciar sustentación** abre el recorrido guiado a pantalla completa. Se avanza con `→`, se retrocede con `←` y se sale con `Esc`. La primera escena trae un código QR para abrir la aplicación en el celular. La escena **Rompe la ciudad** deja cerrar calles y cruces con un clic sobre las calles reales: Dijkstra recalcula al instante, y si la ciudad queda partida, pinta cada lado de un color.

**Planificador.** Elige origen y destino con el buscador o con clic en el mapa, y el algoritmo. **Calcular ruta** dibuja la ruta animada y muestra costo, saltos, nodos expandidos, relajaciones, operaciones del heap, tiempo, complejidad y estructura. El buscador acepta errores de tipeo. En la red de calles reales, la exploración se anima sobre el mapa, la ruta se describe por las calles que recorre y **Repetir la exploración** la vuelve a mostrar.

**Calles reales y mapa real.** Elige la red **Buenaventura, calles reales** en la barra superior. El botón de capas, arriba a la izquierda del mapa, cambia el fondo:

- **Esquema:** solo la red, como un plano de metro.
- **Calles:** calles, costa, agua y manglar guardados en el proyecto. Funciona sin internet y es el fondo por defecto.
- **Mapa real:** el mapa de OpenStreetMap detrás de la red, como un mapa de internet. Necesita conexión; si no la hay, la app avisa y vuelve sola a las calles guardadas.

La elección se recuerda al volver a abrir la aplicación.

**Visualizador.** Anima la exploración paso a paso. `Espacio` reproduce o pausa, y `←` y `→` avanzan de a un paso. La línea de tiempo se puede arrastrar. A la derecha están el pseudocódigo con la línea actual y el inspector: la cola como vagones, la pila como torre, el heap como árbol y arreglo, y las tablas d, π, color, g, h y f. Abajo está la narración de cada paso.

**Prueba de Escritorio.** Ejecuta los 4 casos del docente sobre la red de 8 estaciones y marca "Coincide" en cada fila. Muestra la traza por iteración. Exporta a CSV e imprime.

**Explorador DFS.** Halla todas las rutas simples entre dos estaciones, con límite y poda por costo, ordenadas por costo. Muestra la conectividad, las componentes y las estaciones y vías críticas.

**Duelo.** Corre Dijkstra y A* sobre la misma red, en paralelo. Elige la heurística, ajusta el peso w y superpone las regiones exploradas. El validador avisa si la heurística deja de ser admisible o consistente.

**Tráfico.** El reloj simula 24 horas, con horas pico de 6 a 8 a. m. y de 5 a 7 p. m. El mapa muestra el calor por vía. La tabla se ordena con MergeSort, QuickSort o HeapSort, con sus contadores. También hay top-k, estadísticas, búsqueda binaria y viajes simulados. Con **Cerrar con clic**, un clic cierra una estación o vía y la ruta activa se recalcula sola. En la red de calles reales, un clic cierra la calle en sus dos sentidos, y los botones **Cerrar Puente El Piñal** y **Cerrar Puente de la Vía Alterna** cierran un puente completo.

**Laboratorio.** Muestra los resultados de `npm run bench` y permite medir en el navegador. Las gráficas superponen la curva teórica y se exportan a SVG y PNG; los datos, a CSV.

**Teoría.** Fichas de cada algoritmo y estructura, con enlace a su visualización.

**Editor.** Agrega, mueve y elimina estaciones y vías, edita pesos y alterna entre dirigida y no dirigida. **Usar esta red** la vuelve la red activa. También importa y exporta JSON.

## Atajos

| Tecla | Acción |
|---|---|
| `Ctrl+K` | Paleta de comandos |
| `Espacio` | Reproducir o pausar |
| `←` `→` | Paso atrás o adelante; escena anterior o siguiente en la sustentación |
| `Esc` | Cerrar la paleta o la sustentación |

## CLI de respaldo

```bash
npm run cli -- ruta --red docente --desde A --hasta F --algo dijkstra --traza
npm run cli -- rutas --red docente --desde A --hasta E
npm run cli -- criticos --red buenaventura
npm run cli -- estaciones --red fase1
```
