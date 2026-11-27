// Local validation only. No upload endpoint is connected yet.
export const PUBMAT_MAX_BYTES = 10 * 1024 * 1024;
const types = new Set(["image/jpeg", "image/png", "image/webp"]);
export function isLandscape16x9(width, height) {
  return (
    Number.isSafeInteger(width) &&
    Number.isSafeInteger(height) &&
    width > 0 &&
    height > 0 &&
    width * 9 === height * 16
  );
}

export function createPubmatControl() {
  const byId = (id) => document.getElementById(id);
  const input = byId("event-pubmat"),
    panel = byId("pubmat-upload");
  const preview = byId("pubmat-preview"),
    image = byId("pubmat-image"),
    empty = byId("pubmat-empty");
  const status = byId("pubmat-status"),
    remove = byId("pubmat-remove"),
    choose = byId("pubmat-choose");
  const chooseLabel = byId("pubmat-choose-label"),
    fileInfo = byId("pubmat-file-info");
  const filename = byId("pubmat-filename"),
    meta = byId("pubmat-meta"),
    validLabel = byId("pubmat-valid-label");
  let url = "",
    valid = false,
    existing = false,
    revision = 0,
    dragDepth = 0;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle("pubmat-error", error);
    panel.classList.toggle("has-error", error);
    choose.setAttribute("aria-invalid", String(error));
    input.setCustomValidity(error ? text : "");
  }
  function clearUrl() {
    if (url) URL.revokeObjectURL(url);
    url = "";
    image.removeAttribute("src");
    preview.hidden = true;
    empty.hidden = false;
    fileInfo.hidden = true;
    remove.hidden = true;
    chooseLabel.textContent = "Choose image";
    panel.classList.remove("has-image");
  }
  function showImage(src, name, w, h, size = "", saved = false) {
    image.src = src;
    preview.hidden = false;
    empty.hidden = true;
    fileInfo.hidden = false;
    remove.hidden = false;
    filename.textContent = name;
    filename.title = name;
    meta.textContent = `${w} × ${h} px · 16:9${size ? " · " + size : ""}`;
    validLabel.textContent = saved
      ? "Existing publication material"
      : "Image validated";
    chooseLabel.textContent = "Replace image";
    panel.classList.add("has-image");
    message("");
  }
  function reset(record) {
    revision++;
    clearUrl();
    input.value = "";
    valid = false;
    existing = false;
    input.required = true;
    panel.removeAttribute("aria-busy");
    panel.classList.remove("is-dragging");
    dragDepth = 0;
    message("");
    // Existing image URLs may be supplied by the future API. Decode before accepting.
    const source =
      record?.coverImageUrl ||
      record?.imageUrl ||
      record?.coverImage ||
      record?.image;
    if (typeof source === "string" && source) {
      try {
        const u = new URL(source, location.origin);
        if (
          u.protocol === "https:" ||
          (u.origin === location.origin && u.protocol === "http:")
        ) {
          const check = new Image(),
            token = revision;
          check.onload = () => {
            if (token !== revision || input.files.length) return;
            if (isLandscape16x9(check.naturalWidth, check.naturalHeight)) {
              existing = true;
              input.required = false;
              showImage(
                u.href,
                "Current event image",
                check.naturalWidth,
                check.naturalHeight,
                "",
                true,
              );
            }
          };
          check.src = u.href;
        }
      } catch {
        /* Invalid image reference: leave the upload panel empty. */
      }
    }
  }
  function sizeLabel(bytes) {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  function validateSelection() {
    const token = ++revision;
    clearUrl();
    valid = false;
    existing = false;
    input.required = true;
    panel.removeAttribute("aria-busy");
    const file = input.files[0];
    if (!file) {
      message("Choose a 16:9 publication material.", true);
      return;
    }
    if (!types.has(file.type) || file.size > PUBMAT_MAX_BYTES) {
      input.value = "";
      message("Choose a JPG, PNG or WebP image up to 10 MB.", true);
      return;
    }
    message("Checking image dimensions…");
    panel.setAttribute("aria-busy", "true");
    url = URL.createObjectURL(file);
    const check = new Image();
    check.onload = () => {
      if (token !== revision) return;
      panel.removeAttribute("aria-busy");
      const w = check.naturalWidth,
        h = check.naturalHeight;
      if (!isLandscape16x9(w, h)) {
        clearUrl();
        input.value = "";
        message(
          `This image is ${w} × ${h}. Choose a 16:9 landscape image (e.g. 1920 × 1080).`,
          true,
        );
        return;
      }
      valid = true;
      showImage(url, file.name, w, h, sizeLabel(file.size));
    };
    check.onerror = () => {
      if (token !== revision) return;
      panel.removeAttribute("aria-busy");
      clearUrl();
      input.value = "";
      message("Unable to read this image. Choose a valid image file.", true);
    };
    check.src = url;
  }
  choose.addEventListener("click", () => input.click());
  input.addEventListener("change", validateSelection);
  remove.addEventListener("click", () => {
    reset();
    choose.focus();
  });
  // File dropping is optional; the keyboard-accessible Choose image button always works.
  panel.addEventListener("dragenter", (event) => {
    if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
    event.preventDefault();
    dragDepth++;
    panel.classList.add("is-dragging");
  });
  panel.addEventListener("dragover", (event) => {
    if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  panel.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) panel.classList.remove("is-dragging");
  });
  panel.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    dragDepth = 0;
    panel.classList.remove("is-dragging");
    if (event.dataTransfer.files.length !== 1) {
      message(
        "Choose one publication material at a time.",
        !valid && !existing,
      );
      return;
    }
    try {
      input.files = event.dataTransfer.files;
    } catch {
      message(
        "Please use Choose image to select the file.",
        !valid && !existing,
      );
      return;
    }
    validateSelection();
  });
  return {
    reset,
    snapshot: () => ({ revision, file: input.files[0]?.name || "", existing }),
    validate() {
      if (existing || valid) return true;
      if (panel.getAttribute("aria-busy") === "true") {
        choose.focus();
        return false;
      }
      if (!status.classList.contains("pubmat-error"))
        message("A valid 16:9 publication material is required.", true);
      choose.focus();
      return false;
    },
    needsStorage: () => valid && !existing,
  };
}
