# AWSSBG-CDM V25 — complete project

## Run

Use Node.js 20 or newer. Extract the ZIP, open the `awssbg-cdm-website` folder, then run `node server.js`. Open http://localhost:3000/. The existing admin browser bundles are included. For development, `npm install` then `npm run dev` rebuilds the admin authentication bundles. AWS configuration is unchanged.

## 1. Turn pages or sections on and off

Edit `public/js/site-config.js`. The commented file contains two objects. `true` shows a page or section; `false` hides it. Directors and Officers are initially off because the approved roster is empty; change both to `true` after entering real profiles. Home always stays available.

```js
export const pages = {
  about: true, events: true, directors: false, officers: false,
  partners: true, contact: true,
};
export const sections = {
  about: true, mascots: true, events: true, partners: true,
  join: true, members: true,
};
```

Page switches hide navigation/footer/CTA links to that page and show a coming-soon notice for direct visits. The Events and Partners page switches also hide the corresponding Home section; section switches can independently hide Home content while leaving its page available. The members switch controls the optional Members section below Officers. Save and reload. These are display settings, not access control: public assets remain accessible by URL. Do not put private data in the project’s public folder. There is no sample-content mode or preview query string anymore.

## 2. Add directors, officers and members

Put approved 3:4 portrait images (900 × 1200 or 1200 × 1600) inside `public/assets/people/`. Crop photos before adding so faces are already centered. Edit `public/js/public-roster.js`. Uncomment or replace the commented examples and add the real name, position, image path and office where applicable. Example syntax (not active data):

```js
export const directors = [
  { name: "Full name", position: "Executive Director", roleGroup: "lead", image: "/assets/people/executive.jpg" },
  { name: "Full name", position: "Deputy Director", roleGroup: "lead", image: "/assets/people/deputy.jpg" },
  { name: "Full name", position: "Finance Director", roleGroup: "board", image: "/assets/people/finance.jpg" },
  { name: "Full name", position: "Assistant Finance Director", roleGroup: "associate", image: "/assets/people/assistant-finance.jpg" },
];
export const officers = [
  { name: "Full name", office: "Technology Office", position: "Web Developer", image: "/assets/people/officer.jpg" },
];
export const members = [
  { name: "Full name", position: "Member", image: "/assets/people/member.jpg" },
];
```

Use matching office names to group officers. Optional `focalX: "50%", focalY: "35%"` sets the crop position; omit for centered 3:4 photos. Only Executive and Deputy Directors receive hover labels. These public lists are entirely manual and independent of the authenticated admin database. Publish only consented information.

## 3. Other manually managed content

`public/js/public-content.js` contains the partner list, membership registration URL, timeline, mascot framing, and optional event-cover mapping. Add partner logos under `public/assets/partners/` and add `{ name: "Organization", logo: "/assets/partners/logo.png" }` to the partners array. DataCamp Donates is already configured. Set `membershipUrl` to the official HTTPS registration form when available; email remains the fallback. The mascot framing values remain exactly those supplied in V24; adjust zoom (scale), x (right/left %) and y (down/up %) in `mascotFraming` if necessary. Nimbus remains a silhouette.

## 4. Events and the required admin pubmat

Open Admin Portal > Registration & Events > Create event. Select a JPG, PNG or WebP image before saving a new draft or publishing. The image must decode successfully, be no larger than 10 MB, and have exactly a 16:9 ratio (1920 × 1080 recommended). A square or portrait file is rejected. A valid existing image can satisfy the requirement when editing an event if the API already returns a usable cover URL. Selected files are displayed locally in the form, and can be removed or replaced.

**Storage is not connected.** The existing authenticated events API request remains unchanged and saves event metadata only. After a valid new file is selected, the administrator must explicitly confirm whether to save the event details without the image. Cancelling that confirmation leaves the form open. The file is not uploaded or persisted, and a successful metadata save does not mean the pubmat is stored. There is no base64 image data sent to DynamoDB. The requirement is a frontend check, not yet enforced by the backend.

Until the storage integration is implemented, you may manually put approved event covers in `public/assets/events/` and map their real event IDs in `public/js/public-content.js`:

```js
export const eventCovers = {
  "actual-event-id": "/assets/events/actual-event-cover.jpg",
};
```

The public events page continues to load only published records from the existing API. Its cover priority is the manual map, then API cover URL, then the existing winter illustration if no usable image is available. No sample events are generated. For future AWS integration, upload image bytes to S3 or another appropriate object store via an authorized upload endpoint, store the image URL/key in DynamoDB and return it through the published event API. Validate file type, ratio and size on the server as well. No AWS resources or backend contracts were changed in V25.

## 5. Visual behavior

The mascot hover overlay covers the whole card with each character’s themed color, fading smoothly in/out. Focus and tap also reveal descriptions. All main public routes share the animated stars, clouds, sun and moon through `public/js/shared-sky.js`; the homepage retains its mountain and tree parallax. The existing soft theme wave remains separate from page navigation. Same-origin cross-document View Transitions are used when supported; otherwise the page loads normally with a light entrance effect where supported. Reduced-motion and Pause Motion are retained. Login/callback keep their existing Polar scenery. The authenticated admin dashboard itself retains its functional dashboard styling.
