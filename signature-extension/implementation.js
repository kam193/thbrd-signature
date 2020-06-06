var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var signatureApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      signatureApi: {
        getSignature: async function (identityId) {
          let signature = await Services.prefs.getStringPref(
            `mail.identity.${identityId}.htmlSigText`,
            null
          );
          return signature;
        },

        setSignatureHTML: async function (identityId, signature) {
          Services.prefs.setStringPref(`mail.identity.${identityId}.htmlSigText`, signature);
          Services.prefs.setBoolPref(`mail.identity.${identityId}.htmlSigFormat`, true);
        },
      },
    };
  }
};
