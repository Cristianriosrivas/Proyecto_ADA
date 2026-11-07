import { ArregloDinamico } from '../estructuras/ArregloDinamico';
import type { PasoTraza, Tracer } from './tipos';

/**
 * Guarda los pasos en memoria, con un tope.
 * El tope existe porque cada paso guarda una foto de tamaño Θ(V): sin él, trazar una red
 * grande llenaría la memoria. Si se alcanza, se avisa con `truncado` en lugar de fallar.
 */
export class TracerMemoria implements Tracer {
  readonly pasos = new ArregloDinamico<PasoTraza>(256);
  truncado = false;

  constructor(private readonly limite = 20000) {}

  registrar(paso: PasoTraza): void {
    if (this.pasos.tamano >= this.limite) {
      this.truncado = true;
      return;
    }
    this.pasos.agregar(paso);
  }

  get cantidad(): number {
    return this.pasos.tamano;
  }

  aArreglo(): PasoTraza[] {
    return this.pasos.aArreglo();
  }
}
