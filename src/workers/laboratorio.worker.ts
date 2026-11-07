/// <reference lib="webworker" />
import { experimentos, type ConfigLaboratorio } from '../ui/datos/experimentos';

// Corre fuera del hilo de la interfaz: el mapa y los botones siguen respondiendo durante la medición
self.onmessage = (e: MessageEvent<ConfigLaboratorio>) => {
  for (const fila of experimentos(e.data)) self.postMessage(fila);
  self.postMessage({ tipo: 'fin' });
};
