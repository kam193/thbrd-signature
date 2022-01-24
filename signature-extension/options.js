function IdentitySyncable(identityId, syncEnabled, gmailSendAsEmail) {
  this.identityId = identityId;
  this.syncEnabled = syncEnabled;
  this.gmailSendAsEmail = gmailSendAsEmail;
}

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
  this.identitiesSyncable = {};
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

    let identities = [];
    for (let identity of acc.identities) {
      let label = `${identity.name} <${identity.email}>`;
      if (identity.label) label += ` (${identity.label})`;
      identities.push({ id: identity.id, label: label });
    }
    line.setAttribute("identities", JSON.stringify(identities));

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

    this.identitiesList = document.createElement("div");
    this.identitiesList.classList.add("identities-list");
    this.appendChild(this.identitiesList);
  }

  addIdentity(id, label, syncable) {
    let identity = document.createElement("div");
    identity.classList.add("identity-item");

    let identityName = document.createElement("div");
    identityName.classList.add("identity-name");
    identityName.textContent = label;
    identity.appendChild(identityName);

    let identitySyncWith = document.createElement("div");
    identitySyncWith.classList.add("identity-sync-with");
    identity.appendChild(identitySyncWith);

    let gmSignature = document.createElement("select");
    gmSignature.classList.add("browser-style", "nobottom", "gm-signatures");
    gmSignature.disabled = !this.isEnabled;
    gmSignature.addEventListener("change", (e) => this.gmailAliasChanged(id, e));
    identitySyncWith.appendChild(gmSignature);

    this.aliases.forEach((alias) => {
      let option = document.createElement("option");
      option.value = alias.email;
      option.textContent = `${alias.name} <${alias.email}>`;
      if (alias.email === syncable.gmailSendAsEmail) option.selected = true;
      gmSignature.appendChild(option);
    });

    this.identitiesList.appendChild(identity);
  }

  async loadGmailAliases() {
    this.aliases = [{ name: "", email: NONE_EMAIL }];
    if (!this.isEnabled) return;

    let syncable = getOrCreateAccountSyncable(this.getAttribute("account-id"));
    let remoteAliases = await getUserSendAs(syncable); // TODO: catch errors
    remoteAliases.map((x) => {
      this.aliases.push(x);
    });
  }

  async renderIdentities() {
    this.identitiesList.childNodes.forEach((n) => n.remove());
    await this.loadGmailAliases();
    let identitiesSync =
      getOrCreateAccountSyncable(this.getAttribute("account-id")).identitiesSyncable || {};

    let identities = JSON.parse(this.getAttribute("identities"));
    for (let identity of identities) {
      let syncable = identitiesSync[identity.id] || new IdentitySyncable(identity.id, false, null);
      this.addIdentity(identity.id, identity.label, syncable);
    }
  }

  render() {
    let syncEnabled = this.getAttribute("sync-enabled") === "true";
    let accountName = this.getAttribute("account-name");
    let lastSync = this.getAttribute("last-sync");
    let gmailEmail = this.getAttribute("gmail-email");
    let lastError = this.getAttribute("last-error");

    this.isEnabled = syncEnabled;
    this.checkbox.checked = syncEnabled;
    this.accountName.textContent = accountName;
    this.login.disabled = !syncEnabled;
    this.lastSync.textContent = `Last sync: ${lastSync}`;

    if (gmailEmail) this.notice.textContent = `Sync with account ${gmailEmail}`;
    else this.notice.textContent = null;

    if (lastError) this.error.textContent = lastError;
    else this.error.textContent = null;

    this.renderIdentities();
  }

  syncCheckboxChanged(e) {
    this.setAttribute("sync-enabled", this.checkbox.checked);
    acc = getOrCreateAccountSyncable(this.getAttribute("account-id"));
    acc.syncEnabled = this.checkbox.checked;
    updateSyncable(acc);
    this.render();
  }

  gmailAliasChanged(identityId, e) {
    let accSyncable = getOrCreateAccountSyncable(this.getAttribute("account-id"));
    let identitiesSyncable = accSyncable.identitiesSyncable;
    if (!identitiesSyncable) {
      identitiesSyncable = {};
      accSyncable.identitiesSyncable = identitiesSyncable;
    }

    let identitySyncable = identitiesSyncable[identityId];
    if (!identitySyncable) {
      identitySyncable = new IdentitySyncable(identityId, false, null);
      identitiesSyncable[identityId] = identitySyncable;
    }

    identitySyncable.gmailSendAsEmail = e.target.value;
    updateSyncable(accSyncable);
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
  const oauthIdInput = document.querySelector("#oauthid");
  const oauthSecretInput = document.querySelector("#oauthsecret");
  const oauthIdError = document.querySelector("#oauthid-error");
  const oauthSecretError = document.querySelector("#oauthsecret-error");

  const clientId = preferences.getPref("oauthClient");
  const clientSecret = preferences.getPref("oauthSecret");

  oauthIdInput.value = clientId;
  oauthSecretInput.value = clientSecret;
  if (clientId) oauthIdError.classList.add("hidden");
  if (clientSecret) oauthSecretError.classList.add("hidden");

  oauthIdInput.addEventListener("input", async () => {
    const newValue = oauthIdInput.value;
    preferences.setPref("oauthClient", newValue);
    if (!newValue) oauthIdError.classList.remove("hidden");
    else oauthIdError.classList.add("hidden");
  });

  oauthSecretInput.addEventListener("input", async () => {
    const newValue = oauthSecretInput.value;
    preferences.setPref("oauthSecret", newValue);
    if (!newValue) oauthSecretError.classList.remove("hidden");
    else oauthSecretError.classList.add("hidden");
  });
}

function listenChangelog() {
  let changelogLink = document.querySelector("a#changelog");
  changelogLink.addEventListener("click", (e) => {
    browser.tabs.create({ url: "changelog.html" });
    e.preventDefault();
  });
}

function listenUseOwnOauth() {
  const useUwnOauthButton = document.querySelector("#oauth-use-own");
  const ownCredentialsForm = document.querySelector("#oauth-form");

  const handle = (value) => {
    preferences.setPref("useOwnCredentials", value);
    if (value) ownCredentialsForm.classList.remove("hidden");
    else ownCredentialsForm.classList.add("hidden");
  };

  const useOwnOauthPref = preferences.getPref("useOwnCredentials");
  useUwnOauthButton.checked = useOwnOauthPref;
  handle(useOwnOauthPref);

  useUwnOauthButton.addEventListener("click", (e) => {
    handle(e.target.checked);
  });
}

async function load() {
  await preferences.init(defaultPreferences);
  loadAccountList();
  listenButton();
  listenOauthClient();
  listenChangelog();
  listenUseOwnOauth();
}

const browser = window.browser.extension.getBackgroundPage().browser;
customElements.define("account-line", AccountLine, { extends: "div" });
document.addEventListener("DOMContentLoaded", load);
