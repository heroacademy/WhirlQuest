# WhirlQuest — Hero Academy instructions

This is one game in the wider Hero Academy ecosystem. Preserve its child-friendly, accessible experience and the interoperability standards of Hero Academy.

## Product and visual identity

- Hero Academy brand: cream backgrounds, deep teal framing and typography, muted greens, orange actions, golden rewards, rounded illustrations, and Pip as a supportive companion.
- UK English; favour illustrated, short instructions. Controls must be usable on mobile, tablet and keyboard without precision dragging.
- Support gentle practice, freely selectable levels, unlimited retries, optional sound and reduced motion. Never introduce ads, gambling, purchases, coercive streaks or punitive rewards.
- The 3D-style canvas is a depth-projected scene, not a full WebGL engine. Avoid heavy network or rendering dependencies unless there is a demonstrated performance need.

## Progress, identity and privacy

- Keep local browser profiles, saved progress and backup import/export working through upgrades.
- Never require a child email address. Treat ChoreQuest / the Hero Academy hub as the authority for verified family membership, child selection and permissions.
- Use the approved `dist/academy-client.js` adapter. Do not invent login redirects, tokens or endpoints.
- Keep in-game Hero stars separate from chore points, allowances, monetary balances and non-financial shared XP.
- Do not publish an unverified cross-origin authentication flow or store secrets in static assets.

## Implementation and release

- The game is static and hosted from `dist/`, compatible with GitHub Pages.
- Test with `node --test tests/*.test.mjs`; check syntax after JavaScript changes.
- The GitHub Pages workflow should publish only after tests pass. Keep any custom domain configuration separate until DNS and the account-adapter origin are verified.
- Preserve existing functionality and user saves when making enhancements, and document any migrations.
