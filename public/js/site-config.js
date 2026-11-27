// Loaded synchronously in the document head to prevent hidden links flashing.
(() => {
  // PUBLIC WEBSITE VISIBILITY — true = visible; false = hidden.
  // These controls hide links/sections and show a coming-soon notice on direct visits.
  // They are not authentication or protection for private data.
  // Set directors/officers to true when your approved roster is ready.
  const pages = {
    about: true,
    events: true,
    directors: false,
    officers: false,
    partners: true,
    contact: true,
  };
  const sections = {
    about: true, // Who are we? on Home
    mascots: true,
    events: true, // Home carousel
    partners: true, // Home partners
    join: true, // Membership panel
    members: true, // Members within Officers
  };

  const root = document.documentElement;
  const enabled = (config) =>
    Object.keys(config)
      .filter((key) => config[key] !== false)
      .join(" ");
  root.dataset.publicPages = enabled(pages);
  root.dataset.publicSections = enabled(sections);
  globalThis.AWSSBG_SITE_CONFIG = { pages, sections };
})();
