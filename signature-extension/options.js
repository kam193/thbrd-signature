function AccountSyncable(accountId, syncEnabled, lastSync, accessToken) {
  this.accountId = accountId;
  this.syncEnabled = syncEnabled;
  this.lastSync = lastSync;
  this.accessToken = accessToken;
}

function getOrCreateAccountSyncable(account_id) {
  acc = preferences.getPref("syncAccounts");
  if (!(account_id in acc)) {
    acc[account_id] = new AccountSyncable(account_id, false, null, null);
    preferences.setPref("syncAccounts", acc);
  }
  return acc[account_id];
}

function updateSyncable(syncable) {
  acc = preferences.getPref("syncAccounts");
  acc[syncable.accountId] = syncable;
  preferences.setPref("syncAccounts", acc);
}

async function loadAccountList() {
  await preferences.init(defaultPreferences);

  let listPlaceholder = document.querySelector("#signatureAccountList");
  listPlaceholder.querySelectorAll("*").forEach((n) => n.remove());

  let addToList = (acc) => {
    let syncable = getOrCreateAccountSyncable(acc.id);
    let line = document.createElement("div", { is: "account-line" });

    line.setAttribute("sync-enabled", syncable.syncEnabled);
    line.setAttribute("account-name", acc.name);
    line.setAttribute("last-sync", syncable.lastSync);
    line.setAttribute("account-id", acc.id);
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
    this.login.addEventListener("click", async (_) => {
      await this.connectButtonClicked();
    });
    loginContainer.appendChild(this.login);
    this.appendChild(loginContainer);

    this.lastSync = document.createElement("div");
    this.lastSync.classList.add("text-shortcut");
    this.appendChild(this.lastSync);
  }

  render() {
    let syncEnabled = this.getAttribute("sync-enabled") === "true";
    let accountName = this.getAttribute("account-name");
    let lastSync = this.getAttribute("last-sync");

    this.checkbox.checked = syncEnabled;
    this.accountName.textContent = accountName;
    this.login.disabled = !syncEnabled;
    this.lastSync.textContent = `Last sync: ${lastSync}`;
  }

  syncCheckboxChanged(e) {
    this.setAttribute("sync-enabled", this.checkbox.checked);
    acc = getOrCreateAccountSyncable(this.getAttribute("account-id"));
    acc.syncEnabled = this.checkbox.checked;
    updateSyncable(acc);
    this.render();
  }

  async connectButtonClicked() {
    acc = getOrCreateAccountSyncable(this.getAttribute("account-id"));
    acc.accessToken = await getAccessToken();
    updateSyncable(acc);
  }

  connectedCallback() {
    if (!this.rendered) {
      this.createObjects();
      this.render();
      this.rendered = true;
    }
  }
}

const browser = window.browser.extension.getBackgroundPage().browser;
customElements.define("account-line", AccountLine, { extends: "div" });
document.addEventListener("DOMContentLoaded", loadAccountList);
