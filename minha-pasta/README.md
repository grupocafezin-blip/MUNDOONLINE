Multiplayer example for "Clique na Cor Certa".
- server.js: Node + Express + Socket.io server handling rooms and multiplier.
- public/index.html: Lobby UI to create or join rooms, hosts the game in an iframe (public/game.html).
- public/game.html: your single-player game file with a small multiplayer bridge script injected.

How to run locally:
1. npm install
2. npm start
3. Open http://localhost:3000/

Deploying to Render:
- Create a new Web Service, connect your GitHub repo containing this project.
- Build command: npm install
- Start command: npm start
- Make sure port is set from environment (server.js uses process.env.PORT)

Notes:
- This is a simple example to show room creation and a multiplier mechanic server-side.
- The game sends messages to parent via postMessage; you must call window.sendScoreHit(true/false) in your game when a hit occurs.