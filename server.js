// === BEÁLLÍTÁSOK (Töltsd ki!) ===
// Vagy hagyd így, ha Render Environment változókat használsz (AJÁNLOTT)
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

// Álcázó oldal
app.get("/", (req, res) => { res.send("SYSTEM ONLINE"); });

let gameQueue = [];
let typingUsers = {};

// === 1. SLASH COMMAND REGISZTRÁCIÓ ===
const commands = [
    new SlashCommandBuilder()
        .setName('global')
        .setDescription('Rendszerüzenet küldése a játékba (Admin)')
        .addStringOption(option => 
            option.setName('szoveg')
                .setDescription('Az üzenet tartalma')
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// === 2. BOT INDÍTÁSA ÉS PARANCSOK BETÖLTÉSE ===
client.once("ready", async () => {
  console.log("Bot Online: " + client.user.tag);
  
  try {
      console.log('Slash parancsok frissítése...');
      // Ez regisztrálja a parancsot a botnak
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('Siker! Használd a /global parancsot Discordon.');
  } catch (error) {
      console.error(error);
  }
});

// === 3. INTERAKCIÓ KEZELÉS (AMIKOR BEÍROD A PARANCSOT) ===
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'global') {
        // Ellenőrizzük, hogy van-e joga (pl. Admin)
        // Ha bárkinek engedni akarod, vedd ki ezt a feltételt:
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: 'Nincs jogod ehhez!', ephemeral: true });
        }

        const msgContent = interaction.options.getString('szoveg');
        
        // Hozzáadjuk a listához "SYSTEM" névvel
        gameQueue.push({
            name: "SYSTEM", // Ez a kulcsszó!
            text: msgContent
        });

        // Válasz Discordon
        await interaction.reply(`📢 **Rendszerüzenet elküldve:** ${msgContent}`);
        
        // Opcionális: Kiírhatja a chat csatornára is, hogy ott is látsszon
        const channel = client.channels.cache.get(CHANNEL_ID);
        if (channel) channel.send(`🚨 **RENDSZERÜZENET:** ${msgContent}`);
    }
});

// Sima chat figyelés
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;
  gameQueue.push({ name: message.author.username, text: message.content });
  if (gameQueue.length > 20) gameQueue.shift();
});

// --- API ---
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

app.get("/get-from-discord", (req, res) => {
  res.json(gameQueue);
  gameQueue = [];
});

client.login(TOKEN);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
