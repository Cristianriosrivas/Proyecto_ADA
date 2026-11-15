import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import config from '../proyecto.config.json';
import { matrizQR } from '../src/ui/datos/qr';

/** Dibuja la matriz como imagen RGBA, con margen blanco, igual que el SVG de la aplicación. */
function imagen(m: boolean[][], escala = 6, margen = 4): { datos: Uint8ClampedArray; lado: number } {
  const lado = (m.length + 2 * margen) * escala;
  const datos = new Uint8ClampedArray(lado * lado * 4).fill(255);
  m.forEach((fila, f) =>
    fila.forEach((oscuro, c) => {
      if (!oscuro) return;
      for (let y = 0; y < escala; y++) {
        for (let x = 0; x < escala; x++) {
          const p = (((f + margen) * escala + y) * lado + (c + margen) * escala + x) * 4;
          datos[p] = datos[p + 1] = datos[p + 2] = 0;
        }
      }
    }),
  );
  return { datos, lado };
}

describe('código QR de la sustentación', () => {
  it('un lector de QR independiente lee exactamente la dirección pública del proyecto', () => {
    const url = config.urlPublica;
    expect(url).toMatch(/^https:\/\//);
    const { datos, lado } = imagen(matrizQR(url));
    const leido = jsQR(datos, lado, lado);
    expect(leido?.data).toBe(url);
  });

  it('también funciona con textos con tildes', () => {
    const texto = 'Malecón Bahía de la Cruz → Universidad del Valle';
    const { datos, lado } = imagen(matrizQR(texto));
    expect(jsQR(datos, lado, lado)?.data).toBe(texto);
  });
});
