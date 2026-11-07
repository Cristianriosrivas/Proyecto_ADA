// Informe: Markdown con LaTeX → HTML (markdown-it + KaTeX) → PDF con Puppeteer.
// Uso: tsx informe/construir.ts final | fase1
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import katex from 'katex';
import MarkdownIt from 'markdown-it';
import { PDFDict, PDFDocument, PDFName, PDFArray, PDFRef } from 'pdf-lib';
import puppeteer from 'puppeteer-core';
import { datosInforme, type Datos } from './datos';

const modo = process.argv[2] === 'fase1' ? 'fase1' : 'final';
const SALIDA = 'informe/salida';
mkdirSync(SALIDA, { recursive: true });
const NOMBRE = modo === 'final' ? 'Informe_Tecnico' : 'Documento_Fase1';

const config = JSON.parse(readFileSync('proyecto.config.json', 'utf8')) as {
  universidad: string;
  curso: string;
  codigoCurso: string;
  periodo: string;
  docente: string;
  proyecto: string;
  fechaEntrega: string;
  integrantes: { nombre: string; apellidos: string; codigo: string }[];
};

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

const fuentes = readdirSync(`informe/fuentes/${modo}`)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => readFileSync(`informe/fuentes/${modo}/${f}`, 'utf8'))
  .join('\n\n');

/** Sustituye {{dato}}, {{tabla:x|leyenda}} y {{fig:x|leyenda}}. Toda cifra entra por aquí. */
function sustituir(texto: string, d: Datos): string {
  let nFig = 0;
  let nTabla = 0;
  return texto
    .replace(/\{\{fig:([^|}]+)\|([^}]+)\}\}/g, (_, nombres: string, leyenda: string) => {
      nFig++;
      const svg = nombres.split(',').map((n) => {
        const p = `informe/figuras/${n.trim()}.svg`;
        if (!existsSync(p)) throw new Error(`Falta la figura ${p}`);
        return `<div class="fig-celda">${readFileSync(p, 'utf8')}</div>`;
      });
      return `\n<figure class="fig">${svg.join('')}<figcaption><b>Figura ${nFig.toString()}.</b> ${leyenda}</figcaption></figure>\n`;
    })
    .replace(/\{\{captura:([^|}]+)\|([^}]+)\}\}/g, (_, nombre: string, leyenda: string) => {
      nFig++;
      const p = `informe/figuras/capturas/${nombre}.png`;
      if (!existsSync(p)) throw new Error(`Falta la captura ${p}`);
      const b = readFileSync(p).toString('base64');
      return `\n<figure class="fig"><img src="data:image/png;base64,${b}" alt="${leyenda}"><figcaption><b>Figura ${nFig}.</b> ${leyenda}</figcaption></figure>\n`;
    })
    .replace(/\{\{tabla:([^|}]+)\|([^}]+)\}\}/g, (_, nombre: string, leyenda: string) => {
      nTabla++;
      const f = d.tablas[nombre.trim()];
      if (!f) throw new Error(`Falta la tabla ${nombre}`);
      return `\n<figure class="tab"><figcaption><b>Tabla ${nTabla}.</b> ${leyenda}</figcaption>\n\n${f()}\n\n</figure>\n`;
    })
    .replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, k: string) => {
      if (!(k in d.valores)) throw new Error(`Falta el dato ${k}`);
      return d.valores[k];
    });
}

/** Protege las fórmulas para que markdown-it no toque sus guiones bajos y asteriscos. */
function renderizarMatematicas(texto: string): { texto: string; formulas: string[] } {
  const formulas: string[] = [];
  const guardar = (tex: string, display: boolean) => {
    formulas.push(katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: 'ignore' }));
    return `@@MATE${formulas.length - 1}@@`;
  };
  const t = texto
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m: string) => `\n\n${guardar(m.trim(), true)}\n\n`)
    .replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, a: string, m: string) => `${a}${guardar(m, false)}`);
  return { texto: t, formulas };
}

/** Pseudocódigo numerado estilo CLRS: bloques ```pseudo. */
function bloquesPseudo(md: MarkdownIt): void {
  const original = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, opciones, env, self) => {
    const t = tokens[idx];
    if (t.info.trim() !== 'pseudo') return original ? original(tokens, idx, opciones, env, self) : '';
    const lineas = t.content.replace(/\n$/, '').split('\n');
    const titulo = lineas[0];
    const cuerpo = lineas.slice(1).map((l, i) => {
      const k = /^ */.exec(l)?.[0].length ?? 0;
      const texto = l.trim().replace(/</g, '&lt;').replace(/\b(for|while|if|elseif|else|return|continue|break)\b/g, '<b>$1</b>');
      return `<tr><td class="n">${i + 1}</td><td style="padding-left:${k * 0.42}em">${texto}</td></tr>`;
    });
    return `<div class="pseudo"><div class="titulo">${titulo.replace(/</g, '&lt;')}</div><table>${cuerpo.join('')}</table></div>`;
  };
}

const slug = (s: string, i: number) => `h${i}-${s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;

function katexCss(): string {
  const base = 'node_modules/katex/dist';
  return readFileSync(`${base}/katex.min.css`, 'utf8').replace(/url\(fonts\/([^)]+\.woff2)\)/g, (_, f: string) => `url(data:font/woff2;base64,${readFileSync(`${base}/fonts/${f}`).toString('base64')})`).replace(/,url\(fonts\/[^)]+\.(woff|ttf)\) format\("(woff|truetype)"\)/g, '');
}

function fuenteLocal(pkg: string, archivo: string, familia: string, peso: number): string {
  const p = `node_modules/@fontsource/${pkg}/files/${archivo}`;
  if (!existsSync(p)) return '';
  return `@font-face{font-family:'${familia}';font-weight:${peso};src:url(data:font/woff2;base64,${readFileSync(p).toString('base64')}) format('woff2');}`;
}

const CSS = `
@page { size: letter; margin: 22mm 21mm 20mm 21mm; }
* { box-sizing: border-box; }
html { font-family: 'Sora', Arial, sans-serif; font-size: 10.2pt; line-height: 1.5; color: #14262c; }
body { margin: 0; }
p { margin: 0 0 7pt; text-align: justify; hyphens: auto; }
h1, h2, h3 { line-height: 1.2; font-weight: 700; break-after: avoid; }
h1 { font-size: 17pt; color: #8e0e15; margin: 0 0 10pt; padding-bottom: 4pt; border-bottom: 2pt solid #b5121b; break-before: page; }
h2 { font-size: 12.5pt; margin: 14pt 0 5pt; color: #123440; }
h3 { font-size: 10.6pt; margin: 10pt 0 3pt; color: #123440; }
ul, ol { margin: 0 0 7pt; padding-left: 16pt; } li { margin-bottom: 2pt; }
code { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 8.8pt; }
.portada { height: 232mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
.portada .u { font-size: 13pt; font-weight: 700; color: #8e0e15; }
.portada .t { font-size: 30pt; font-weight: 700; line-height: 1.08; color: #123440; margin: 8pt 0; }
.portada .s { font-size: 13pt; color: #3b5159; }
.portada table { border-collapse: collapse; font-size: 10pt; } .portada td { padding: 2pt 14pt 2pt 0; vertical-align: top; }
.resumen { break-after: page; }
.toc { break-after: page; } .toc h1 { break-before: auto; }
.toc ul { list-style: none; padding: 0; margin: 0; }
.toc li { display: flex; gap: 6pt; align-items: baseline; margin: 1.5pt 0; }
.toc li.n1 { font-weight: 700; margin-top: 5pt; } .toc li.n2 { padding-left: 12pt; font-size: 9.4pt; }
.toc a { color: inherit; text-decoration: none; } .toc .puntos { flex: 1; border-bottom: .6pt dotted #999; transform: translateY(-2.5pt); }
figure { margin: 8pt 0 10pt; break-inside: avoid; }
figure.fig { text-align: center; } figure.fig svg, figure.fig img { width: 100%; height: auto; display: block; border: .5pt solid #ddd; }
figure.fig .fig-celda { display: inline-block; width: 100%; vertical-align: top; }
figcaption { font-size: 8.7pt; color: #3b5159; margin-top: 4pt; text-align: left; }
figure.tab figcaption { margin: 0 0 3pt; }
table { border-collapse: collapse; width: 100%; font-size: 8.7pt; font-variant-numeric: tabular-nums; }
th { text-align: left; border-bottom: 1.2pt solid #123440; padding: 2.5pt 5pt; font-weight: 700; }
td { border-bottom: .4pt solid #cdd6d8; padding: 2.5pt 5pt; vertical-align: top; }
tr { break-inside: avoid; }
.pseudo { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 8.7pt; background: #f4f6f5; border-left: 2.5pt solid #123440; padding: 6pt 8pt; margin: 6pt 0 9pt; break-inside: avoid; }
.pseudo .titulo { font-weight: 700; margin-bottom: 3pt; }
.pseudo table { font-size: 8.7pt; width: auto; } .pseudo td { border: 0; padding: .4pt 4pt; } .pseudo td.n { color: #6a7c82; text-align: right; width: 18pt; }
.katex { font-size: 1.04em; } .katex-display { margin: 6pt 0; overflow: hidden; }
blockquote { margin: 6pt 0; padding: 4pt 10pt; border-left: 3pt solid #b5121b; background: #faf5f4; }
blockquote p { margin: 0; }
.dos { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; }
`;

async function imprimir(htmlPath: string, pdfPath: string): Promise<void> {
  const ejecutable = NAVEGADORES.find((p) => existsSync(p));
  if (!ejecutable) throw new Error('No se encontró Edge ni Chrome');
  const b = await puppeteer.launch({ executablePath: ejecutable, headless: true });
  const p = await b.newPage();
  await p.goto(pathToFileURL(resolve(htmlPath)).href, { waitUntil: 'load', timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  const pie = `<div style="width:100%;font:7.5px Arial;color:#667;padding:0 21mm;display:flex;justify-content:space-between"><span>${config.proyecto} · ${config.curso}</span><span><span class="pageNumber"></span></span></div>`;
  await p.pdf({ path: pdfPath, format: 'letter', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: pie, timeout: 300000 });
  await b.close();
}

/** Lee del PDF en qué página quedó cada destino interno. Así el índice lleva números reales. */
async function paginasDeDestinos(pdfPath: string): Promise<Map<string, number>> {
  const doc = await PDFDocument.load(readFileSync(pdfPath));
  const paginas = doc.getPages().map((p) => p.ref);
  const r = new Map<string, number>();
  const destinos = doc.catalog.lookupMaybe(PDFName.of('Dests'), PDFDict);
  if (!destinos) return r;
  for (const [nombre, valor] of destinos.entries()) {
    const arreglo = doc.context.lookup(valor);
    if (arreglo instanceof PDFArray) {
      const ref = arreglo.get(0);
      if (ref instanceof PDFRef) {
        const i = paginas.findIndex((x) => x === ref || x.toString() === ref.toString());
        if (i >= 0) r.set(decodeURIComponent(nombre.decodeText()), i + 1);
      }
    }
  }
  return r;
}

async function principal(): Promise<void> {
  const d = datosInforme();
  const conDatos = sustituir(fuentes, d);
  const { texto, formulas } = renderizarMatematicas(conDatos);
  const md = new MarkdownIt({ html: true, typographer: false });
  bloquesPseudo(md);
  const titulos: { nivel: number; texto: string; id: string }[] = [];
  md.core.ruler.push('ids', (estado) => {
    estado.tokens.forEach((t, i) => {
      if (t.type === 'heading_open' && (t.tag === 'h1' || t.tag === 'h2')) {
        const contenido = estado.tokens[i + 1].content.replace(/@@MATE\d+@@/g, '').trim();
        const id = slug(contenido, titulos.length);
        t.attrSet('id', id);
        titulos.push({ nivel: Number(t.tag[1]), texto: contenido, id });
      }
    });
  });
  let cuerpo = md.render(texto);
  cuerpo = cuerpo.replace(/@@MATE(\d+)@@/g, (_, i: string) => formulas[Number(i)]);

  const integrantes = config.integrantes.map((p) => `<tr><td>${p.nombre} ${p.apellidos}</td><td>${p.codigo}</td></tr>`).join('');
  const titulo = modo === 'final' ? 'Informe técnico' : 'Documento técnico de la Fase 1';
  const portada = `<section class="portada"><div><div class="u">${config.universidad}</div><div class="s">${config.curso} (${config.codigoCurso}) · ${config.periodo}</div></div>
    <div><div class="t">${config.proyecto}</div><div class="s">${titulo}</div></div>
    <div><table><tr><td><b>Docente</b></td><td>${config.docente}</td></tr><tr><td><b>Fecha</b></td><td>${config.fechaEntrega}</td></tr></table><br><table><tr><td><b>Integrantes</b></td><td><b>Código</b></td></tr>${integrantes}</table></div></section>`;

  const indice = (paginas: Map<string, number>) => `<section class="toc"><h1>Índice</h1><ul>${titulos.map((t) => `<li class="n${t.nivel}"><a href="#${t.id}">${t.texto}</a><span class="puntos"></span><span>${paginas.get(t.id) ?? ''}</span></li>`).join('')}</ul></section>`;

  const fuentesCss = [
    fuenteLocal('sora', 'sora-latin-400-normal.woff2', 'Sora', 400),
    fuenteLocal('sora', 'sora-latin-700-normal.woff2', 'Sora', 700),
    fuenteLocal('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2', 'JetBrains Mono', 400),
    fuenteLocal('jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2', 'JetBrains Mono', 700),
  ].join('');
  const armar = (paginas: Map<string, number>) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${config.proyecto}: ${titulo}</title><style>${fuentesCss}${katexCss()}${CSS}</style></head><body>${portada}${indice(paginas)}${cuerpo}</body></html>`;

  const html = `${SALIDA}/${NOMBRE}.html`;
  const pdf = `${SALIDA}/${NOMBRE}.pdf`;
  // Primera pasada para saber en qué página cae cada título, segunda con los números reales
  writeFileSync(html, armar(new Map()));
  console.log(`HTML listo: ${html}`);
  try {
    await imprimir(html, pdf);
    const paginas = await paginasDeDestinos(pdf);
    console.log(`Destinos hallados: ${paginas.size} de ${titulos.length}`);
    writeFileSync(html, armar(paginas));
    await imprimir(html, pdf);
    const final = await PDFDocument.load(readFileSync(pdf));
    console.log(`PDF listo: ${pdf}, ${final.getPageCount()} páginas`);
  } catch (e) {
    console.error('Puppeteer falló. Queda el HTML listo para imprimir a PDF desde el navegador.', e);
    process.exitCode = 1;
  }
}

void principal();
