function registerUtils() {
  let closeButtons = document.querySelector("button.close");
  closeButtons.addEventListener("click", () => window.close());
}

document.addEventListener("DOMContentLoaded", registerUtils);
