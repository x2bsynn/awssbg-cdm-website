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

const events = [
  {
    title: "AWS Workshop",
    date: "2026-11-15",
    venue: "TBA",
  },
  {
    title: "Cloud Learning Session",
    date: "2026-11-22",
    venue: "Colegio de Muntinlupa",
  },
  {
    title: "AWS Hackathon",
    date: "2026-12-05",
    venue: "TBA",
  },
  {
    title: "AWS Certification Exam",
    date: "2026-12-12",
    venue: "TBA",
  },
];

const eventList = document.getElementById("eventList");

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
renderEvents();
