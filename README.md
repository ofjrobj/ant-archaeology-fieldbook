# Out of line

An interactive living leaf. Guide a population of 2,000 ants with six dimensional tools while the surface slowly moves and changes color with crowding.

- [Play](https://ofjrobj.github.io/ant-archaeology-fieldbook/)
- [Edit in your browser](https://github.dev/ofjrobj/ant-archaeology-fieldbook)
- [Repository](https://github.com/ofjrobj/ant-archaeology-fieldbook)

## Play

Choose a tool and experiment on the field:

| Tool   | Action                                              |
| ------ | --------------------------------------------------- |
| Twig   | Lay a physical barrier across the trail.            |
| Pebble | Place an obstacle in their way.                     |
| Sugar  | Attract a few nearby ants to a small treat.         |
| Honey  | Lure part of the nearby group toward a sweet drop.  |
| Cup    | Cover a group, drag to any edge, release outside.   |
| Brush  | Drag to gently sweep nearby ants in that direction. |

Every visit opens an empty leaf with no ants or placed tools. Press **Begin** when ready; the game does not run while you are looking at the opening screen. Restart returns to that empty screen. A previous round is not automatically restored.

The cup captures only ants underneath when you press; a card slides beneath them for transport. Release on the leaf to put them back. Pause, Escape, or switching tools safely puts a held group down. On a keyboard, use Enter to cover, arrows to carry, and Enter to release.

Start with zero ants. Five arrive per second from the edges, one sixth of the previous arrival rate, until all 2,000 have entered. All four screen edges are exits.

Food is a local lure, not a colony-wide command. Only some ants respond: sugar reaches 110 simulation units and attracts up to 45 ants; honey reaches 150 units and attracts up to 70. Other ants continue on their way. These limits apply per bait.

- All 2,000 on the leaf at once: lose.
- All 2,000 outside at once: win.
- Each escaped ant returns after 60 seconds of active play.

Pause stops the simulation and leaf movement. The leaf gradually warms from green toward ochre and red as the active population rises above 500. Clearing tools preserves the population; restarting begins a fresh round. Gather with sugar or honey, then carry the group out with the cup. Ants carried out have the same 60-second return delay as ants that walk out.

## Observation references

The tools draw on [NC State's classroom Ant Picnic](https://studentsdiscover.org/lesson/ant-picnic/) (food baits), [Texas A&M's cup-and-card technique](https://citybugs.tamu.edu/2012/06/12/a-simple-technique-for-insect-removal/) (cover, slide a card underneath, carry outside), and [Cornell's small-invertebrate observation activity](https://www.css.cornell.edu/cwmi/compost/macroinvertebrates.html) (a soft paintbrush for moving small animals). Attraction distances, the brush's steering strength, and population timing are game rules, not measurements of real ant behavior. Twigs and pebbles work as physical barriers; the game no longer presents chalk or lemon as guaranteed repellents.

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
| `art.js`        | Ants, tools, and field rendering                     |
| `simulation.js` | Ant movement, tool interactions, and exit rules      |
| `game.js`       | Canvas rendering, pointer input, and interface state |

The leaf painting, transparent 3D tool renders, and bundled book fonts live in `assets/`. Replace the images to change the scenery or materials. The dev server watches asset changes too. Typography and its subtle engraved highlights are controlled in `style.css`.

## Check and build

```sh
npm run check
npm test
npm run build
```

The checks validate JavaScript syntax and local asset references. The simulation tests cover empty starts, slow arrivals, limited food attraction, cup movement, 60-second returns, and win/loss conditions. The build creates static files in `dist/` and an offline, self-contained `dist/standalone.html`. Edit the source files, rather than generated copies.

## Publish changes

GitHub Pages serves the root of the `main` branch. Commit and push your source changes to update the same play link; publication can take a few minutes. You can also press `.` on the repository page to edit and commit in GitHub's web editor.

```sh
git add index.html style.css story.js art.js simulation.js game.js
git commit -m "Update the game"
git push
```

There is no compilation step for GitHub Pages. `.nojekyll` keeps the static files intact; the local build is for separate deployment or offline sharing. Live reload is injected only by the local development server.

## Inspiration

Inspired by J Yoon's [How to Win a Fight Against Ants](https://undecember27.wpcomstaging.com/web-based-work/ants/). The leaf and tool images were created for this game with the built-in image generation tool. All artwork and fonts are bundled locally; no account, external font requests, or game server are required.

Titles and tool labels use [IM Fell English](https://github.com/google/fonts/tree/main/ofl/imfellenglish) and [IM Fell English SC](https://github.com/google/fonts/tree/main/ofl/imfellenglishsc), licensed under the SIL Open Font License. Full licenses are included beside the fonts in `assets/` and in the offline build.
