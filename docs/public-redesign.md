# Public redesign v5 — Polar

Home includes About, Our Values and Partners (when available). Events and People have dedicated pages; contact and discreet admin access are in the shared footer. Legacy about, values, partners, contact and join URLs redirect to home anchors. No admin or backend changes.

## Preview
Run `npm install` and `npm run dev` (or `node server.js` for public-only preview). Open `http://localhost:3000/?preview=1` to enable explicitly labeled sample officers, partners and fallback events for the current browser tab. Exit via the preview banner/footer or `/?preview=0`. By default no sample content is shown. The preview flag does not authenticate or authorize anything.

## Content
Add approved partner logos under `public/assets/partners/` and add `{name, logo}` entries in `public/js/public-content.js`. Set `publicOfficersUrl` only to an intentionally public endpoint returning published public records or add approved local officers. Do not expose private records. Existing published event API retained. Event covers should be 1920 x 1080 pixels; other sizes are contained without distortion. If no usable cover exists, original polar illustration is used, not an official event poster. Event text overlays the image; long details scroll within the overlay and are also accessible in the details dialog.

## Design references
The supplied CodePen archives were inspected. Original implementation inspired by the fog/snow layers in [Fargo 404](https://codepen.io/nw/pen/WQmxYY), randomized snowfall in [HTML and CSS Snow Falling](https://codepen.io/kyoyababa/pen/OWJaoB), and image/foreground layering in [Parallax Depth Cards](https://codepen.io/andymerskin/pen/XNMWvQ). No copied source or external dependencies. No parallax applied to event cards.

Organization reference: https://www.meetup.com/aws-sbg-at-colegio-de-muntinlupa/ . Existing social URLs retained; verify Facebook before publication.

### Polar V8
The home hero is a full-viewport stage with cropped-to-content versions of the supplied Avie (pink) and Sev (green) PNGs. `public/js/polar.js` reads the `data-depth` values on the decorative layers for eased pointer and scroll parallax. Snowfall continues on a separate overlay; the headline and buttons do not move with the scenery. Reduced motion and the footer Pause motion control disable parallax. The sun and crescent moon respond to the current theme. The contact card is on the homepage; the opaque full-width footer has a separate credits row shared across public pages. Existing event and preview-mode behavior is retained.

### V9 winter refinements
- The hero headline is accessible text accompanied by original vector lettering with snow caps derived from its letter silhouettes. It reads “Build something that matters.” The four core values remain in the Values section.
- Daytime cloud drift, nighttime twinkling stars, snowfall, parallax, and a feathered foreground transition; reduced motion and Pause motion are respected. Avie and Sev are retained as assets but no longer shown in the hero.
- Contact email is now the actual email CTA, rather than a second standalone link; Collaborate uses a people icon.
- Technique references: https://codepen.io/Twibbr/pen/zMzaGV (snow text), https://codepen.io/cssmfcpro/pen/PoGKPMv (winter scene), https://codepen.io/ck/pen/nbzNym (night sky). Original implementation.
