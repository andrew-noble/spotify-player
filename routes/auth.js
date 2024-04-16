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
//which is why it is being used like app is in index.js
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
    "user-read-currently-playing user-modify-playback-state user-read-playback-state playlist-read-private";

  res.redirect(
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
    } else {
      //side note: axios stringifies stuff into json automatically, hence why no quotes around grant_type etc
      var body = {
        grant_type: "authorization_code",
        redirect_uri: "http://localhost:3000/auth/callback",
        code: code,
      };

      const result = await axios.post(
        "https://accounts.spotify.com/api/token",
        body,
        config
      );

      access_token = result.data.access_token;
      refresh_token = result.data.refresh_token;

      res.redirect("/initialPlay");
    }
  } catch (error) {
    console.log(error);
    console.log("Error retrieving the auth token");
    res.status(500);
  }
});

//add refresh functionality in later. Probably every business-logic route in index.js needs
//to send you here to the refresh in the case that they get a expired token warning.
// app.get("/refreshToken", async (req,res) => {
//   const result = await axios.get()
// })
