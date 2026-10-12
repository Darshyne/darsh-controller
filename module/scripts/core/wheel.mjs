/**
 * Géométrie pure de la roue d'actions (SPEC §5, étape 3) : découpage des pages de la Barre en pages de roue, secteur visé par
 * le stick, position des cases sur le cercle. Secteur 0 en haut, puis dans le sens des aiguilles d'une montre.
 */

/** Cases par page de roue (BG3 : huit). */
export const PAGE_SIZE = 8;

/** Inclinaison minimale du stick pour viser un secteur (sinon la sélection reste où elle était). */
export const AIM_THRESHOLD = 0.5;

/**
 * Pages de la Barre `[{ tab, label, cells }]` → pages de roue `[{ tab, label, part, parts, cells }]`, au plus `size` cases
 * chacune (une page de 20 cases donne 3 parties).
 */
export function paginate(pages, size = PAGE_SIZE) {
  const out = [];
  for ( const page of pages ?? [] ) {
    const cells = (page.cells ?? []).filter(Boolean);
    const parts = Math.ceil(cells.length / size);
    for ( let p = 0; p < parts; p++ ) {
      out.push({ tab: page.tab, label: page.label, part: p + 1, parts, cells: cells.slice(p * size, (p + 1) * size) });
    }
  }
  return out;
}

/**
 * Le secteur visé par un stick (lu par core/pad.mjs#stick : y vers le bas) parmi `count`, ou null s'il n'est pas assez incliné.
 */
export function sectorOf(stick, count, threshold = AIM_THRESHOLD) {
  if ( !count || !stick || (stick.magnitude ?? 0) < threshold ) return null;
  let angle = Math.atan2(stick.x, -stick.y);           // 0 = haut, sens horaire
  if ( angle < 0 ) angle += 2 * Math.PI;
  return Math.round(angle / (2 * Math.PI / count)) % count;
}

/** Position (px, centre de la roue = 0,0) de la case `index` parmi `count`, sur un cercle de rayon `radius`. */
export function slotPosition(index, count, radius) {
  const angle = index * 2 * Math.PI / count;
  return { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius };
}

/** Page suivante / précédente, en boucle. */
export const cycle = (index, delta, count) => count ? ((index + delta) % count + count) % count : 0;

/** Le niveau d'emplacement par défaut d'un sort surchargeable : le premier proposé (le plus bas disponible). */
export const defaultSlot = cell => cell?.upcast?.[0]?.key ?? null;
