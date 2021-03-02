const OAUTH_CLIENT = "";
const SCOPES_LIST = "openid email profile https://www.googleapis.com/auth/gmail.settings.basic";
const AUTH_BASE = `https://accounts.google.com/o/oauth2/auth\
?client_id=${OAUTH_CLIENT}\
&response_type=token\
&redirect_uri=${encodeURIComponent(REDIRECT_URL)}\
&scope=${encodeURIComponent(SCOPES_LIST)}`;
const CONNECT_URL = `${AUTH_BASE}&prompt=select_account`;
const ERROR = "Authorization error";

function getUserData(redirectURL, expectedEmail) {
  const accessToken = extractAccessToken(redirectURL);
  if (!accessToken) {
    throw ERROR;
  }
  const validationURL = `${VALIDATION_BASE_URL}?access_token=${accessToken}`;
  const validationRequest = new Request(validationURL, {
    method: "GET",
  });

  function parseAndValidate(response) {
    return new Promise((resolve, reject) => {
      if (response.status != 200) {
        reject(ERROR);
      }
      response.json().then((json) => {
        if (json.aud && json.aud === OAUTH_CLIENT) {
          if (expectedEmail && json.email !== expectedEmail) {
            reject(ERROR);
          }
          resolve({ ...json, accessToken: accessToken });
        } else {
          reject("Token validation error");
        }
      });
    });
  }

  return fetch(validationRequest).then(parseAndValidate);
}

function connectWithGoogle() {
  return browser.identity
    .launchWebAuthFlow({
      interactive: true,
      url: CONNECT_URL,
    })
    .then(getUserData);
}

function getToken(email) {
  const url = `${AUTH_BASE}&login_hint=${encodeURIComponent(email)}`;
  return browser.identity
    .launchWebAuthFlow({
      interactive: false,
      url: url,
    })
    .then((r) => getUserData(r, email).then((j) => j.accessToken));
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
