# Out of line

A leaf-green ant-routing game with articulated ants, a live escape meter, and six illustrated tools. Break the trail and help every ant leave the garden.

- [Play](https://ofjrobj.github.io/ant-archaeology-fieldbook/)
- [Edit in your browser](https://github.dev/ofjrobj/ant-archaeology-fieldbook)
- [Repository](https://github.com/ofjrobj/ant-archaeology-fieldbook)

## Play

Choose a tool and experiment on the field:

| Tool   | Action                                  |
| ------ | --------------------------------------- |
| Chalk  | Draw walls to redirect the ants.        |
| Pebble | Place an obstacle in their way.         |
| Lemon  | Place a scent that repels nearby ants.  |
| Sugar  | Gather ants around a sweet spot.        |
| Scent  | Draw a directional lure toward an edge. |
| Breeze | Hold to blow the ants along.            |

Use the eraser to remove a tool, clear tools to empty the field, or restart. Pause at any time or switch to fullscreen for a larger playing field. All four edges are exits. You win when all 120 ants leave.

## Edit with a live preview

Requires Node.js 18 or newer. No package installation is needed.

```sh
npm run dev
```

Open `http://localhost:4173` beside your editor. Saving any game source file automatically refreshes the preview. Use `npm run dev -- --port 4174` if the default port is busy. Press `Ctrl+C` to stop.

| File            | What to edit                                         |
| --------------- | ---------------------------------------------------- |
| `index.html`    | Page structure and controls                          |
| `style.css`     | Layout, typography, and colors                       |
| `story.js`      | Game configuration and interface copy                |
| `art.js`        | Ants, tools, and field illustrations                 |
| `simulation.js` | Ant movement, tool interactions, and exit rules      |
| `game.js`       | Canvas rendering, pointer input, and interface state |

## Check and build

```sh
npm run check
npm test
npm run build
```

The checks validate JavaScript syntax and local asset references. The simulation tests cover idle behavior, tool effects, a playable route to the exit, and reset. The build creates static files in `dist/` and an offline, self-contained `dist/standalone.html`. Edit the source files, rather than generated copies.

## Publish changes

GitHub Pages serves the root of the `main` branch. Commit and push your source changes to update the same play link; publication can take a few minutes. You can also press `.` on the repository page to edit and commit in GitHub's web editor.

```sh
git add index.html style.css story.js art.js simulation.js game.js
git commit -m "Update the game"
git push
```

There is no compilation step for GitHub Pages. `.nojekyll` keeps the static files intact; the local build is for separate deployment or offline sharing. Live reload is injected only by the local development server.

## Inspiration

Inspired by J Yoon's [How to Win a Fight Against Ants](https://undecember27.wpcomstaging.com/web-based-work/ants/). No account, external fonts, images, or game server are required.
