# Progreso del proyecto

**Estado actual:** plan aprobado por el estudiante el 2026-11-07. Se construye en orden; ver el checklist.

## Plan de fases

- [x] **F0** Setup: Vite + TS strict + Tailwind + Vitest + ESLint, scripts compatibles con Windows, git, `REGLAS.md`, `PROGRESO.md`, `proyecto.config.json`.
- [x] **F1** Estructuras: cola circular, pila, lista enlazada, lista y matriz de adyacencia, min-heap indexado, tabla hash, árbol k-d + tests + auditoría de pureza.
- [x] **F2** Grafo + BFS + DFS (iterativo y recursivo) + rutas simples + conectividad + Tarjan + tracer + tests de la prueba de escritorio.
- [x] **F3** Dijkstra (heap y arreglo) + A\* (km y minutos, ponderado, h = 0) + validador de heurística + validación cruzada.
- [x] **F4** Ordenamientos con contadores + búsqueda binaria + tráfico + estadísticas + experimento de la P6.
- [x] **F5** Generadores con semilla + presets (docente, fase 1, Buenaventura) + `npm run bench` + CLI.
- [x] **F6** Shell de la UI + sistema de diseño (tokens, tipografía, temas) + mapa SVG/Canvas con zoom/pan + editor.
- [x] **F7** Planificador + Visualizador paso a paso (pseudocódigo, inspector de estructuras, narración) + Modo Prueba de Escritorio.
- [x] **F8** Explorador DFS + Duelo + Centro de Tráfico + Laboratorio (Web Worker) + Teoría.
- [x] **F9** Pulido: Modo Sustentación, Ctrl+K, atajos, accesibilidad, responsive, rendimiento, build de un solo archivo.
- [ ] **F10** Informe PDF (fase 1 y final) + guía de sustentación + README + manual con capturas.
- [ ] **F11** QA final: `npm run check` en verde, revisión del cumplimiento punto por punto contra la sección 1 y la rúbrica, `npm run entrega`.

## Verificado antes de planear (2026-11-07)

- Entorno: Node v24.21.0, npm 10.9.0, git 2.56.0, Windows 11. Hay Edge y Chrome instalados y npm tiene acceso a internet.
- Máquina de los benchmarks: Intel Celeron N4500 a 1,10 GHz, 7,8 GB de RAM, unos 106 GB libres.
- Con un script independiente coinciden los 4 resultados de la sección 3, las listas de adyacencia, las 11 rutas simples de A a E (la mejor cuesta 10 km), los 6 nodos cerrados por Dijkstra A → F, los 8 cerrados por A\* A → H, `distanciaEuclidiana ≤ peso` en las 11 vías y los valores h/h\*.
- En la figura del docente aparecen h(F) = 6.3 y h(G) = 2.2, mayores que los costos reales 3 y 2.

## Decisiones de arquitectura (aprobadas)

1. Carpeta: `C:\Users\USUARIO\Desktop\Libros\gestor-rutas-ada`, con su propio repositorio git.
2. La auditoría de pureza es más estricta que la regla 2: también prohíbe `push`, `pop`, `slice`, `concat`, `map`, `filter`, `forEach`, `indexOf` e `includes` en `core`. Las listas que crecen usan un `ArregloDinamico` propio.
3. La lista de adyacencia es un pool de arreglos tipados (`cabeza`, `cola`, `siguiente`, `destino`, `distanciaKm`, `tiempoMin`). Conserva la inserción por la cola en O(1), sirve hasta N = 5000 y hace exacta la cuenta teórica de bytes.
4. El DFS iterativo recorre los vecinos al revés con el puntero `anterior` de la lista, sin buffer. La pila puede llegar a O(E) entradas, y el informe lo dirá.
5. El tracer se protege con `if (tracer)`. Queda solo esa rama, y su costo se medirá.
6. En la red docente `tiempoMin` es igual al peso, porque el documento dice "km/min". En cada red, velocidadMáxima = máx(euclidiana / tiempo) sobre las vías, lo que mantiene h admisible en minutos. La congestión solo sube los pesos, así que h sigue siendo admisible.
7. El Web Worker se incrusta como blob para que `GestorRutas.html` funcione con doble clic. Si el navegador lo bloquea, el trabajo corre por lotes en el hilo principal.
8. Fuentes Sora y JetBrains Mono, incrustadas en el HTML de un solo archivo.
9. PDF y capturas con `puppeteer-core` sobre el Edge o Chrome instalados, sin descargar Chromium. Respaldo: el HTML listo para imprimir.
10. El CLI corre con `tsx`.
11. Experimento de redes densas: barrido de densidad con N ≤ 2000. Una red completa con N = 5000 tendría 12,5 millones de vías. Las redes dispersas sí llegan a N = 5000.
12. Tarjan corre sobre el grafo no dirigido subyacente. En redes dirigidas se muestra además alcanzabilidad.
13. Vercel no se toca salvo que el estudiante lo pida.
14. Los escenarios de "Analizar la eficiencia… en distintos escenarios" no vienen listados en el documento del docente. Se usarán redes dispersas, densas, cuadrícula y metro, con origen y destino cercanos y lejanos.
