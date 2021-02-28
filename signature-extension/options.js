async function loadAccountList() {
  let listPlaceholder = document.querySelector("#signatureAccountList");
  listPlaceholder.querySelectorAll("*").forEach((n) => n.remove());

  let addToList = (acc) => {
    let line = document.createElement("div", { is: "account-line" });
    line.setAttribute("sync-enabled", false);
    line.setAttribute("account-name", acc.name);
    line.setAttribute("last-sync", "never");
    line.setAttribute("identity-id", acc.identities[0].id);
    listPlaceholder.appendChild(line);
  };

  accounts = await browser.accounts.list();
  accounts = accounts.filter((account) => account.type !== "none");
  accounts.map((x) => addToList(x));
  console.log(accounts);
}

class AccountLine extends HTMLDivElement {
  createObjects() {
    this.classList.add("panel-list-item");

    let checkboxContainer = document.createElement("div");
    checkboxContainer.classList.add("browser-style", "nobottom");
    this.checkbox = document.createElement("input");
    this.checkbox.type = "checkbox";
    this.checkbox.name = "syncEnabled";
    this.checkbox.addEventListener("click", (e) => {
      this.syncCheckboxChanged(e);
    });
    checkboxContainer.appendChild(this.checkbox);
    this.appendChild(checkboxContainer);

    this.accountName = document.createElement("div");
    this.accountName.classList.add("text");
    this.appendChild(this.accountName);

    let loginContainer = document.createElement("div");
    loginContainer.classList.add("login");
    this.login = document.createElement("button");
    this.login.classList.add("nobottom", "browser-style");
    this.login.textContent = "connect";
    this.login.addEventListener("click", (_) => {
      console.log("clicked!");
    });
    loginContainer.appendChild(this.login);
    this.appendChild(loginContainer);

    this.lastSync = document.createElement("div");
    this.lastSync.classList.add("text-shortcut");
    this.appendChild(this.lastSync);
  }

  render() {
    let syncEnabled = this.getAttribute("sync-enabled") === "true";
    let identityId = this.getAttribute("identity-id");
    let accountName = this.getAttribute("account-name");
    let lastSync = this.getAttribute("last-sync");

    this.checkbox.checked = syncEnabled;
    this.accountName.textContent = accountName;
    this.login.disabled = !syncEnabled;
    this.lastSync.textContent = `Last sync: ${lastSync}`;
  }

  syncCheckboxChanged(e) {
    this.setAttribute("sync-enabled", this.checkbox.checked);
    this.render();
  }

  connectedCallback() {
    if (!this.rendered) {
      this.createObjects();
      this.render();
      this.rendered = true;
    }
  }

  static get observedAttributes() {
    return ["sync-enabled", "last-sync"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.rendered) {
      this.render();
    }
  }
}

const browser = window.browser.extension.getBackgroundPage().browser;
customElements.define("account-line", AccountLine, { extends: "div" });
document.addEventListener("DOMContentLoaded", loadAccountList);
