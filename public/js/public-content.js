// Public content only. Do not put private officer information or credentials here.
// Add approved partner names and local logo filenames; no API or database needed.
export const partners = [
  {
    name: "DataCamp Donates",
    logo: "/assets/partners/datacamp-donates.png",
    darkLogo: true,
  },
  // { name: 'Partner organization', logo: '/assets/partners/organization.svg' },
];
// Public leadership, officers and members are maintained in public-roster.js.
// Set to the official registration form (HTTPS). Until then, the membership CTA uses email.
export const membershipUrl = null;
// Official organizational milestones supplied by the chapter.
export const organizationTimeline = [
  {
    date: "2024",
    title: "The beginning",
    description:
      "Darryl John Cainday established AWS Learning Club – Colegio de Muntinlupa, laying the foundation for a student-led technology community.",
  },
  {
    date: "2025",
    title: "Building the foundation",
    description:
      "Leadership transitioned to Jan Christian Wagan, who led institutional formalization. AWS recognition in November marked the transition to AWS Cloud Club.",
  },
  {
    date: "2026",
    title: "An identity of our own",
    description:
      "Following formal school recognition and the April AWS rebrand, the organization officially launched in August 2026 alongside AY 2026–2027. It also earned recognition as a school-based student organization from the City of Muntinlupa (date not specified).",
  },
];

// Mascot framing: zoom = scale (1 = normal); x/y = percentage offsets of the image box.
// Positive x moves right; positive y moves down. Negative values move left/up.
// The original artwork is unchanged. Adjust each independently, then refresh.
export const mascotFraming = {
  avie: { zoom: 2, x: -13, y: 40 },
  nimbus: { zoom: 1.8, x: 18, y: 40 },
  sev: { zoom: 2, x: -16, y: 38 },
};

// Optional local cover mapping until the event image storage integration is ready.
// Keys must be real eventId values from the existing events API.
export const eventCovers = {
  // "your-event-id": "/assets/events/event-pubmat.jpg",
};
