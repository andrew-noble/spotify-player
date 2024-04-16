import express from "express";
import axios from "axios";
import queryString from "query-string";
//package for loading environment variables from .env (in gitignore)
import "dotenv/config";

let access_token;
let refresh_token;

const client_secret = process.env.CLIENT_SECRET;
const client_id = process.env.CLIENT_ID;

//This object is how /auth/... reqs are diverted here from index.js. The router obj like a 'sub-app"
//which is why it is being used like app is in index.js. See: https://expressjs.com/en/4x/api.html#router
export const authRouter = express.Router();

//This is how business logic routes retrieve the currently active access_token
export function getAuthConfig() {
  return {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };
}
//auth step 1: send user to Spotify to grant us permisson
authRouter.get("/login", (req, res) => {
  var state = (Math.random() + 1).toString(36).substring(7); //rando value to avoid CSRF. returned later
  var scope =
    "user-read-currently-playing user-modify-playback-state user-read-playback-state user-read-recently-played";

  return res.redirect(
    "https://accounts.spotify.com/authorize?" +
      queryString.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: "http://localhost:3000/auth/callback", //where spotify sends user back to (below)
        state: state,
      })
  );
});

//Auth step 2: spotify returns user to this route so we can go ahead and get a token now that they gave us
//permission.
authRouter.get("/callback", async (req, res) => {
  var code = req.query.code || null; //In JS, || returns first operand if coercable into truthy, second if not.
  var state = req.query.state || null;
  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
  };

  try {
    if (state === null) {
      //This is the code that would catch a CSRF-- doubt anyone's targetting my lil app lol
      res.status(500);
      return res.send("State is missing, possible CSRF");
    } else {
      //side note: axios stringifies stuff into json automatically, hence why no quotes around grant_type etc
      const payload = {
        grant_type: "authorization_code",
        redirect_uri: "http://localhost:3000/auth/callback",
        code: code,
      };

      const result = await axios.post(
        "https://accounts.spotify.com/api/token",
        payload,
        config
      );

      //access_token = result.data.access_token;
      refresh_token = result.data.refresh_token;

      return res.redirect("/initialPlay");
    }
  } catch (error) {
    console.log(error);
    console.log("Error retrieving the auth token");
    res.status(500);
  }
});

//Refresh functionality that will prob never get used.
//Every business-logic route in index.js needs to send client here
//in the case that they get a expired token warning.

authRouter.get("/refreshToken", async (req, res) => {
  const payload = {
    grant_type: "authorization_code",
    refresh_token: refresh_token,
  };

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      new Buffer.from(client_id + ":" + client_secret).toString("base64"),
  };

  const result = await axios.post(
    "https://accounts.spotify.com/api/token",
    payload,
    headers
  );

  access_token = result.data.access_token;

  //Weirdly don't get a new refresh token like the docs say i should,
  // but o.g. one works for me, so if'ing this.
  if (result.data.refresh_token) {
    refresh_token = result.data.refresh_token;
  } else {
  }

  return res.redirect(req.query.routeTokenExpiredOn);
});
