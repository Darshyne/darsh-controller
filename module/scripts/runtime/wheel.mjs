/**
 * La roue d'actions (SPEC §5, étape 3) : les cases de la Barre de `darsh-dnd-ui`, huit par page, comme le menu radial de BG3.
 *
 *   LB / RB (fermée)   ouvrir la roue (BG3 : actions du personnage)
 *   Stick gauche       viser une case (la sélection reste quand on relâche le stick)
 *   LB / RB            page précédente / suivante (jeu d'armes, vue par défaut, Personnalisé, onglets)
 *   A                  utiliser la case ; un sort surchargeable ouvre l'anneau des niveaux (A confirme, B revient)
 *   B                  fermer (ou quitter l'anneau des niveaux)
 *
 * Pendant que la roue est ouverte, le curseur virtuel est suspendu. Les grisés ne bloquent pas, comme à la souris : la raison
 * s'affiche au centre, le moteur décide. Après une utilisation la roue se ferme et le curseur reprend — c'est lui qui choisit
 * la cible quand le moteur attend un clic.
 */
import { paginate, sectorOf, cycle, defaultSlot } from "../core/wheel.mjs";
import * as ui from "../adapter/ui.mjs";
import { loc } from "../shared.mjs";
import { onFrame } from "./loop.mjs";
import * as cursor from "./cursor.mjs";

/** `null` fermée, sinon `{ pages, page, selected, ring: null | { cell, options, selected } }`. */
let state = null;
const listeners = new Set();
let off = null;
/** Page rouverte d'une fois sur l'autre (par onglet, la partie revient à 1). */
let lastTab = null;

export function onWheel(fn) {
  listeners.add(fn);
  fn(view());
  return () => listeners.delete(fn);
}

function view() {
  if ( !state ) return null;
  const page = state.pages[state.page];
  return {
    actor: ui.actor()?.name ?? "",
    pages: state.pages.map(p => ({ tab: p.tab, label: p.label, part: p.part, parts: p.parts })),
    page: state.page,
    cells: page?.cells ?? [],
    selected: state.selected,
    ring: state.ring ? { cell: state.ring.cell, options: state.ring.options, selected: state.ring.selected } : null
  };
}
const publish = () => { const v = view(); for ( const fn of listeners ) fn(v); };

export const isOpen = () => !!state;

/** @param {string|null} [tab]  onglet de la Barre où ouvrir (sinon le dernier ouvert) */
export function open(tab = null) {
  if ( state ) return;
  // `ui` est ici l'adaptateur de darsh-dnd-ui ; les notifications du cœur sont `globalThis.ui`.
  if ( !ui.available() ) return globalThis.ui.notifications.warn(loc("Roue.SansInterface"));
  const pages = paginate(ui.pages());
  if ( !pages.length ) return globalThis.ui.notifications.info(loc("Roue.Vide"));
  const wanted = tab ?? lastTab;
  const page = Math.max(0, pages.findIndex(p => p.tab === wanted && p.part === 1));
  state = { pages, page, selected: null, ring: null };
  cursor.suspend(true);
  publish();
}

export function close() {
  if ( !state ) return;
  lastTab = state.pages[state.page]?.tab ?? lastTab;
  state = null;
  cursor.suspend(false);
  publish();
}

function turnPage(delta) {
  state.page = cycle(state.page, delta, state.pages.length);
  state.selected = null;
  state.ring = null;
  publish();
}

function activate() {
  if ( state.ring ) {
    const { cell, options, selected } = state.ring;
    const slot = options[selected ?? 0]?.key ?? defaultSlot(cell);
    return useAndClose(cell, { slot });
  }
  const cell = state.pages[state.page]?.cells[state.selected];
  if ( !cell ) return;
  if ( cell.upcast?.length > 1 ) {
    state.ring = { cell, options: cell.upcast, selected: 0 };
    return publish();
  }
  const options = {};
  if ( cell.upcast?.length === 1 ) options.slot = defaultSlot(cell);
  if ( cell.hand !== undefined ) options.hand = cell.hand;
  return useAndClose(cell, options);
}

function useAndClose(cell, options) {
  close();
  ui.use(cell.ref, options);
}

function onPadFrame(frame) {
  if ( !frame.id ) {
    if ( state ) close();
    return;
  }
  for ( const e of frame.events ) {
    if ( !state ) {
      if ( e.type !== "press" || e.consumed ) continue;
      if ( e.button === "lb" || e.button === "rb" ) { e.consumed = true; open(); }
      continue;
    }
    // Roue ouverte : elle garde tous les boutons pour elle (ni clic, ni Échap, ni fin de tour derrière).
    e.consumed = true;
    if ( e.type !== "press" ) continue;
    switch ( e.button ) {
      case "a": activate(); break;
      case "b":
        if ( state.ring ) { state.ring = null; publish(); }
        else close();
        break;
      case "lb": if ( !state.ring ) turnPage(-1); break;
      case "rb": if ( !state.ring ) turnPage(1); break;
    }
  }
  if ( !state ) return;
  // Visée au stick gauche : dans l'anneau des niveaux, ou parmi les cases de la page.
  const count = state.ring ? state.ring.options.length : (state.pages[state.page]?.cells.length ?? 0);
  const sector = sectorOf(frame.left, count);
  if ( sector === null ) return;
  if ( state.ring ) {
    if ( sector !== state.ring.selected ) { state.ring.selected = sector; publish(); }
  } else if ( sector !== state.selected ) {
    state.selected = sector;
    publish();
  }
}

export function start() {
  off ??= onFrame(onPadFrame);
}

export function stop() {
  close();
  off?.();
  off = null;
}
