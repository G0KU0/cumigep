// Betöltjük a környezeti változókat (ha helyben futtatod)
require('dotenv').config();

// === ITT A VÁLTOZÁS: process.env ===
const TOKEN = process.env.DISCORD_TOKEN; 
const CHANNEL_ID = process.env.CHANNEL_ID; 

// Ellenőrzés: Ha nincsenek beállítva, szóljon a szerver
if (!TOKEN || !CHANNEL_ID) {
    console.error("HIBA: Nincs beállítva a DISCORD_TOKEN vagy a CHANNEL_ID az Environment Variables-ben!");
    process.exit(1);
}

const express = require("express");
const bodyParser = require("body-parser");
const { Client, GatewayIntentBits } = require("discord.js");
const cors = require("cors");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Álcázó weboldal
app.get("/", (req, res) => {
    res.send(`
    <html>
        <head><title>System Status</title><style>body{background:#000;color:#0f0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}</style></head>
        <body><h1>SECURE CONNECTION ESTABLISHED<br>ENV VARIABLES: OK</h1></body>
    </html>
    `);
});

let gameQueue = [];

client.once("ready", () => {
  console.log("Secure Bot Online: " + client.user.tag);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;

  gameQueue.push({
    name: message.author.username,
    text: message.content
  });

  if (gameQueue.length > 15) gameQueue.shift();
});

app.post("/send-to-discord", (req, res) => {
  const { name, text } = req.body;
  const channel = client.channels.cache.get(CHANNEL_ID);
  
  if (channel && name && text) {
    channel.send(`**${name}**: ${text}`);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Hiba" });
  }
});

app.get("/get-from-discord", (req, res) => {
  res.json(gameQueue);
  gameQueue = [];
});

client.login(TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
