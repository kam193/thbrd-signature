const OAUTH_CLIENT = "";
const OAUTH_SECRET = "";

const ERROR = "Authorization error";
const REDIRECT_SUBDOMAIN = browser.identity.getRedirectURL().substring(8);
const OWN_REDIRECT_URL = `http://127.0.0.1/mozoauth2/${REDIRECT_SUBDOMAIN}`;
const SCOPES_LIST = "email https://www.googleapis.com/auth/gmail.settings.basic";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_BASE = `https://accounts.google.com/o/oauth2/auth\
?response_type=code&access_type=offline\
&redirect_uri=${encodeURIComponent(OWN_REDIRECT_URL)}\
&scope=${encodeURIComponent(SCOPES_LIST)}`;
const TOKEN_BASE = `redirect_uri=${encodeURIComponent(
  OWN_REDIRECT_URL
)}&grant_type=authorization_code`;
const REFRESH_DATA = "grant_type=refresh_token";
const CONNECT_URL = `${AUTH_BASE}&prompt=select_account`;

function getOauthClientId() {
  let clientId = preferences.getPref("oauthClient");
  if (!clientId) clientId = OAUTH_CLIENT;
  if (!clientId) console.error("No client id!");
  return clientId;
}

function addClientId(url) {
  return `${url}&client_id=${getOauthClientId()}`;
}

function addCredentialQuery(url) {
  return `${addClientId(url)}&client_secret=${OAUTH_SECRET}`;
}

function extractCode(redirectUri) {
  let m = redirectUri.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  let params = new URLSearchParams(m[1].split("#")[0]);
  return params.get("code");
}

function refreshAccessToken(refreshToken) {
  const data = `${REFRESH_DATA}&refresh_token=${refreshToken}`;
  const refreshRequest = new Request(TOKEN_URL, {
    method: "POST",
    body: addCredentialQuery(data),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return new Promise((resolve, reject) => {
    fetch(refreshRequest).then((response) => {
      if (response.status != 200) {
        console.log(response);
        reject("Cannot refresh access token");
      }
      response.json().then((json) => {
        alert(json.access_token);
        resolve(json.access_token);
      });
    });
  });
}

function getUserData(accessToken, expectedEmail) {
  const validationURL = `${VALIDATION_BASE_URL}?access_token=${accessToken}`;
  const validationRequest = new Request(addClientId(validationURL), {
    method: "GET",
  });

  function parseAndValidate(response) {
    return new Promise((resolve, reject) => {
      if (response.status != 200) {
        reject(ERROR);
      }
      response.json().then((json) => {
        console.log(json);
        if (json.aud && json.aud === getOauthClientId()) {
          if (expectedEmail && json.email !== expectedEmail) {
            reject(ERROR);
          }
          resolve({ ...json });
        } else {
          reject("Token validation error");
        }
      });
    });
  }

  return fetch(validationRequest).then(parseAndValidate);
}

function connectWithGoogle() {
  const handleResponse = (redirectUrl) => {
    console.log(redirectUrl);
    const code = extractCode(redirectUrl);
    if (!code) {
      console.log(redirectUrl);
      throw ERROR;
    }

    const data = addCredentialQuery(`${TOKEN_BASE}&code=${code}`);
    const dataRequest = new Request(TOKEN_URL, {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return new Promise((resolve, reject) => {
      fetch(dataRequest).then((response) => {
        if (response.status != 200) {
          console.log(response);
          reject(ERROR);
        }
        response.json().then((json) => {
          console.log(json);
          getUserData(json.access_token).then((userData) => resolve({ ...json, ...userData }));
        });
      });
    });
  };

  return browser.identity
    .launchWebAuthFlow({
      interactive: true,
      url: addClientId(CONNECT_URL),
    })
    .then(handleResponse);
}

function makeRequest(accessToken, requestURL) {
  const requestHeaders = new Headers();
  requestHeaders.append("Authorization", "Bearer " + accessToken);
  const mRequest = new Request(requestURL, {
    method: "GET",
    headers: requestHeaders,
  });

  return fetch(mRequest).then((response) => {
    if (response.status === 200) {
      return response.json();
    } else {
      throw response.status;
    }
  });
}
