const VERSION = 2;

function updateSyncable(syncable) {
  acc = preferences.getPref("syncAccounts");
  acc[syncable.accountId] = syncable;
  preferences.setPref("syncAccounts", acc);
}

async function getUserSignature(syncable) {
  let dataUrl = "https://www.googleapis.com/gmail/v1/users/me/settings/sendAs";
  let token = await refreshAccessToken(syncable.refreshToken);
  let settings = await makeRequest(token, dataUrl);
  let signature = null;
  settings.sendAs.forEach((alias) => {
    if (alias.isDefault) signature = alias.signature;
  });
  return signature;
}

async function syncAccounts() {
  let syncableAccounts = preferences.getPref("syncAccounts");
  let failed = [];
  for (const [account_id, syncable] of Object.entries(syncableAccounts)) {
    if (!syncable.syncEnabled) {
      syncable.lastError = null;
      continue;
    }
    try {
      let signature = await getUserSignature(syncable);
      let account = await browser.accounts.get(account_id);
      await browser.signatureApi.setSignatureHTML(account.identities[0].id, signature);
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
  useOwnCredentials: true,
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
