browser.browserAction.onClicked.addListener(async () => {
  accounts = await browser.accounts.list();
  console.log(accounts);
  identity_id = accounts[1].identities[0].id;

  let signature = await getUserSignature();
  console.log(signature);

  await browser.signatureApi.setSignatureHTML(identity_id, signature);
});

async function getUserSignature() {
  let dataUrl = "https://www.googleapis.com/gmail/v1/users/me/settings/sendAs";
  let token = await getAccessToken();
  let settings = await makeRequest(token, dataUrl);
  let signature = null;
  settings.sendAs.forEach((alias) => {
    if (alias.isDefault) signature = alias.signature;
  });
  return signature;
}

let defaultPreferences = {
  syncAccounts: {},
};

(async function () {
  await preferences.init(defaultPreferences);
})();
