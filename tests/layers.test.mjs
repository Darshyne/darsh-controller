/**
 * Les couches du SPEC §4 tiennent par leurs imports, pas par convention :
 *   core/     n'importe que core/
 *   adapter/  n'importe jamais runtime/ ni ui/
 *   runtime/  n'importe jamais ui/
 *   ui/       importe ce qu'il veut
 * core/ ne touche à aucun global de Foundry ni du navigateur. Chaque voisin n'est nommé que dans son adaptateur
 * (SPEC §2-6) : le moteur dans adapter/engine.mjs, l'interface dans adapter/ui.mjs.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../module/scripts");
const LAYERS = ["core", "adapter", "runtime", "ui"];

const files = layer => existsSync(join(ROOT, layer))
  ? readdirSync(join(ROOT, layer)).filter(f => f.endsWith(".mjs")).map(f => `${layer}/${f}`)
  : [];
const source = file => readFileSync(join(ROOT, file), "utf8");
const code = file => source(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const all = () => [...LAYERS.flatMap(files), "darsh-controller.mjs", "shared.mjs"];

function importedLayers(file) {
  const own = file.split("/")[0];
  const out = new Set();
  for ( const [, spec] of source(file).matchAll(/from\s+"([^"]+)"/g) ) {
    const m = spec.match(/^\.\.\/([a-z]+)\//);
    if ( m ) out.add(m[1]);
    else if ( spec.startsWith("./") ) out.add(own);
  }
  return out;
}

const forbidden = {
  core: ["adapter", "runtime", "ui"],
  adapter: ["runtime", "ui"],
  runtime: ["ui"],
  ui: []
};

describe("couches", () => {
  for ( const layer of LAYERS ) {
    it(`${layer}/ n'importe pas ${forbidden[layer].join(", ") || "(sans contrainte)"}`, () => {
      for ( const file of files(layer) ) {
        const bad = [...importedLayers(file)].filter(l => forbidden[layer].includes(l));
        expect(bad, file).toEqual([]);
      }
    });
  }

  it("core/ ne référence aucun global de Foundry ni du navigateur", () => {
    for ( const file of files("core") ) {
      expect(code(file), file).not.toMatch(/\b(game|canvas|Hooks|CONFIG|ui|foundry|navigator|document|window)\s*[.[]/);
    }
  });

  it("le moteur n'est nommé que dans adapter/engine.mjs", () => {
    for ( const file of all() ) {
      if ( file === "adapter/engine.mjs" ) continue;
      expect(code(file), file).not.toMatch(/dnd5e-combat/);
    }
  });

  it("l'interface n'est nommée que dans adapter/ui.mjs", () => {
    for ( const file of all() ) {
      if ( file === "adapter/ui.mjs" ) continue;
      expect(code(file), file).not.toMatch(/darsh-dnd-ui/);
    }
  });

  it("rien n'écrit dans un document (SPEC §2-4)", () => {
    for ( const file of all() ) {
      expect(code(file), file).not.toMatch(/\.(update|setFlag|unsetFlag|createEmbeddedDocuments|deleteEmbeddedDocuments|toggleStatusEffect)\(/);
    }
  });
});
