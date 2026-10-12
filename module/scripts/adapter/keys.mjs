/**
 * Les touches que le joueur a liées aux actions du cœur (réglages des touches) : la manette les emprunte au lieu de
 * supposer des touches fixes. Constaté le 2026-10-12 dans un monde de test : `core.moveDown` y est lié à S seulement, les
 * flèches à `panDown` (déplacer la vue).
 */

/** Le `key` d'un KeyboardEvent tiré de son `code` (KeyS → s, Digit1 → 1, sinon le code lui-même : ArrowDown…). */
function keyOf(code) {
  if ( /^Key[A-Z]$/.test(code) ) return code.slice(3).toLowerCase();
  if ( /^Digit\d$/.test(code) ) return code.slice(5);
  return code;
}

/** La première liaison sans modificateur d'une action, ou null. */
export function boundKey(namespace, action) {
  const bindings = game.keybindings.get(namespace, action) ?? [];
  const binding = bindings.find(b => !b.modifiers?.length) ?? null;
  return binding?.key ? { code: binding.key, key: keyOf(binding.key) } : null;
}
