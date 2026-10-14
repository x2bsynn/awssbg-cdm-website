const API_URL = "https://xxbmakdu4d.execute-api.us-east-1.amazonaws.com/prod/events";
const joinButton = document.getElementById("joinButton");
const message = document.getElementById("message");
const eventForm = document.getElementById("eventForm");


function showMessage(text) {
  message.textContent = text;
}

joinButton.addEventListener("click", function () {
  showMessage(
    "Thank you for joining! We look forward to seeing you at the event.",
  );
});

eventForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value.trim();
  const venue = document.getElementById("eventVenue").value.trim();

  if (!title || !date || !venue) {
    alert("Please fill in all fields to add an event.");
    return;
  }

  const newEvent = {
    title: title,
    date: date,
    venue: venue,
  };

  events.push(newEvent);
  renderEvents();
  eventForm.reset();
});

let events = [];

const eventList = document.getElementById("eventList");

async function loadEvents() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Failed to load events");
    }

    const data = await response.json();

    events = (data.events || [])
      .filter(function (event) {
        return event.status === "published";
      })
      .map(function (event) {
        return {
          title: event.title,
          date: event.date,
          venue: event.location,
        };
      });

    renderEvents();
  } catch (error) {
    console.error("Error loading events:", error);
    eventList.textContent = "Unable to load events. Please try again later.";
  }
}


function renderEvents() {
  eventList.innerHTML = "";
  events.forEach(function (event) {
    const card = document.createElement("article");
    card.className = "event-card";

    const title = document.createElement("h3");
    title.textContent = event.title;

    const date = document.createElement("p");
    const eventDate = new Date(event.date);
    const readableDate = eventDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    date.textContent = "Date: " + readableDate;

    const venue = document.createElement("p");
    venue.textContent = "Venue: " + event.venue;
    venue.hidden = true;

    const button = document.createElement("button");
    button.textContent = "Show Venue";
    button.addEventListener("click", function () {
      venue.hidden = !venue.hidden;
      button.textContent = venue.hidden ? "Show Venue" : "Hide Venue";
    });

    card.appendChild(title);
    card.appendChild(date);
    card.appendChild(venue);
    card.appendChild(button);

    eventList.appendChild(card);
  });
}
loadEvents();
