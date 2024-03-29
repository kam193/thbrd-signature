const VERSION = 3;
const NONE_EMAIL = "none";

function IdentitySyncable(identityId, gmailSendAsEmail) {
  this.identityId = identityId;
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

function updateSyncable(syncable) {
  acc = preferences.getPref("syncAccounts");
  acc[syncable.accountId] = syncable;
  preferences.setPref("syncAccounts", acc);
}

// Based on original from api.js with improved error handling
function refreshAccessTokenWithErrorCatching(refreshToken) {
  const data = `${REFRESH_DATA}&refresh_token=${refreshToken}`;
  const refreshRequest = new Request(TOKEN_URL, {
    method: "POST",
    body: addCredentialQuery(data),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return new Promise((resolve, reject) => {
    fetch(refreshRequest)
      .then((response) => {
        if (response.status != 200) {
          reject("Cannot refresh access token");
        }
        response.json().then((json) => {
          resolve(json.access_token);
        });
      })
      .catch((error) => reject(error));
  });
}

async function getUserSendAs(syncable) {
  let dataUrl = "https://www.googleapis.com/gmail/v1/users/me/settings/sendAs";
  try {
    let token = await refreshAccessTokenWithErrorCatching(syncable.refreshToken);
    let settings = await makeRequest(token, dataUrl);

    let sendAs = [];
    settings.sendAs.forEach((alias) => {
      sendAs.push({
        email: alias.sendAsEmail,
        name: alias.displayName,
        signature: alias.signature,
        isDefault: alias.isDefault,
      });
    });
    return sendAs;
  } catch (error) {
    console.error(`Cannot get send-as for ${syncable.gmailEmail}`);
    console.error(error);
    return [];
  }
}

async function ensureDefaultIdentitySyncable(accountSyncable) {
  // For given account syncable, if connected with a Gmail account,
  // create an identities syncable dictionary with sync enabled
  // for default identitiy and Gmail's alias
  if (accountSyncable.identitiesSyncable || !accountSyncable.syncEnabled) {
    return accountSyncable;
  }

  identity = await browser.identities.getDefault(accountSyncable.accountId);
  sendAses = await getUserSendAs(accountSyncable);
  defaultSendAs = sendAses.find((x) => x.isDefault);

  if (!defaultSendAs) {
    console.error("Could not find default send-as for account " + accountSyncable.accountId);
    return accountSyncable;
  }

  accountSyncable.identitiesSyncable = {};
  accountSyncable.identitiesSyncable[identity.id] = new IdentitySyncable(
    identity.id,
    defaultSendAs.email
  );
  return accountSyncable;
}

async function syncAccounts() {
  let syncableAccounts = preferences.getPref("syncAccounts");
  let failed = [];
  for (const [account_id, syncable] of Object.entries(syncableAccounts)) {
    let error = "";
    if (!syncable.syncEnabled) {
      syncable.lastError = null;
      continue;
    }
    try {
      let account = await browser.accounts.get(account_id, false);
      if (account === null) {
        console.warn(`The account ${account_id} doesn't exist anymore. Skipping sync...`);
        continue;
      }

      let gmailSendAs = await getUserSendAs(syncable);
      let aliasesByEmail = {};
      gmailSendAs.forEach((alias) => {
        aliasesByEmail[alias.email] = alias;
      });

      await ensureDefaultIdentitySyncable(syncable);
      let identities = syncable.identitiesSyncable || {};

      for (const identity of Object.values(identities)) {
        let thunderbirdIdentity = await browser.identities.get(identity.identityId);
        if (thunderbirdIdentity === null) {
          console.warn(`The identity ${account_id} doesn't exist anymore. Skipping sync...`);
        } else if (identity.gmailSendAsEmail != NONE_EMAIL) {
          let alias = aliasesByEmail[identity.gmailSendAsEmail];
          if (alias) {
            console.log(
              `Syncing identity ${identity.identityId} with remote ${identity.gmailSendAsEmail}`
            );
            let identitySettings = { signature: alias.signature, signatureIsPlainText: false };
            browser.identities.update(identity.identityId, identitySettings);
          } else {
            error = `Could not find alias ${identity.gmailSendAsEmail} for identity ${identity.identityId}`;
            console.error(error);
          }
        }
      }

      // After trying sync all identities, throw last error if any
      if (error) throw error;

      syncable.lastSync = new Date();
      syncable.lastError = null;
    } catch (error) {
      console.error(`Cannot sync for the account ${account_id} with ${syncable.gmailEmail}`);
      console.error(error);
      syncable.lastError = `Sync failed at ${new Date().toISOString()}`;
      failed.push(syncable.gmailEmail);
    }
    updateSyncable(syncable);
  }
  if (failed.length === 0) {
    preferences.setPref("failedCount", 0);
  } else {
    let countedFails = preferences.getPref("failedCount");
    countedFails += 1;
    preferences.setPref("failedCount", countedFails);
    console.log(`Sync failed. It's ${countedFails} failed sync.`);

    if (countedFails % 3 === 0) {
      openError("sync-error.html", failed.join(", "));
    }
  }
  console.log("Sync finished");
}

let defaultPreferences = {
  syncAccounts: {},
  oauthClient: "",
  oauthSecret: "",
  failedCount: 0,
  changelogShown: 0,
  useOwnCredentials: false,
};

function changelog() {
  let shown_version = preferences.getPref("changelogShown");
  if (shown_version < VERSION) {
    browser.tabs.create({ url: "changelog.html" });
  }
  preferences.setPref("changelogShown", VERSION);
}

(async function () {
  await preferences.init(defaultPreferences);
  await syncAccounts();
  changelog();
})();
