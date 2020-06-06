browser.browserAction.onClicked.addListener(async () => {
  accounts = await browser.accounts.list()
  identity_id = accounts[0].identities[0].id;
  await browser.signatureApi.setSignatureHTML(identity_id, "<b>Your new signature</b>");
  console.log(await browser.signatureApi.getSignature(identity_id))
});
