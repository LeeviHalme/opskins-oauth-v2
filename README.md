# opskins-oauth-v2

OPSkins-oAuth-v2 is a simple wrapper package around OPSkins oAuth API. Inspired by almatrass's package called `opskins-oauth`. That package is currently deprecated but the new one supports only PassportJS. This is a rebuilt authentication wrapper package, which supports promises.

## Usage

Install the package by typing `npm i opskins-oauth-v2` in your project folder.

### Setup

```javascript
const OpskinsAuth = require("opskins-oauth-v2");

const opskins = new OpskinsAuth({
  name: "testing", // Site name displayed to users on logon
  returnUrl: "http://localhost:5000/auth/opskins/authenticate", // Your return route
  apiKey: "2087fcb59f2be98c8a5bbfe245669d", // OPSkins API key
  scopes: "identity_basic trades", // Scopes you want to access
  mobile: true, // Removes login navbar if true
  permanent: true // Maintains permanent access and gives refresh token if true
});
```

### Routes

```javascript
app.get("/auth/opskins", async (req, res) => {
  const redirectUrl = await opskins.getRedirectUrl();
  return res.redirect(redirectUrl);
});

app.get("/auth/opskins/authenticate", async (req, res) => {
  try {
    const user = await opskins.authenticate(req);

    //...do something with the data
  } catch (error) {
    console.error(error);
  }
});
```

## Methods

### getRedirectUrl

Gets the redirect URL to OPSkins.

#### Parameters

None

#### Returns

- Promise (String)

#### Example

```javascript
opskins.getRedirectUrl().then(url => {
  //...do something with the url
});
```

### authenticate

Authenticates the user with oAuth.

#### Parameters

- request (ExpressJsRequest, Object)

#### Returns

- Promise (UserObject)

#### Example

```javascript
opskins.authenticate(req).then(user => {
  //...do something with the user
});
```

### getOAuthClient

Gets the oAuth Client information.

#### Parameters

None.

#### Returns

- Promise (ClientObject)

#### Example

```javascript
opskins.getOAuthClient().then(client => {
  //...do something with the client
});
```

## Objects

### UserObject

Object which holds all the authenticated user's data. The `refresh_token` key is additional so it's emitted only when `permanent` is set to `true`.

#### Example

```javascript
{
  id: 1234567,
  id64: "12345678912345678",
  username: "Example Username",
  avatar: "...",
  preferred_currency: 123,
  preferred_lang: "eng",
  balance: 0,
  credits: 0,
  cryptoBalances: 0,
  access_token: "...",
  refresh_token: "...",
}
```

### ClientObject

Object which holds the oAuth client data.

#### Example

```javascript
{
  clientId: 1234567,
  clientSecret: "...",
}
```

## License

MIT <3
