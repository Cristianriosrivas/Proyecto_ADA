import { Play } from 'lucide-react';
import { FICHAS, type FichaTeoria } from '../datos/teoria';
import { useTienda } from '../estado/tienda';

const GRUPOS: FichaTeoria['grupo'][] = ['Algoritmos de grafos', 'Estructuras de datos', 'Ordenamiento y búsqueda'];

export function Teoria() {
  const irA = useTienda((e) => e.irA);
  const elegir = useTienda((e) => e.elegirAlgoritmo);
  return (
    <div className="vista">
      <div className="encabezado">
        <h2>Teoría integrada</h2>
        <p>Complejidad, recurrencia, Método Maestro y correctitud de cada algoritmo y estructura del proyecto.</p>
      </div>
      {GRUPOS.map((g) => (
        <section key={g} aria-label={g} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontSize: 15 }}>{g}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 10 }}>
            {FICHAS.filter((f) => f.grupo === g).map((f) => (
              <article key={f.titulo} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h3 style={{ color: 'var(--texto)', fontSize: 15, marginBottom: 0 }}>{f.titulo}</h3>
                <p className="mono" style={{ fontSize: 12.5 }}>Tiempo: {f.tiempo}</p>
                <p className="mono" style={{ fontSize: 12.5 }}>Espacio: {f.espacio}</p>
                {f.recurrencia && <p className="mono" style={{ fontSize: 12.5, color: 'var(--frontera)' }}>{f.recurrencia}</p>}
                {f.maestro && <p style={{ fontSize: 13 }}><b>Método Maestro:</b> {f.maestro}</p>}
                <p style={{ fontSize: 13, color: 'var(--texto-2)' }}>{f.correctitud}</p>
                {f.algoritmo && (
                  <button
                    className="boton"
                    style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
                    onClick={() => {
                      elegir(f.algoritmo as NonNullable<FichaTeoria['algoritmo']>);
                      irA('visualizador');
                    }}
                  >
                    <Play size={14} />Ver visualización
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
