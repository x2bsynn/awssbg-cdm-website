const API_URL =
  "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/events";

const eventList = document.getElementById("eventList");
const eventStatus = document.getElementById("eventStatus");
const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

function formatEventDate(dateValue) {
  if (!dateValue) {
    return "Date to be announced";
  }

  // Parse YYYY-MM-DD as a local calendar date to avoid
  // displaying the previous day in some time zones.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

  let date;

  if (match) {
    date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  } else {
    date = new Date(dateValue);
  }

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function createEventCard(event) {
  const card = document.createElement("article");
  card.className = "event-card";

  const top = document.createElement("div");
  top.className = "event-card-top";

  const badge = document.createElement("span");
  badge.className = "event-badge";
  badge.textContent = "Community Event";

  const calendar = document.createElement("span");
  calendar.className = "event-calendar";
  calendar.setAttribute("aria-hidden", "true");
  calendar.textContent = "✳";

  top.append(badge, calendar);

  const title = document.createElement("h3");
  title.textContent = event.title || "Untitled Event";

  const date = document.createElement("p");
  date.className = "event-meta";

  const dateIcon = document.createElement("span");
  dateIcon.className = "event-meta-icon";
  dateIcon.setAttribute("aria-hidden", "true");
  dateIcon.textContent = "◷";

  const dateText = document.createElement("span");
  dateText.className = "event-date";
  dateText.textContent = formatEventDate(event.date);

  date.append(dateIcon, dateText);

  const venue = document.createElement("p");
  venue.className = "event-meta event-venue";

  const venueIcon = document.createElement("span");
  venueIcon.className = "event-meta-icon";
  venueIcon.setAttribute("aria-hidden", "true");
  venueIcon.textContent = "⌖";

  const venueText = document.createElement("span");
  venueText.textContent = event.location || "Venue to be announced";

  venue.append(venueIcon, venueText);

  const spacer = document.createElement("div");
  spacer.className = "event-card-spacer";

  const footer = document.createElement("div");
  footer.className = "event-card-footer";
  footer.textContent = "Be part of the community →";

  card.append(top, title, date, venue, spacer, footer);

  return card;
}

function renderEvents(events) {
  eventList.replaceChildren();

  if (events.length === 0) {
    eventStatus.textContent =
      "No upcoming events at the moment. Check back soon for new activities.";

    return;
  }

  eventStatus.textContent = "";

  const fragment = document.createDocumentFragment();

  events.forEach(function (event) {
    fragment.appendChild(createEventCard(event));
  });

  eventList.appendChild(fragment);
}

async function loadEvents() {
  eventStatus.textContent = "Loading upcoming events...";
  eventList.replaceChildren();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Events API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.events)) {
      throw new Error("Unexpected response format from events API");
    }

    const publishedEvents = data.events.filter(function (event) {
      return event.status === "published";
    });

    // Sort events by date, with events that have no date last.
    publishedEvents.sort(function (a, b) {
      const dateA = a.date ? new Date(a.date).getTime() : Infinity;
      const dateB = b.date ? new Date(b.date).getTime() : Infinity;

      return dateA - dateB;
    });

    renderEvents(publishedEvents);
  } catch (error) {
    console.error("Error loading events:", error);

    eventList.replaceChildren();
    eventStatus.textContent =
      "We're having trouble loading events right now. Please try again later.";
  }
}

loadEvents();