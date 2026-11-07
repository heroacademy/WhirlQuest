# WhirlQuest: Skybound Adventures — Hero Academy

An original, child-friendly one-tap arcade adventure inspired by the broad flip-and-collect genre. Pip and the player ride a magical leaf through three themed worlds; they collect colourful treasures, dodge storm clouds and choose arithmetic reward paths. This repository is `heroacademy/WhirlQuest`, with `whirlquest.heroacademy.app` proposed as its permanent home.

## Run locally

Serve `dist/` through any static HTTP server (ES modules require HTTP), e.g. `npx serve dist`, or deploy the directory as a static website. There are no runtime package dependencies, advertising, tracking or payments. Local play works without signing in or making network requests. The optional shared Academy adapter uses the authorised Hero Academy service when connected from a registered origin.

Run the logic tests with `node --test tests/*.test.mjs`.

## Gameplay and features

- Tap/click/Space to flip the magical leaf; one extra mid-air flip per jump.
- A lightweight depth-projected 3D-style world with perspective track, dimensional foliage, shaded fruit, split-slice animations, island castles and parallax scenery. Canvas-based, with no network dependency or heavy 3D runtime.
- Fifteen freely selectable trails in Mellow Meadows, Cloudberry Coast and Starfall Skies.
- Procedural but deterministic treasure and storm-cloud placements per trail.
- Bonus stars for consecutive slices; reward arithmetic at the rainbow gate (addition or multiplication).
- Practice flight without hazards, unlimited retries without penalty, optional muted sounds by default.
- Touch-first layout, browser profile switching, personal bests, completion, Hero stars, backup export/import, reduced-motion CSS.
- UK English and no required reading-intensive tutorial.

## Hero Academy and ChoreQuest integration

This game preserves progress in the browser even without an account. It links to the Hero Academy hub and ChoreQuest, and includes an optional Academy adapter. The adapter's production origin and game registration must be verified and enabled before shared sign-in, cloud progress and activity reporting can be considered live. Local Hero stars are **not** spendable ChoreQuest points.

To finalise shared sign-in and cross-device syncing, verify the existing Hero Academy API contract and permitted callback origins. The production integration must:

1. Authenticate the parent in the existing ChoreQuest flow, then select child profiles without demanding child email addresses.
2. Scope every cloud read/write to a verified household and child in the backend; no secrets in static HTML.
3. Report idempotent level-completion and usage summary events to the shared API, with offline retries.
4. Keep non-redeemable game stars separate from pocket money, chore points and earned allowances.
5. Respect parent permissions and preserve offline local save/backups when disconnected.

Do not create unverified OAuth redirects or API calls. The temporary private Site used the legacy registration key `skyslicer`; coordinate a deliberate migration to the `whirlquest` game key in the central catalogue before enabling shared sync at the final public domain.

## Deployment

The `Test and deploy WhirlQuest` workflow tests the app and publishes the contents of `dist/` to GitHub Pages on every successful push to `main`.

1. In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
2. Check the Actions workflow for a successful deployment and open the generated GitHub Pages URL.
3. When ready for the permanent hostname, set `whirlquest.heroacademy.app` as the custom domain in Pages, configure its Cloudflare CNAME to the organisation's Pages host, and confirm HTTPS.
4. Register the exact public origin with the central Hero Academy account system and enable the game in the family catalogue before advertising cloud sync.

The domain and shared-account configuration are deliberately not assumed to be active just because the repository deploys.

## Product direction

This is deliberately not a reproduction of Slice Master: enchanted-leaf flight rather than knives, Pip as a companion, three distinct worlds, double-flip control, gentler hazards, practice mode, story-like level structure, optional profiles, and arithmetic decision gates. All artwork and gameplay code are original browser-native shapes.

The approved vendored Academy adapter is included, but public-origin activation is a separate release step. Local stars remain separate from non-financial shared XP.
