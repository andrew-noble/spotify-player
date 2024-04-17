# Simple Spotify Playback App

This is a simple spotify app that reproduces some features of an audio player you might find in Spotify's own desktop or smartphone apps.
I am sharing it here in case someone else who is learning web development wants to check it out, or, even better, wants to give me feedback.

## Features

- full OAuth 2.0 Authentication, per [Spotify's "authorization code" flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- pauses playback, resumes playback, skips to next track, skips to previous track
- displays song title, artist(s), and album cover
- displays next 10 songs in the queue

## Getting started

1. Clone the repo
2. In the folder where you cloned the repo to, install the node packages with `npm i`
3. Create a .env file in in the repo with `touch .env`
4. [Set up an app in your spotify premium account](https://developer.spotify.com/documentation/web-api/tutorials/getting-started#create-an-app) 
    - Set the redirect uri to: http://localhost:3000/auth/callback
    - Add "Web API" to the list of APIs used
5. From the settings page of the app you just set up, get the client_secret and client_id strings and add them to your .env file like so:
    ```
    CLIENT_SECRET=<your-client-secret>
    CLIENT_ID=<your-client-id>
    ```
6. You should be all set. Go ahead and run the app with `node index.js`, and navigate to http://localhost:3000 in your browser to try out the app.
