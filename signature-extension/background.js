browser.browserAction.onClicked.addListener(async () => {
  accounts = await browser.accounts.list();
  identity_id = accounts[0].identities[0].id;

  let signature = await getUserSignature();

  await browser.signatureApi.setSignatureHTML(identity_id, signature);
  console.log(await browser.signatureApi.getSignature(identity_id));
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
