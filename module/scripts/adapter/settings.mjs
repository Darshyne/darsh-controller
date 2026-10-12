/**
 * Réglages, tous de portée client (SPEC §2-4, §7) : chaque joueur règle sa manette sur sa machine.
 */
import { MODULE_ID } from "../shared.mjs";
import { DEFAULTS } from "../core/pad.mjs";

export function registerSettings({ diagnosticMenu }) {
  const client = (key, type, def, extra = {}) => game.settings.register(MODULE_ID, key, {
    name: `DCTL.Reglage.${key}.Nom`, hint: `DCTL.Reglage.${key}.Indic`,
    scope: "client", config: true, type, default: def, ...extra
  });
  client("enabled", Boolean, true);
  client("deadzone", Number, DEFAULTS.deadzone, { range: { min: 0.05, max: 0.5, step: 0.01 } });
  client("holdMs", Number, DEFAULTS.holdMs, { range: { min: 200, max: 1500, step: 50 } });
  client("magnet", Boolean, true);
  client("cursorSpeed", Number, 1200, { range: { min: 300, max: 3000, step: 50 } });
  client("panSpeed", Number, 1400, { range: { min: 300, max: 4000, step: 50 } });
  client("rumble", Boolean, false);
  // Id exact de la manette à lire (vide = la première au mapping standard) ; copié depuis le diagnostic.
  client("padId", String, "");

  game.settings.registerMenu(MODULE_ID, "diagnostic", {
    name: "DCTL.Diagnostic.Menu", label: "DCTL.Diagnostic.Ouvrir", hint: "DCTL.Diagnostic.Indic",
    icon: "fa-solid fa-gamepad", type: diagnosticMenu, restricted: false
  });
}

/** Les options de `core/pad.mjs#step` tirées des réglages. */
export function padOptions() {
  return {
    deadzone: game.settings.get(MODULE_ID, "deadzone"),
    holdMs: game.settings.get(MODULE_ID, "holdMs")
  };
}
