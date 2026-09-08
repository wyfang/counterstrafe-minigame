# CS2 Movement Trainer

A browser minigame for practicing CS2 counter-strafing, micro-movement, and shooting rhythm.

[Play online](http://csgo.link/web/CS2-MOVEMENT-TRAINER) · [Upstream](https://github.com/crankyCS2/counterstrafe-minigame) · [简体中文](./README.md)

## Features

- A complete Simplified Chinese interface.
- A light theme and visual adjustments.
- Freestyle, TTK, Strafe Lab, Micro-Strafe, and Rhythm modes retained from upstream.
- Local statistics for movement timing, first-shot accuracy, and time to kill.

## Usage

Requires npm and Node.js 20.19+ on the 20.x release line, or Node.js 22.12+, as required by the locked Vite version.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## Notes

This branch provides localization and visual changes on top of the upstream trainer. It runs independently in the browser.

## License

This project is based on [crankyCS2/counterstrafe-minigame](https://github.com/crankyCS2/counterstrafe-minigame), distributed under the [Mozilla Public License 2.0](./LICENSE). Upstream copyright belongs to its authors and contributors; this branch's modifications are attributed in `NOTICE`. Counter-Strike content, branding, assets, and third-party dependencies remain subject to their own terms.

See [license scope](./LICENSE_SCOPE.md) for the boundaries.
