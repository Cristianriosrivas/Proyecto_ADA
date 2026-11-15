# Anexo: manual de usuario

El sistema se abre con doble clic en `GestorRutas.html`, sin internet ni servidor. También está publicado en https://gestor-rutas-ada.cristian-david-rios.workers.dev, para abrirlo desde cualquier computador o celular. La barra superior elige la red activa y la métrica, y la barra lateral cambia de vista. `Ctrl+K` abre la paleta de comandos.

## Calles reales y mapa real

En la red "Buenaventura, calles reales" el botón de capas, arriba a la izquierda del mapa, elige el fondo:

- **Esquema:** solo la red, como un plano de metro.
- **Calles:** las calles, la costa, el agua y el manglar guardados en el proyecto. Funciona sin internet y es el fondo por defecto.
- **Mapa real:** el mapa de OpenStreetMap detrás de la red, como en un mapa de internet. Necesita conexión. Si no la hay, el sistema avisa y vuelve solo a las calles guardadas.

En el planificador, la exploración se anima sobre el mapa: las estaciones se pintan en el orden en que el algoritmo las cierra, y al final aparece la ruta, descrita por las calles que recorre. En Tráfico, un botón cierra de una vez el Puente El Piñal o el de la Vía Alterna.

{{captura:calles-reales|Red de calles reales con el fondo de calles guardadas, que funciona sin internet.}}

## Inicio

{{captura:inicio|Pantalla de inicio. La red de Buenaventura se resuelve sola mientras se muestra el proyecto.}}

## Planificador

Es el prototipo de la Fase 2. El usuario elige dos estaciones, por clic o con el buscador, y el algoritmo. El sistema devuelve la ruta, su costo, los nodos expandidos, las relajaciones, las operaciones del heap, el tiempo y la complejidad teórica.

{{captura:planificador|Planificador con la ruta dibujada sobre la red de Buenaventura.}}

## Visualizador

Reproduce la exploración paso a paso, con el pseudocódigo sincronizado, las estructuras en vivo y la narración. Espacio reproduce o pausa, y las flechas avanzan de a un paso.

{{captura:visualizador|Visualizador durante Dijkstra.}}

## Prueba de escritorio

Ejecuta los 4 casos del docente, marca "Coincide" y muestra la traza por iteración. Exporta a CSV y permite imprimir.

{{captura:prueba-de-escritorio|Modo Prueba de Escritorio.}}

## Explorador DFS

Halla las rutas simples, verifica la conectividad y resalta las estaciones y vías críticas.

{{captura:explorador-dfs|Explorador DFS con rutas simples y puntos críticos.}}

## Duelo

Compara Dijkstra y A* en la misma red, con A* ponderado, heurísticas alternativas y validador.

{{captura:duelo|Duelo entre Dijkstra y A*.}}

## Tráfico

Simula 24 horas con horas pico. Incluye mapa de calor, tabla ordenable, top-k, estadísticas, búsqueda binaria, incidentes y re-ruteo en vivo.

{{captura:trafico|Centro de Tráfico a las 7:00.}}

## Laboratorio

Mide en el navegador, con un Web Worker, y grafica contra la curva teórica.

{{captura:laboratorio|Laboratorio de complejidad.}}

## Editor

Permite agregar, mover y eliminar estaciones y vías, editar pesos, alternar entre dirigida y no dirigida, e importar y exportar JSON.

{{captura:editor|Editor de redes.}}

## Modo Sustentación

Recorre el proyecto a pantalla completa, con letra grande: problema, red docente, BFS, DFS, Dijkstra, A*, duelo, tráfico, las calles reales de Buenaventura, "rompe la ciudad", laboratorio y conclusiones. La primera escena trae un código QR que abre la versión publicada, para que el público la pruebe en su celular. En "rompe la ciudad", un clic cierra una calle o un cruce y Dijkstra recalcula la ruta al instante; si el origen y el destino quedan incomunicados, cada lado de la ciudad se pinta de un color.

{{captura:sustentacion|Modo Sustentación.}}
