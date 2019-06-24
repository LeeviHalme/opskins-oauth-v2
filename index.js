// Require Dependencies
const axios = require("axios");
const crypto = require("crypto");

// Main Class
class OpskinsAuth {
  constructor({ name, returnUrl, apiKey, scopes, mobile, permanent }) {
    if (!name || !returnUrl || !apiKey)
      throw new Error(
        "Missing name, returnURL or apiKey parameter(s). These are required."
      );

    this.name = name;
    this.returnUrl = returnUrl;
    this.plainTextApiKey = apiKey;
    this.scopes = scopes || "identity";
    this.mobile = mobile || false;
    this.permanent = permanent || false;
    this.states = [];

    // Setup oAuth Client
    this.setupClient();
  }

  async setupClient() {
    // Get api key that is used for requests
    this.apiKey = Buffer.from(this.plainTextApiKey + ":", "ascii").toString(
      "base64"
    );

    try {
      let config = {
        method: "GET",
        url: "https://api.opskins.com/IOAuth/GetOwnedClientList/v1/",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json; charset=utf-8"
        }
      };

      let {
        data: { response }
      } = await axios(config);

      // Remove existing clients
      for (let index = 0; index < response.clients.length; index++) {
        const client = response.clients[index];

        if (client.name === this.name) {
          const config = {
            method: "POST",
            url: "https://api.opskins.com/IOAuth/DeleteClient/v1/",
            headers: {
              Authorization: `Basic ${this.apiKey}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            data: `client_id=${client.client_id}`
          };

          const { data } = await axios(config);
          if (data.status !== 1)
            throw new Error("Error with the OPSkins API: " + data.message);
        }
      }

      // Create a new client
      config = {
        method: "POST",
        url: "https://api.opskins.com/IOAuth/CreateClient/v1/",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json; charset=utf-8"
        },
        data: {
          name: this.name,
          redirect_uri: this.returnUrl,
          can_keep_secret: 1
        }
      };

      let { data: apiResponse } = await axios(config);
      let {
        response: { client }
      } = apiResponse;

      if (apiResponse.status !== 1)
        throw new Error("Error with the OPSkins API: " + apiResponse.message);

      this.clientId = client.client_id;
      this.clientSecret = apiResponse.response.secret;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new Error(
          "API Key is invalid. Remember that API keys are CaSe SeNsItIvE."
        );
      } else {
        console.error(error);
      }
    }
  }

  // Get redirect url for OPSkins
  async getRedirectUrl() {
    return new Promise(async resolve => {
      const random = crypto.randomBytes(4).toString("hex");
      this.states = [...this.states, random];

      const redirectUrl = `https://oauth.opskins.com/v1/authorize?state=${random}&client_id=${
        this.clientId
      }&response_type=code&scope=${this.scopes}${
        this.mobile ? "&mobile=1" : ""
      }${this.permanent ? "&duration=permanent" : ""}`;
      resolve(redirectUrl);
    });
  }

  // Authenticate user
  async authenticate(req) {
    return new Promise(async (resolve, reject) => {
      if (req.query.error) reject("User denied access.");
      if (!req.query.code) reject("No authorization code provided.");

      // Check if authentication originated from this server
      let originated = false;
      this.states.map(
        state => state === req.query.state && (originated = true)
      );

      if (!originated)
        reject("Authentication did not originate from this server.");

      try {
        const authKey = Buffer.from(
          this.clientId + ":" + this.clientSecret
        ).toString("base64");

        // Get user access token
        let config = {
          method: "POST",
          url: "https://oauth.opskins.com/v1/access_token",
          headers: {
            Authorization: `Basic ${authKey}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          data: `grant_type=authorization_code&code=${req.query.code}`
        };

        let response = await axios(config);
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;

        // Get user profile
        config = {
          method: "GET",
          url: "https://api.opskins.com/IUser/GetProfile/v1/",
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        };

        response = await axios(config);

        if (response.data.status !== 1)
          throw new Error(
            "Error with the OPSkins API: " + response.data.message
          );

        const user = {
          ...response.data.response,
          balance: response.data.balance,
          credits: response.data.credits,
          cryptoBalances: response.data.cryptoBalances,
          accessToken,
          refreshToken
        };

        resolve(user);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log(error.response);
        }
      }
    });
  }

  // Get oAuth Client Information
  async getOAuthClient() {
    return new Promise(resolve => {
      resolve({ clientId: this.clientId, clientSecret: this.clientSecret });
    });
  }
}

// Export class
module.exports = OpskinsAuth;
