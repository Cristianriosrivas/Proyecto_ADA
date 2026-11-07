import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Auditoría de pureza (regla de oro 2): lee los archivos de `src/core` como texto y falla si
 * aparece algo prohibido o si se importa algo de fuera de `core`.
 * Quita comentarios y cadenas antes de buscar, para que una explicación no dé falso positivo.
 */
const RAIZ = join(process.cwd(), 'src', 'core');

function archivos(dir: string): string[] {
  const r: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) r.push(...archivos(p));
    else if (p.endsWith('.ts')) r.push(p);
  }
  return r;
}

function soloCodigo(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

const PROHIBIDO: [string, RegExp][] = [
  ['Array.prototype.sort', /\.sort\s*\(/],
  ['toSorted', /\.toSorted\s*\(/],
  ['shift', /\.shift\s*\(/],
  ['unshift', /\.unshift\s*\(/],
  ['splice', /\.splice\s*\(/],
  ['toSpliced', /\.toSpliced\s*\(/],
  // Más estricto que la regla 2: el arreglo nativo es solo un bloque de memoria indexado
  ['push', /\.push\s*\(/],
  ['pop', /\.pop\s*\(/],
  ['slice', /\.slice\s*\(/],
  ['concat', /\.concat\s*\(/],
  ['reverse', /\.reverse\s*\(/],
  ['map', /\.map\s*\(/],
  ['filter', /\.filter\s*\(/],
  ['forEach', /\.forEach\s*\(/],
  ['reduce', /\.reduce\s*\(/],
  ['indexOf', /\.indexOf\s*\(/],
  ['includes', /\.includes\s*\(/],
  ['Map', /\bnew\s+Map\b|\bMap\s*</],
  ['Set', /\bnew\s+Set\b|\bSet\s*</],
  ['WeakMap', /\bWeakMap\b/],
  ['WeakSet', /\bWeakSet\b/],
];

describe('auditoría de pureza de src/core', () => {
  const lista = archivos(RAIZ);

  it('encuentra los archivos de core', () => {
    expect(lista.length).toBeGreaterThan(8);
  });

  for (const archivo of lista) {
    const nombre = relative(RAIZ, archivo).split(sep).join('/');
    it(`${nombre} no usa nada prohibido`, () => {
      const codigo = soloCodigo(readFileSync(archivo, 'utf8'));
      const hallados = PROHIBIDO.filter(([, patron]) => patron.test(codigo)).map(([n]) => n);
      expect(hallados).toEqual([]);
    });

    it(`${nombre} solo importa desde core`, () => {
      const fuente = readFileSync(archivo, 'utf8');
      const importados = [...fuente.matchAll(/^\s*(?:import|export)[^'"\n]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
      for (const destino of importados) {
        expect(destino.startsWith('.'), `${destino} no es relativo`).toBe(true);
        const absoluto = join(archivo, '..', destino);
        expect(absoluto.startsWith(RAIZ), `${destino} sale de core`).toBe(true);
      }
    });
  }
});

describe('auditoría de dependencias', () => {
  const PROHIBIDAS = ['cytoscape', 'graphology', 'ngraph', 'd3-force', 'vis-network', 'sigma', 'react-flow', 'reactflow', '@xyflow', 'dagre', 'elkjs', 'jsnetworkx'];

  it('package.json no trae librerías de grafos', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: object; devDependencies?: object };
    const nombres = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(nombres.filter((n) => PROHIBIDAS.some((p) => n.includes(p)))).toEqual([]);
  });

  it('el lockfile tampoco las trae de forma indirecta', () => {
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as { packages: Record<string, unknown> };
    const nombres = Object.keys(lock.packages).map((p) => p.replace(/^.*node_modules\//, ''));
    expect(nombres.filter((n) => PROHIBIDAS.includes(n))).toEqual([]);
  });
});
