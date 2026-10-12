/**
 * Le seul fichier qui connaît `darsh-dnd-ui` (SPEC §2-6) : la Barre lue page par page et utilisée case par case, par son API
 * publique (`api.bar.pages()`, `api.bar.use()`, darsh-dnd-ui ≥ 0.21.0).
 */
const ID = "darsh-dnd-ui";

function bar() {
  const mod = game.modules.get(ID);
  return mod?.active ? (mod.api?.bar ?? null) : null;
}

/** L'interface est là et sait se faire lire (sinon : module absent ou trop ancien). */
export const available = () => typeof bar()?.pages === "function";

/** L'acteur que la Barre affiche, ou null. */
export const actor = () => bar()?.actor ?? null;

/** Les pages de la Barre de l'acteur affiché : `[{ tab, label, cells }]`. */
export const pages = () => available() ? bar().pages() : [];

/** Utilise une case : `{ slot }` pour un sort surchargé, `{ hand }` pour une arme du jeu actif. */
export const use = (ref, options = {}) => available() ? bar().use(ref, options) : false;
