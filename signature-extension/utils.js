function randomToken() {
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 50; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function openError(page, message) {
  let dest = page;
  if (message) dest = `${page}?message=${btoa(message)}`;
  browser.windows.create({
    type: "popup",
    height: 300,
    width: 500,
    url: dest,
    allowScriptsToClose: true,
  });
}

function extractFromUrl(url, paramName) {
  let m = url.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  let params = new URLSearchParams(m[1].split("#")[0]);
  return params.get(paramName);
}

function urlMessage() {
  let urlMessagePlaceholder = document.querySelector("#urlMessage");
  if (urlMessagePlaceholder) {
    let message = extractFromUrl(location.href, "message");
    if (message) urlMessagePlaceholder.textContent = atob(message);
  }
}

function registerUtils() {
  let closeButtons = document.querySelector("button.close");
  closeButtons.addEventListener("click", () => window.close());
  urlMessage();
}

document.addEventListener("DOMContentLoaded", registerUtils);
