/**
 * Cinématique pure du curseur virtuel (SPEC §4.1) : vitesse tirée du stick, avance bornée à l'écran, défilement et
 * zoom continus. Aucun global : positions en pixels d'écran, durées en secondes.
 */

/** Courbe de réponse : faible inclinaison = précision, pleine inclinaison = vitesse maximale. */
export const CURVE = 1.8;

/** Vitesse (px/s) pour un stick lu par core/pad.mjs#stick. */
export function velocity(stick, speed) {
  if ( !stick?.magnitude ) return { x: 0, y: 0 };
  const k = speed * Math.pow(stick.magnitude, CURVE) / stick.magnitude;
  return { x: stick.x * k, y: stick.y * k };
}

/** Nouvelle position après `dt` secondes, bornée à `[0, width-1] × [0, height-1]`. */
export function advance(pos, stick, dt, speed, { width, height }) {
  const v = velocity(stick, speed);
  return {
    x: Math.min(Math.max(pos.x + v.x * dt, 0), Math.max(width - 1, 0)),
    y: Math.min(Math.max(pos.y + v.y * dt, 0), Math.max(height - 1, 0))
  };
}

/** Déplacement (px) d'un défilement ou d'un panoramique pendant `dt`. */
export function delta(stick, dt, speed) {
  const v = velocity(stick, speed);
  return { x: v.x * dt, y: v.y * dt };
}

/**
 * Facteur de zoom pendant `dt` : RT rapproche, LT éloigne, proportionnellement à l'enfoncement au-delà du seuil.
 * `rate` = facteur par seconde à fond (2 = double l'échelle en une seconde).
 */
export function zoomFactor({ lt = 0, rt = 0 }, dt, rate = 2, threshold = 0.1) {
  const push = v => v > threshold ? (v - threshold) / (1 - threshold) : 0;
  const amount = push(rt) - push(lt);
  return amount ? Math.pow(rate, amount * dt) : 1;
}

/** Masque `buttons` d'un MouseEvent pour les boutons enfoncés (0 gauche, 2 droit). */
export function buttonsMask(down) {
  let mask = 0;
  if ( down.has(0) ) mask |= 1;
  if ( down.has(2) ) mask |= 2;
  return mask;
}

/** Double clic : même bouton, assez tôt et assez près du précédent. Renvoie le compte de clics (1, 2…). */
export function clickCount(previous, click, { delayMs = 500, distance = 6 } = {}) {
  if ( !previous || previous.button !== click.button ) return 1;
  if ( click.time - previous.time > delayMs ) return 1;
  if ( Math.hypot(click.x - previous.x, click.y - previous.y) > distance ) return 1;
  return previous.count + 1;
}

/* -------------------------------------------- */
/*  Aimant (demande de l'utilisateur, 2026-10-12 : « sans magnétisme c'est dur de viser »)
/* -------------------------------------------- */

/** Vitesse du curseur au-dessus d'une cible (bouton, case, entrée de menu, token) : il « colle ». */
export const FRICTION = 0.4;

/** Rayon (px) dans lequel une cible attire le curseur au repos. */
export const MAGNET_RADIUS = 40;

/** Distance d'un point à un rectangle `{left, top, right, bottom}` (0 dedans). */
export function distanceToRect(p, r) {
  const dx = Math.max(r.left - p.x, 0, p.x - r.right);
  const dy = Math.max(r.top - p.y, 0, p.y - r.bottom);
  return Math.hypot(dx, dy);
}

/** La cible la plus proche du point parmi des rectangles, à moins de `radius` : `{ rect, center, distance }` ou null. */
export function nearestTarget(p, rects, radius = MAGNET_RADIUS) {
  let best = null;
  for ( const rect of rects ?? [] ) {
    const distance = distanceToRect(p, rect);
    if ( distance > radius ) continue;
    const center = { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
    // À égalité (deux cibles qui contiennent le point), la plus proche par son centre.
    const tie = Math.hypot(center.x - p.x, center.y - p.y);
    if ( !best || distance < best.distance || (distance === best.distance && tie < best.tie) ) best = { rect, center, distance, tie };
  }
  return best && { rect: best.rect, center: best.center, distance: best.distance };
}

/** Rapproche `pos` de `center` (amorti : ~95 % du chemin en 3/strength secondes). */
export function attract(pos, center, dt, strength = 14) {
  const k = 1 - Math.exp(-strength * dt);
  return { x: pos.x + (center.x - pos.x) * k, y: pos.y + (center.y - pos.y) * k };
}
