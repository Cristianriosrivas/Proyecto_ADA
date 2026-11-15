import qrcode from 'qrcode-generator';

/**
 * Módulos de un código QR con corrección de errores M (resiste ~15 % de daño, por ejemplo un
 * reflejo del proyector). Se genera en el navegador, sin servicios de internet.
 */
export function matrizQR(texto: string): boolean[][] {
  // UTF-8, para que tildes y símbolos lleguen bien al celular. La librería, por defecto, corta
  // cada carácter a un byte; el codificador del navegador hace la conversión correcta.
  qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s));
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, f) => Array.from({ length: n }, (_, c) => q.isDark(f, c)));
}
