# Signature sync for Gmail, a Thunderbird add-on

<p align="center">
  <img src="signature-extension/_img/icons8-signature-64.png" />
</p>

This extension allows you to easily update signature of selected accounts
in Thunderbird with the signature from your Gmail accounts.
**Syncronization works in one way**, your local signatures are overridden by Gmail ones.

In order to sync a signature, go to the settings page, enable an account and
connect it with Gmail. Signatures are downloaded on every startup or when you
click in settings.

> **Beta!** This is still a beta version. It can work unstable.

## How to install

After installation, open add-on preferences and configure it.

### Install from the Thunderbird add-on portal

Preferred version for normal use, install from the
[Thunderbird add-on portal](https://addons.thunderbird.net/en-US/thunderbird/addon/signature-sync-for-gmail/)
or find _Signature Sync for Gmail_ in your Thunderbird add-ons preferences.

### Install released version from Github

See also [Thunderbird documentation](http://mzl.la/20WLHOO)

1. From _Releases_ page select the newest and download a file with `.xpi` extension.
2. In Thunderbird, go to _Add-ons_ and open _Extensions_ tab.
3. Click a button on the left site from the search bar, and use _Install Add-on from file_.

### Install for debugging

Follow the instruction from [Thunderbird documentation](https://developer.thunderbird.net/add-ons/mailextensions/hello-world-add-on#testing-the-extension)

## Privacy & usage terms

The extension is working just locally on your computer. It doesn't send any data
outside, except of needed requests to Google API. Use it to update your local
signatures from Gmail.

## External sources

This add-on uses some external resources:

- Files from external libraries, which full list you can find in
  the license file [\_lib directory](signature-extension/_lib/LICENSE.md)
- Signature icon from [Icon8](https://icons8.com), you can find more in
  the license file in [\_img directory](signature-extension/_img/LICENSE)

---

This extension is **not** made by Google or Thunderbird team. It's unofficial.
