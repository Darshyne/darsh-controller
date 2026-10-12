import { describe, it, expect } from "vitest";
import { BUTTONS, DEFAULTS, stick, createState, step, choosePad } from "../module/scripts/core/pad.mjs";

/** Instantané au mapping standard avec les boutons donnés enfoncés (et `values` pour l'analogique). */
function snap(down = [], { axes = [0, 0, 0, 0], values = {} } = {}) {
  return {
    buttons: BUTTONS.map(b => {
      const value = values[b] ?? (down.includes(b) ? 1 : 0);
      return { pressed: value > 0, value };
    }),
    axes
  };
}
const types = frame => frame.events.map(e => `${e.type}:${e.button}`);

describe("stick", () => {
  it("ignore la zone morte", () => {
    expect(stick(0.1, -0.1, 0.2)).toEqual({ x: 0, y: 0, magnitude: 0, angle: null });
  });
  it("repart de 0 à la sortie de la zone morte et vaut 1 au bord", () => {
    expect(stick(0.21, 0, 0.2).magnitude).toBeLessThan(0.02);
    expect(stick(1, 0, 0.2).magnitude).toBe(1);
    expect(stick(1, 1, 0.2).magnitude).toBe(1);
  });
  it("garde la direction et donne l'angle (y vers le bas)", () => {
    const s = stick(0, 1, 0.2);
    expect(s.x).toBeCloseTo(0);
    expect(s.y).toBeCloseTo(1);
    expect(s.angle).toBeCloseTo(Math.PI / 2);
  });
  it("tolère des axes absents ou invalides", () => {
    expect(stick(undefined, undefined).magnitude).toBe(0);
    expect(stick(NaN, 0).magnitude).toBe(0);
  });
});

describe("step", () => {
  it("appui, puis relâchement court = tap", () => {
    const st = createState();
    expect(types(step(st, snap(["a"]), 0))).toEqual(["press:a"]);
    expect(types(step(st, snap(["a"]), 100))).toEqual([]);
    const up = step(st, snap([]), 150);
    expect(up.events).toEqual([{ type: "release", button: "a", duration: 150, tap: true }]);
  });

  it("maintien une seule fois, et le relâchement n'est plus un tap", () => {
    const st = createState();
    step(st, snap(["menu"]), 0);
    expect(types(step(st, snap(["menu"]), DEFAULTS.holdMs))).toEqual(["hold:menu"]);
    expect(types(step(st, snap(["menu"]), DEFAULTS.holdMs + 500))).toEqual([]);
    expect(step(st, snap([]), 2000).events[0]).toMatchObject({ type: "release", tap: false });
  });

  it("la croix se répète, les autres boutons non", () => {
    const st = createState();
    step(st, snap(["right", "a"]), 0);
    const t = DEFAULTS.repeatDelayMs;
    const repeats = now => types(step(st, snap(["right", "a"]), now)).filter(e => e.startsWith("repeat"));
    expect(repeats(t)).toEqual(["repeat:right"]);
    expect(repeats(t + DEFAULTS.repeatMs - 1)).toEqual([]);
    expect(repeats(t + DEFAULTS.repeatMs)).toEqual(["repeat:right"]);
  });

  it("les gâchettes suivent leur seuil, pas le drapeau pressed", () => {
    const st = createState();
    const light = step(st, snap([], { values: { rt: 0.3 } }), 0);
    expect(light.events).toEqual([]);
    expect(light.triggers.rt).toBe(0.3);
    expect(types(step(st, snap([], { values: { rt: 0.8 } }), 10))).toEqual(["press:rt"]);
  });

  it("sans manette ni focus, tout est relâché", () => {
    const st = createState();
    step(st, snap(["a", "lb"]), 0);
    const frame = step(st, null, 50);
    expect(types(frame).sort()).toEqual(["release:a", "release:lb"]);
    expect(frame.pressed.size).toBe(0);
    expect(frame.left.magnitude).toBe(0);
  });

  it("lit les deux sticks", () => {
    const frame = step(createState(), snap([], { axes: [1, 0, 0, -1] }), 0);
    expect(frame.left.x).toBeCloseTo(1);
    expect(frame.right.y).toBeCloseTo(-1);
  });
});

describe("choosePad", () => {
  const pads = [null, { id: "Steam Virtual Gamepad", mapping: "" }, { id: "Xbox Wireless Controller", mapping: "standard" }];
  it("préfère celle demandée", () => expect(choosePad(pads, "Steam Virtual Gamepad").id).toBe("Steam Virtual Gamepad"));
  it("sinon la première standard", () => expect(choosePad(pads).id).toBe("Xbox Wireless Controller"));
  it("sinon la première, sinon null", () => {
    expect(choosePad([null, { id: "x", mapping: "" }]).id).toBe("x");
    expect(choosePad([null, null])).toBeNull();
    expect(choosePad(undefined)).toBeNull();
  });
});
