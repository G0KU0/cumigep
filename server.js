// === SZABY CHAT SERVER (JAVÍTOTT) ===
require('dotenv').config();
const TOKEN = process.env.DISCORD_TOKEN; 
const CHANNEL_ID = process.env.CHANNEL_ID; 

const express = require("express");
const bodyParser = require("body-parser");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const cors = require("cors");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

// KÉT LISTA:
// 1. gameQueue: Ezt olvassa a játék, és olvasás után TÖRLŐDIK (hogy ne spamoljon).
// 2. fullHistory: Ezt látod te a /history oldalon, ez NEM törlődik.
let gameQueue = [];   
let fullHistory = []; 
let typingUsers = {};

// === FŐOLDAL ===
app.get("/", (req, res) => { 
    res.send(`
    <html>
        <body style="background:black; color:white; font-family:monospace;">
            <h1>SYSTEM ONLINE</h1>
            <p>Jatek kapcsolat (NE KATTINTS RA): <span style="color:red">/get-from-discord</span></p>
            <p>WEBES LOG (EZT NEZD): <a href="/history" style="color:lime">/history</a></p>
        </body>
    </html>
    `); 
});

// === SLASH COMMAND ===
const commands = [
    new SlashCommandBuilder()
        .setName('global')
        .setDescription('Rendszerüzenet küldése (Admin)')
        .addStringOption(option => 
            option.setName('szoveg').setDescription('Uzenet').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once("ready", async () => {
  console.log("Bot Online: " + client.user.tag);
  try {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('Parancsok regisztralva.');
  } catch (error) { console.error(error); }
});

// LISTA KEZELÉS
function addToQueues(name, text) {
    const msgObj = { name: name, text: text, time: new Date().toLocaleTimeString() };
    
    // Játéknak (törlődni fog olvasás után)
    gameQueue.push(msgObj);
    
    // Webes lognak (megmarad)
    fullHistory.push(msgObj);
    if (fullHistory.length > 50) fullHistory.shift(); // Utolsó 50 üzenet marad meg
    
    console.log("Uzenet erkezett:", name, text);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'global') {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: 'Nincs jogod!', ephemeral: true });
        }
        const msgContent = interaction.options.getString('szoveg');
        addToQueues("SYSTEM", msgContent);
        await interaction.reply(`📢 Rendszerüzenet: ${msgContent}`);
        const channel = client.channels.cache.get(CHANNEL_ID);
        if (channel) channel.send(`🚨 **RENDSZERÜZENET:** ${msgContent}`);
    }
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;
  addToQueues(message.author.username, message.content);
});

// --- API VÉGPONTOK ---

app.post("/typing", (req, res) => {
    const { name } = req.body;
    if (name) typingUsers[name] = Date.now();
    res.json({ success: true });
});

app.get("/typing", (req, res) => {
    const now = Date.now();
    let activeTypers = [];
    for (const [name, time] of Object.entries(typingUsers)) {
        if (now - time < 3500) activeTypers.push(name);
        else delete typingUsers[name];
    }
    res.json(activeTypers);
});

app.post("/send-to-discord", (req, res) => {
  const { name, text } = req.body;
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (channel && name && text) {
    channel.send(`**${name}**: ${text}`);
    if (typingUsers[name]) delete typingUsers[name]; 
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Hiba" });
  }
});

// === EZT HÍVJA A LUA SCRIPT (FONTOS: TÖRLI A LISTÁT!) ===
app.get("/get-from-discord", (req, res) => {
  res.json(gameQueue);
  gameQueue = []; // EZT NE TÖRÖLD KI, KÜLÖNBEN SPAMOLNI FOG A JÁTÉK!
});

// === EZT NÉZD TE A BÖNGÉSZŐBEN ===
app.get("/history", (req, res) => {
  res.json(fullHistory);
});

client.login(TOKEN);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
