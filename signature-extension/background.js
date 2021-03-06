function updateSyncable(syncable) {
  acc = preferences.getPref("syncAccounts");
  acc[syncable.accountId] = syncable;
  preferences.setPref("syncAccounts", acc);
}

async function getUserSignature(gmailEmail) {
  let dataUrl = "https://www.googleapis.com/gmail/v1/users/me/settings/sendAs";
  let token = await getToken(gmailEmail);
  let settings = await makeRequest(token, dataUrl);
  let signature = null;
  settings.sendAs.forEach((alias) => {
    if (alias.isDefault) signature = alias.signature;
  });
  return signature;
}

async function syncAccounts() {
  let syncableAccounts = preferences.getPref("syncAccounts");
  for (const [account_id, syncable] of Object.entries(syncableAccounts)) {
    if (!syncable.syncEnabled) {
      syncable.lastError = null;
      continue;
    }
    try {
      let signature = await getUserSignature(syncable.gmailEmail);
      let account = await browser.accounts.get(account_id);
      await browser.signatureApi.setSignatureHTML(account.identities[0].id, signature);
      syncable.lastSync = new Date();
      syncable.lastError = null;
    } catch (error) {
      console.error(`Cannot sync for the account ${account_id} with ${syncable.gmailEmail}`);
      console.error(error);
      syncable.lastError = `Sync failed at ${new Date().toISOString()}`;
    }
    updateSyncable(syncable);
  }
  console.log("Sync finished");
}

let defaultPreferences = {
  syncAccounts: {},
  oauthClient: "",
};

(async function () {
  await preferences.init(defaultPreferences);
  await syncAccounts();
})();
