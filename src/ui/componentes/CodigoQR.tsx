import { useMemo } from 'react';
import { matrizQR } from '../datos/qr';

/** El QR como SVG. Siempre negro sobre blanco, con su margen de 4 módulos, para que los celulares lo lean en cualquier tema. */
export function CodigoQR({ texto, tamano = 200 }: { texto: string; tamano?: number }) {
  const { lado, d } = useMemo(() => {
    const m = matrizQR(texto);
    const margen = 4;
    let camino = '';
    m.forEach((fila, f) =>
      fila.forEach((oscuro, c) => {
        if (oscuro) camino += `M${c + margen} ${f + margen}h1v1h-1z`;
      }),
    );
    return { lado: m.length + 2 * margen, d: camino };
  }, [texto]);
  return (
    <svg className="codigo-qr" viewBox={`0 0 ${lado} ${lado}`} width={tamano} height={tamano} role="img" aria-label={`Código QR que abre ${texto}`} shapeRendering="crispEdges">
      <rect width={lado} height={lado} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
