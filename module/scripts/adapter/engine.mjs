/**
 * Le seul fichier qui nomme le moteur `dnd5e-combat` (SPEC §2-6). Lecture de son API publique seulement — le moteur n'est
 * jamais modifié d'ici (consigne de l'utilisateur, 2026-10-12).
 */
const ID = "dnd5e-combat";

/** Les entrées du menu contextuel du moteur (clic droit), pour l'aimant du curseur. */
export const MENU_ITEMS = `.${ID}-menu li`;

/** Hook du moteur : la visée en attente change (`state` ou null), sur ce client (moteur §118). */
export const TARGETING_HOOK = `${ID}.targeting`;

const api = () => {
  const mod = game.modules.get(ID);
  return mod?.active ? (mod.api ?? null) : null;
};

export const active = () => !!api()?.active;

/** La visée en attente (`{ kind, prompt, picked, total… }`) ou null. */
export const targeting = () => api()?.ui?.targeting?.() ?? null;

/**
 * Marche publique du moteur (§39.1) : chemin A*, portes, attaques d'opportunité, budget du tour.
 * @returns {Promise<{arrived: boolean, reason?: string}>}
 */
export async function approach(tokenDocument, cells) {
  const fn = api()?.approach;
  if ( typeof fn !== "function" ) return { arrived: false, reason: "noEngine" };
  return fn(tokenDocument, { cells });
}

/** Arrête les marches du moteur lancées par ce client, à la prochaine case (`api.stopWalks`, moteur §39). */
export function stopWalks() {
  api()?.stopWalks?.();
}
