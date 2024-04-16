import express from "express";
import axios from "axios";
import { authRouter, getAuthConfig } from "./routes/auth.js";

const app = express();
const port = 3000;

//The base endpoint I am using for all my simple api calls in this proj
const API_URL = "https://api.spotify.com/v1/me/player";

app.use(express.static("public"));
//This diverts all auth-related req's to an external file, purely for file org. Acts
//similarly to middleware, and it kinda is auth middleware
app.use("/auth", authRouter);

//serve up the landing page
app.get("/", (req, res) => {
  try {
    res.render("landing.ejs");
  } catch (error) {
    console.log(error.message);
    res.status(500);
  }
});

app.get("/player", async (req, res) => {
  try {
    const result = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      getAuthConfig()
    );
    const result2 = await axios.get(
      "https://api.spotify.com/v1/me/player/queue",
      getAuthConfig()
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
      getAuthConfig()
    );

    const device_id = [devices.data.devices[0].id];

    //transfer playback to the active device
    await axios.put(
      "https://api.spotify.com/v1/me/player",
      { device_ids: device_id, play: false },
      getAuthConfig()
    );

    //randomly pick one of the users' playlists to start playing initially
    const playlists = await axios.get(
      "https://api.spotify.com/v1/me/playlists",
      getAuthConfig()
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
      getAuthConfig()
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
      getAuthConfig()
    );

    //Null is critical for axios.put, since second arg is data, which this req does not have
    if (result.data.is_playing) {
      await axios.put(
        "https://api.spotify.com/v1/me/player/pause",
        null,
        getAuthConfig()
      );
    } else {
      await axios.put(
        "https://api.spotify.com/v1/me/player/play",
        null,
        getAuthConfig()
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
      getAuthConfig()
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
      getAuthConfig()
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
