function AccountSyncable(
  accountId,
  syncEnabled,
  lastSync,
  gmailId,
  gmailEmail,
  lastError,
  refreshToken
) {
  this.accountId = accountId;
  this.syncEnabled = syncEnabled;
  this.lastSync = lastSync;
  this.gmailId = gmailId;
  this.gmailEmail = gmailEmail;
  this.lastError = lastError;
  this.refreshToken = refreshToken;
}

function getOrCreateAccountSyncable(account_id) {
  acc = preferences.getPref("syncAccounts");
  if (!(account_id in acc)) {
    acc[account_id] = new AccountSyncable(account_id, false, null, null);
    preferences.setPref("syncAccounts", acc);
  }
  return acc[account_id];
}

async function loadAccountList() {
  let listPlaceholder = document.querySelector("#signatureAccountList");
  listPlaceholder.querySelectorAll("*").forEach((n) => n.remove());

  let addToList = (acc) => {
    let syncable = getOrCreateAccountSyncable(acc.id);
    let line = document.createElement("div", { is: "account-line" });

    line.setAttribute("sync-enabled", syncable.syncEnabled);
    line.setAttribute("account-name", acc.name);
    if (syncable.lastSync) {
      line.setAttribute("last-sync", syncable.lastSync.toISOString().slice(0, 10));
    }
    line.setAttribute("account-id", acc.id);
    if (syncable.gmailEmail) line.setAttribute("gmail-email", syncable.gmailEmail);
    if (syncable.lastError) line.setAttribute("last-error", syncable.lastError);
    listPlaceholder.appendChild(line);
  };

  accounts = await browser.accounts.list();
  accounts = accounts.filter((account) => account.type !== "none");
  accounts.map((x) => addToList(x));
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

    this.lastSync = document.createElement("div");
    this.lastSync.classList.add("text-shortcut");
    this.appendChild(this.lastSync);

    let loginContainer = document.createElement("div");
    loginContainer.classList.add("login");
    this.login = document.createElement("button");
    this.login.classList.add("nobottom");
    this.login.textContent = "connect";
    this.login.addEventListener("click", async (_) => {
      await this.connectButtonClicked();
    });
    loginContainer.appendChild(this.login);
    this.appendChild(loginContainer);

    this.notice = document.createElement("div");
    this.notice.classList.add("notice", "check-padding");
    this.appendChild(this.notice);

    this.error = document.createElement("div");
    this.error.classList.add("notice", "error", "check-padding");
    this.appendChild(this.error);
  }

  render() {
    let syncEnabled = this.getAttribute("sync-enabled") === "true";
    let accountName = this.getAttribute("account-name");
    let lastSync = this.getAttribute("last-sync");
    let gmailEmail = this.getAttribute("gmail-email");
    let lastError = this.getAttribute("last-error");

    this.checkbox.checked = syncEnabled;
    this.accountName.textContent = accountName;
    this.login.disabled = !syncEnabled;
    this.lastSync.textContent = `Last sync: ${lastSync}`;

    if (gmailEmail) this.notice.textContent = `Sync with account ${gmailEmail}`;
    else this.notice.textContent = null;

    if (lastError) this.error.textContent = lastError;
    else this.error.textContent = null;
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
    let userData = await connectWithGoogle();
    acc.gmailEmail = userData.email;
    acc.gmailId = userData.sub;
    acc.refreshToken = userData.refresh_token;
    this.setAttribute("gmail-email", userData.email);
    updateSyncable(acc);
    this.render();
  }

  connectedCallback() {
    if (!this.rendered) {
      this.createObjects();
      this.render();
      this.rendered = true;
    }
  }
}

function listenButton() {
  let syncButton = document.querySelector("#syncButton");
  syncButton.addEventListener("click", async () => {
    syncButton.disabled = true;
    await syncAccounts();
    await loadAccountList();
    syncButton.disabled = false;
  });
}

async function listenOauthClient() {
  const oauthInput = document.querySelector("#oauthid");
  const oauthError = document.querySelector("#oauthid-error");
  const clientId = preferences.getPref("oauthClient");

  oauthInput.value = clientId;
  if (clientId) oauthError.classList.add("hidden");

  oauthInput.addEventListener("input", async () => {
    const newValue = oauthInput.value;
    preferences.setPref("oauthClient", newValue);
    if (!newValue) oauthError.classList.remove("hidden");
    else oauthError.classList.add("hidden");
  });
}

function listenChangelog() {
  let changelogLink = document.querySelector("a#changelog");
  changelogLink.addEventListener("click", (e) => {
    browser.tabs.create({ url: "changelog.html" });
    e.preventDefault();
  });
}

async function load() {
  await preferences.init(defaultPreferences);
  loadAccountList();
  listenButton();
  listenOauthClient();
  listenChangelog();
}

const browser = window.browser.extension.getBackgroundPage().browser;
customElements.define("account-line", AccountLine, { extends: "div" });
document.addEventListener("DOMContentLoaded", load);
