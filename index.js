import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import queryString from "query-string";
import "dotenv/config";

const app = express();
const port = 3000;

//The base endpoint I am using for all my simple api calls in this proj
const API_URL = "https://api.spotify.com/v1/me/player";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//serve up the landing page
app.get("/", (req, res) => {
  try {
    res.render("landing.ejs");
  } catch (error) {
    console.log(error.message);
    res.status(500);
  }
});

//------------------------------------------- AUTHENTICATION ---------------------------------
let access_token;
let refresh_token;

client_secret = process.env.CLIENT_SECRET;
client_id = process.env.CLIENT_ID;
const redirect_uri = "http://localhost:3000/callback"; //where spotify sends user after auth

//The config needs to be dynamically generated since the access_token will be changing.
function getConfig() {
  return {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };
}

//This route sends the user to spotify to authorize that my app can
//see whats playing, manipulate it, etc. See https://developer.spotify.com/documentation/web-api/tutorials/code-flow
app.get("/login", (req, res) => {
  var state = (Math.random() + 1).toString(36).substring(7); //rando value to avoid CSRF. It gets passed back later
  //the functionality scopes I am asking user to give me access to
  var scope =
    "user-read-currently-playing user-modify-playback-state user-read-playback-state playlist-read-private";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      queryString.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

//This route requests an access token from spotify following user's approval in /login
app.get("/callback", async (req, res) => {
  var code = req.query.code || null; //In JS, || returns first operand if coercable into truthy, second if not.
  var state = req.query.state || null;
  const auth_config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
  };

  try {
    if (state === null) {
      //This is the code that would catch a CSRF
      res.status(500);
    } else {
      //side note: axios stringifies stuff into json automatically, hence why no quotes around grant_type etc
      var body = {
        grant_type: "authorization_code",
        redirect_uri: redirect_uri,
        code: code,
      };
      const result = await axios.post(
        "https://accounts.spotify.com/api/token",
        body,
        auth_config
      );
      access_token = result.data.access_token;
      refresh_token = result.data.refresh_token;

      res.redirect("/initialPlay");
    }
  } catch (error) {
    console.log(error.message);
    console.log("Error retrieving the auth token");
    res.status(500);
  }
});

//add refresh functionality in later
// app.get("/refreshToken", async (req,res) => {
//   const result = await axios.get()
// })

//------------------------------------------------------------------------------------------------

app.get("/player", async (req, res) => {
  try {
    const result = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      getConfig()
    );
    const result2 = await axios.get(
      "https://api.spotify.com/v1/me/player/queue",
      getConfig()
    );

    res.render("index.ejs", {
      trackName: result.data.item.name,
      artistNames: result.data.item.artists,
      imageURL: result.data.item.album.images[0].url,
      queue: result2.data.queue,
    });
  } catch (error) {
    console.log(error.response);
    console.log("Error starting the music player");
    res.status(500);
  }
});

app.get("/initialPlay", async (req, res) => {
  try {
    //Get the first active device
    const devices = await axios.get(
      "https://api.spotify.com/v1/me/player/devices",
      getConfig()
    );

    const device_id = [devices.data.devices[0].id];

    //transfer playback to the active device
    await axios.put(
      "https://api.spotify.com/v1/me/player",
      { device_ids: device_id, play: false },
      getConfig()
    );

    //randomly pick one of the users' playlists to start playing initially
    const playlists = await axios.get(
      "https://api.spotify.com/v1/me/playlists",
      getConfig()
    );

    //pick a rando playlist
    const playlist =
      playlists.data.items[
        Math.floor(Math.random() * playlists.data.items.length)
      ];

    await axios.put(
      `https://api.spotify.com/v1/me/player/play?device=${device_id}`,
      {
        "context-uri": playlist.uri,
      },
      getConfig()
    );

    res.redirect("/player");
  } catch (error) {
    console.log(error);
    console.log("Error playing initial playlist");
  }
});

app.post("/togglePlayback", async (req, res) => {
  try {
    //First test if there is something currently playing

    const result = await axios.get(
      "https://api.spotify.com/v1/me/player",
      getConfig()
    );

    //Null is critical for axios.put, since second arg is data, which this req does not have
    if (result.data.is_playing) {
      await axios.put(
        "https://api.spotify.com/v1/me/player/pause",
        null,
        getConfig()
      );
    } else {
      await axios.put(
        "https://api.spotify.com/v1/me/player/play",
        null,
        getConfig()
      );
    }
  } catch (error) {
    console.log(error.response.data.error);
    // console.log("Error toggling playback state");
  }
});

app.post("/previous", async (req, res) => {
  try {
    const result = await axios.post(
      "https://api.spotify.com/v1/me/player/previous",
      null,
      getConfig()
    );

    res.redirect("/player");
  } catch (error) {
    console.log(error.response.data.error);
    console.log("Error skipping to previous song");
  }
});

app.post("/next", async (req, res) => {
  try {
    const result = await axios.post(
      "https://api.spotify.com/v1/me/player/next",
      null,
      getConfig()
    );

    res.redirect("/player");
  } catch (error) {
    console.log(error.response.data.error);
    console.log("Error skipping to next song");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
