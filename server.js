// === SAJÁT CHAT SZERVER (DISCORD NÉLKÜL) ===
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// === ADATTÁROLÁS (MEMÓRIÁBAN) ===
// Maximum 50 üzenetet tárolunk, hogy ne teljen be a memória
const MAX_MESSAGES = 50;
let chatHistory = [];
let typingUsers = {};

// === WEBES FELÜLET (Hogy lásd böngészőből is) ===
app.get("/", (req, res) => {
    let html = `
    <html>
    <head>
        <title>Saját Chat Szerver</title>
        <meta http-equiv="refresh" content="2"> <style>
            body { background: #111; color: #ddd; font-family: monospace; padding: 20px; }
            .msg { border-bottom: 1px solid #333; padding: 5px 0; }
            .name { color: #4CAF50; font-weight: bold; }
            .time { color: #888; font-size: 0.8em; margin-right: 10px; }
        </style>
    </head>
    <body>
        <h1>SERVER STATUS: ONLINE</h1>
        <div id="chat">`;
    
    // Üzenetek listázása
    chatHistory.forEach(msg => {
        html += `<div class="msg">
                    <span class="time">[${msg.time}]</span>
                    <span class="name">${msg.name}:</span> 
                    ${msg.text}
                 </div>`;
    });

    html += `</div></body></html>`;
    res.send(html);
});

// === ÜZENET KÜLDÉSE (JÁTÉKBÓL) ===
app.post("/send", (req, res) => {
    const { name, text } = req.body;
    
    if (!name || !text) {
        return res.status(400).json({ error: "Hianyzo nev vagy szoveg" });
    }

    const newMessage = {
        id: Date.now(), // Egyedi azonosító
        time: new Date().toLocaleTimeString(),
        name: name,
        text: text
    };

    chatHistory.push(newMessage);

    // Ha túl sok az üzenet, a legrégebbit töröljük
    if (chatHistory.length > MAX_MESSAGES) {
        chatHistory.shift();
    }

    // Ha írt az illető, vegyük ki a gépelők közül
    if (typingUsers[name]) delete typingUsers[name];

    res.json({ success: true });
});

// === ÜZENETEK LEKÉRÉSE (JÁTÉKNAK) ===
app.get("/get", (req, res) => {
    // Visszaküldjük a teljes jelenlegi listát
    // A Lua script dolga lesz, hogy ne írja ki duplán
    res.json(chatHistory);
});

// === GÉPELÉS JELZÉSE ===
app.post("/typing", (req, res) => {
    const { name } = req.body;
    if (name) typingUsers[name] = Date.now();
    res.json({ success: true });
});

app.get("/typing", (req, res) => {
    const now = Date.now();
    let activeTypers = [];
    for (const [name, time] of Object.entries(typingUsers)) {
        // Ha 3 másodpercen belül jelezte, hogy ír, akkor aktív
        if (now - time < 3500) activeTypers.push(name);
        else delete typingUsers[name];
    }
    res.json(activeTypers);
});

// === SZERVER INDÍTÁSA ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sajat chat szerver fut a ${PORT}-es porton.`);
});
