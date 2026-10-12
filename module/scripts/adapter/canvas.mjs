/**
 * La toile : panoramique, zoom, recentrage, tokens. Passe par l'API du cœur (client/canvas/board.mjs:1756 `pan`, qui borne
 * l'échelle et la position ; :1802 `animatePan`).
 */

export const ready = () => !!canvas?.ready;

/** La vue de la toile (l'élément `<canvas>` de PIXI). */
export const isBoard = el => ready() && el === canvas.app.view;

/** Décale la vue d'un déplacement en pixels d'écran. */
export function panBy(dx, dy) {
  if ( !ready() || (!dx && !dy) ) return;
  const scale = canvas.stage.scale.x;
  canvas.pan({ x: canvas.stage.pivot.x + dx / scale, y: canvas.stage.pivot.y + dy / scale });
}

/** Multiplie l'échelle en gardant fixe le point de la toile sous (x, y) écran. */
export function zoomAt(factor, x, y) {
  if ( !ready() || factor === 1 ) return;
  const before = canvas.canvasCoordinatesFromClient({ x, y });
  canvas.pan({ scale: canvas.stage.scale.x * factor });
  const after = canvas.canvasCoordinatesFromClient({ x, y });
  canvas.pan({ x: canvas.stage.pivot.x + before.x - after.x, y: canvas.stage.pivot.y + before.y - after.y });
}

/** Le token que le joueur pilote : le premier contrôlé qu'il possède, sinon celui de son personnage. */
export function myToken() {
  if ( !ready() ) return null;
  return canvas.tokens.controlled.find(t => t.isOwner)
    ?? game.user.character?.getActiveTokens()?.find(t => t.isOwner) ?? null;
}

/** Recentre sur le token piloté. */
export function recenter() {
  const token = myToken();
  if ( token ) canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
}

/** Position écran du centre d'un token. */
export const screenOf = token => canvas.clientCoordinatesFromCanvas(token.center);

/** Garde le token dans la partie centrale de l'écran (`margin` = part de l'écran de chaque côté). */
export function keepInView(token, margin = 0.25) {
  if ( !ready() || !token ) return;
  const p = screenOf(token);
  const w = window.innerWidth;
  const h = window.innerHeight;
  if ( p.x < w * margin || p.x > w * (1 - margin) || p.y < h * margin || p.y > h * (1 - margin) ) {
    canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 300 });
  }
}

/** Case (offset de grille) du coin haut-gauche du token, comme le moteur (`cellOf`, centre de la première case). */
export function cellOf(token) {
  const grid = canvas.grid;
  const src = token.document._source;
  return grid.getOffset({ x: src.x + grid.sizeX / 2, y: src.y + grid.sizeY / 2 });
}

/** Les tokens visibles, en rectangles écran (aimant du curseur, cycle de cibles). */
export function visibleTokens() {
  if ( !ready() ) return [];
  return canvas.tokens.placeables.filter(t => t.visible && t.renderable !== false).map(t => {
    const a = canvas.clientCoordinatesFromCanvas({ x: t.bounds.left, y: t.bounds.top });
    const b = canvas.clientCoordinatesFromCanvas({ x: t.bounds.right, y: t.bounds.bottom });
    return { token: t, rect: { left: a.x, top: a.y, right: b.x, bottom: b.y } };
  });
}

/** Le jeton contrôlé suivant parmi ceux que possède le joueur (BG3 : gérer le groupe). */
export function controlNextOwned(delta = 1) {
  if ( !ready() ) return null;
  const mine = canvas.tokens.placeables.filter(t => t.isOwner && t.actor?.hasPlayerOwner !== false && t.visible);
  if ( !mine.length ) return null;
  const current = mine.indexOf(canvas.tokens.controlled[0]);
  const next = mine[((current + delta) % mine.length + mine.length) % mine.length];
  next.control({ releaseOthers: true });
  canvas.animatePan({ x: next.center.x, y: next.center.y, duration: 250 });
  return next;
}

/**
 * Un pas d'une case à la suivante est-il bloqué pour la marche au stick ? Mur de déplacement entre les deux centres (le
 * moteur contournerait l'obstacle : au stick, on s'arrête devant), ou case hors de la scène.
 */
export function stepBlocked(from, to) {
  const grid = canvas.grid;
  const a = grid.getCenterPoint(from);
  const b = grid.getCenterPoint(to);
  if ( !canvas.dimensions.sceneRect.contains(b.x, b.y) ) return true;
  return CONFIG.Canvas.polygonBackends.move.testCollision(a, b, { type: "move", mode: "any" });
}
