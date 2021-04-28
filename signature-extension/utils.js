function registerUtils() {
  let closeButtons = document.querySelector("button.close");
  closeButtons.addEventListener("click", () => window.close());
}

function randomToken() {
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 50; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function openError(page) {
  browser.windows.create({
    type: "popup",
    height: 300,
    width: 500,
    url: page,
    allowScriptsToClose: true,
  });
}

document.addEventListener("DOMContentLoaded", registerUtils);
