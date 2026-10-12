/**
 * Le dessin du curseur virtuel : une flèche en `position: fixed`, au-dessus de tout, transparente aux clics
 * (`document.elementFromPoint` la traverse).
 */
import { onCursor } from "../runtime/cursor.mjs";

let el = null;

export function mountCursor() {
  if ( el ) return;
  el = document.createElement("div");
  el.id = "dctl-cursor";
  el.className = "dctl-cursor";
  el.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
    <path d="M3 2 L3 20 L8 15.5 L11.5 22 L14.5 20.6 L11 14 L18 14 Z"/></svg>`;
  document.body.append(el);
  onCursor(s => {
    const shown = s.active && s.shown;
    el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    el.classList.toggle("is-shown", shown);
    el.classList.toggle("is-down", s.pressed);
    // Un seul curseur à l'écran (« j'ai les deux curseurs souris et pad », 2026-10-12) : le pointeur du système est masqué
    // tant que celui de la manette est affiché ; un vrai mouvement de souris efface le second et rend le premier.
    document.documentElement.classList.toggle("dctl-hide-mouse", shown);
  });
}
