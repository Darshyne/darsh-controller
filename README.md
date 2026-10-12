# DAS · Controller (`darsh-controller`)

[![Tests](https://github.com/Darshyne/darsh-controller/actions/workflows/tests.yml/badge.svg)](https://github.com/Darshyne/darsh-controller/actions/workflows/tests.yml)

**[Website](https://darshyne.github.io)** · **[Discord](https://discord.gg/PDSq8dYdTP)** (questions, bugs, ideas)

Part of **Darshyne's Automation Suite (DAS)**. Play **Foundry VTT V14** and **dnd5e 6.x** with a **gamepad**, with controls
modelled on the console version of *Baldur's Gate 3*. **Alpha**: Xbox controller on Windows first, PlayStation later.

## Controls

| Button | Action |
|---|---|
| Left stick | **walk your character** cell by cell (8 directions, fluid while held), through the [`dnd5e-combat`](https://github.com/Darshyne/dnd5e-combat) engine's path: doors, occupied cells, opportunity attacks, movement left this turn |
| Left stick click (L3) | switch between **walking** and the **selection cursor** (a hint at the top of the screen shows the current mode) |
| A / X | in cursor mode: left click (interact, hold to drag) / right click (context menu) |
| B | cancel: closes a menu or window, cancels a pending target pick or area placement — never deselects your character |
| Y (hold) | end your turn |
| LB / RB | **action wheel**: the actions of the DAS · Combat UI Bar, eight per page, LB / RB to turn pages; spells you can upcast open a ring of slot levels |
| D-pad ← / → | previous / next target: the cursor jumps from token to token |
| D-pad ↑ / ↓ | next character / action wheel on the Custom page |
| LT / RT | zoom out / in |
| Right stick | move the camera, or scroll the window under the cursor; R3: recentre (hold: highlight objects) |
| Menu | game menu |

The selection cursor **snaps** to what can be clicked (buttons, Bar cells, menu entries, tokens) and slows down over it. The
module switches to the cursor by itself when the engine waits for a target or a dialog opens (a reaction, a roll), and back to
walking afterwards. The mouse and keyboard keep working; moving the real mouse hides the gamepad cursor.

## State

**0.1.0, alpha.** Gamepad reading and a live diagnostics window (module settings → *Gamepad diagnostics*), the walking mode,
the selection cursor, the action wheel and the buttons above. Tested with a simulated gamepad in Foundry, first tries with a real Xbox controller.

The action wheel needs **DAS · Combat UI** ([`darsh-dnd-ui`](https://github.com/Darshyne/darsh-dnd-ui) ≥ 0.21.0); walking uses
the **[`dnd5e-combat`](https://github.com/Darshyne/dnd5e-combat)** engine when it is there, Foundry's own movement otherwise.
Neither of them depends on this module.

With Steam running, turn off Steam Input's *desktop configuration* for your browser, or Steam also moves the mouse with the stick.

## Installation

In Foundry (or on The Forge), *Install Module* → paste the manifest URL:

```
https://github.com/Darshyne/darsh-controller/releases/latest/download/module.json
```

From source: the Foundry module is the `module/` subfolder, to copy or link into `Data/modules/darsh-controller`. Tests:
`npm install` then `npm test`.

## For other modules

`game.modules.get("darsh-controller").api`: `frame()` (the last gamepad reading), `onFrame(fn)`, the hook
`darsh-controller.input` (one call per press, hold, repeat or release), `mode` (`get`, `set`, `toggle`), `cursor`
(`position`, `moveTo`), `wheel` (`open`, `close`, `isOpen`), `diagnostic()`.

## Translations

The module ships English and French. To add a language, copy `module/lang/en.json` to `module/lang/<code>.json`, translate the
values, and add an entry to `languages` in `module/module.json`; missing keys fall back to English.

## License

MIT. No game assets are reused: button prompts and the wheel are drawn by the module. *Baldur's Gate 3* is a trademark of
Larian Studios; this module is not affiliated with it.
