import express from "express";
import axios from "axios";
import { authRouter, getAuthConfig } from "./routes/auth.js";
import bodyParser from "body-parser";
import queryString from "query-string";

const app = express();
const port = 3000;

//The base endpoint I am using for all my simple api calls in this proj
const API_URL = "https://api.spotify.com/v1/me/player";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
//This diverts all auth-related req's to an external file, purely for file org. Acts
//similarly to middleware, and it kinda is auth middleware
app.use("/auth", authRouter);

function errorHandler(error, req) {
  if (error.status === 401 && error.message === "The access token expired") {
    //This just takes the client to refresh the token in auth.js
    //I'm using a query string to pass in the route that tried to used the expired
    //token so that /auth/refreshToken can re-run the failed route with a fresh token
    //to do this, I decided to simply use a query string.
    const query = queryString.stringify({
      routeTokenExpiredOn: req._parsedOriginalUrl.pathname,
    });
    return res.redirect("/auth/refreshToken" + query);
  } else {
    console.log(error.message);

    switch (req._parsedOriginalUrl.pathname) {
      case "/initialPlay":
        console.log("Error playing initial playlist");
        break;
      case "/player":
        console.log("Error starting the music player");
        break;
      case "/togglePlayback":
        console.log("Error playing/pausing the music");
        break;
      case "/previous":
        console.log("Error skipping to previous song");
        break;
      case "/next":
        console.log("Error skipping to next song");
        break;
    }
    return;
  }
}

//serve up the landing page
app.get("/", (req, res) => {
  try {
    res.render("landing.ejs");
  } catch (error) {
    res.status(500);
    errorHandler(error, req);
  }
});

//This route is essentially just to get something playing
app.get("/initialPlay", async (req, res) => {
  try {
    //Get the first active device
    const fetchedDevices = await axios.get(
      API_URL + "/devices",
      getAuthConfig()
    );

    //if active device, play it
    if (fetchedDevices.data.devices[0] != null) {
      const device_id = [fetchedDevices.data.devices[0].id];

      await axios.put(
        API_URL,
        { device_ids: device_id, play: true },
        getAuthConfig()
      );
      return res.redirect("/player");

      //if no active devices, render the /player without data
      //which prompts user to open a spotify app somewhere and try again
    } else {
      res.render("index.ejs");
    }
  } catch (error) {
    res.status(500);
    errorHandler(error, req);
  }
});

//The main "homepage", if you will
app.get("/player", async (req, res) => {
  try {
    const fetchedPlaybackState = await axios.get(
      API_URL + "/currently-playing",
      getAuthConfig()
    );
    const fetchedQueue = await axios.get(API_URL + "/queue", getAuthConfig());

    res.render("index.ejs", {
      trackName: fetchedPlaybackState.data.item.name,
      artistNames: fetchedPlaybackState.data.item.artists,
      imageURL: fetchedPlaybackState.data.item.album.images[0].url,
      queue: fetchedQueue.data.queue,
    });
  } catch (error) {
    res.status(500);
    errorHandler(error, req);
  }
});

app.post("/togglePlayback", async (req, res) => {
  try {
    //First test if there is something currently playing
    //Null is critical for axios.put, since second arg is data, which this req does not have
    const result = await axios.get(API_URL, getAuthConfig());

    if (result.data.is_playing) {
      await axios.put(API_URL + "/pause", null, getAuthConfig());
    } else {
      await axios.put(API_URL + "/play", null, getAuthConfig());
    }
  } catch (error) {
    res.status(500);
    errorHandler(error, req);
  }
});

app.post("/previous", async (req, res) => {
  try {
    const result = await axios.post(
      API_URL + "/previous",
      null,
      getAuthConfig()
    );
    return res.redirect("/player");
  } catch (error) {
    res.status(500);
    errorHandler(error, req);
  }
});

app.post("/next", async (req, res) => {
  try {
    const result = await axios.post(API_URL + "/next", null, getAuthConfig());
    return res.redirect("/player");
  } catch (error) {
    res.status(500);
    errorHandler(error, req);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
