const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs"), https = require("https");
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const utentiInPartita = new Set(), timerUscitaUtenti = new Map();
let ultimoPianetaDSS = "", idUltimoOrdineGlobale = 0, primoAvvioDSS = true, primoAvvioOrdine = true;
const { DISCORD_TOKEN, DISCORD_CHANNEL_ID, DSS_CHANNEL_ID, ORDINI_CHANNEL_ID, NEWS_CHANNEL_ID, OWNER_USERNAME } = process.env;
const commands = [
    new SlashCommandBuilder().setName("inizia").setDescription("🚀 Inizia"),
    new SlashCommandBuilder().setName("termina").setDescription("🚀 Termina")
].map(c => c.toJSON());
client.on("ready", async () => {
    console.log("Bot ONLINE! Autenticato come: " + client.user.tag);
    try { await new REST({ version: "10" }).setToken(DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands }); } catch (e) {}
    setTimeout(() => {
        inviaFissi(); controllaDSS(); controllaMO();
        setInterval(controllaDSS, 60000); setInterval(controllaMO, 300000);
    }, 5000);
});
client.on("interactionCreate", async (i) => {
    if (!i.isChatInputCommand() || i.user.username !== OWNER_USERNAME) return;
    if (i.commandName === "inizia") {
        inviaGiocatori(DISCORD_CHANNEL_ID, 0xFFDF00, "🚀 ORDINE DALLA SUPER TERRA", "Helldiver Schierato in Orbita", `Il soldato **${i.user.username}** si è appena schierato su **HELLDIVERS™ 2**!`);
        await i.reply({ content: "✅ Schieramento registrato!", ephemeral: true });
    }
    if (i.commandName === "termina") {
        inviaGiocatori(DISCORD_CHANNEL_ID, 0x8B0000, "🚀 FRONTE GALATTICO", "Rientro alla Base Completo", `Il soldato **${i.user.username}** è **rientrato sulla sua nave spaziale**.`);
        await i.reply({ content: "🛑 Rientro alla base registrato!", ephemeral: true });
    }
});
function inviaFissi() {
    try {
        const oCh = client.channels.cache.get(ORDINI_CHANNEL_ID);
        if (oCh) {
            const emb = new EmbedBuilder().setColor(0xFFD700).setAuthor({ name: "💀 ALTO COMANDO" }).setTitle("⚠️ DISPACCIO UFFICIALE: SISTEMA ATTIVO").setDescription(`✉️ **Briefing:**\n*Il sistema dell'Alto Comando è configurato H24.*\n\n🎯 **Obiettivo:**\nIn attesa di nuove direttive urgenti dal Comando Centrale.\n\n🏅 **Ricompensa:** 🏅 **50 Medaglie**`).setTimestamp();
            let files = fs.existsSync("./ordine.png") ? [new AttachmentBuilder("./ordine.png")] : [];
            if (files.length > 0) emb.setImage("attachment://ordine.png");
            const btn = new ButtonBuilder().setLabel("💀 HDC/major_orders").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#overview");
            oCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
        }
        const dCh = client.channels.cache.get(DSS_CHANNEL_ID);
        if (dCh) {
            const emb = new EmbedBuilder().setColor(0x00AEFF).setAuthor({ name: "🛰️ COMANDO DSS" }).setTitle("Stazione Spaziale Collegata").setDescription("🛰️ **Sincronizzazione Radar Completata!**\n\n📍 **Fronte Attuale:** `REGISTRO IN AGGIORNAMENTO`").setTimestamp();
            let files = fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : [];
            if (files.length > 0) emb.setImage("attachment://logo.png");
            const btn = new ButtonBuilder().setLabel("💀 HDC/space_stations").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#hellpad/stations");
            dCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
        }
        const nCh = client.channels.cache.get(NEWS_CHANNEL_ID);
        if (nCh) {
            const emb = new EmbedBuilder().setColor(0xEE82EE).setAuthor({ name: "📺 MINISTERO" }).setTitle("📰 CANALE NOTIZIE ATTIVO").setDescription(`📢 **Bollettino:**\n*La plancia è sincronizzata con la rete internet planetaria.*\n\n🛰️ **Fronte:**\nIn ascolto dei comunicati del Generale Bresch.`).setTimestamp();
            let files = fs.existsSync("./news.png") ? [new AttachmentBuilder("./news.png")] : [];
            if (files.length > 0) emb.setImage("attachment://news.png");
            const btn = new ButtonBuilder().setLabel("💀 HDC/news_feed").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#news");
            nCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
        }
    } catch (e) {}
}
function controllaMO() {
    try {
        https.get({ hostname: 'api.helldivers2.dev', path: '/v1/assignments', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'it-IT' } }, (res) => {
            let data = ""; res.on("data", (c) => data += c);
            res.on("end", () => {
                try {
                    if (res.statusCode !== 200) return;
                    let json = JSON.parse(data); if (!json) return;
                    let o = Array.isArray(json) ? json[0] : json; if (!o || typeof o !== 'object') return;
                    const id = o.id || o.id32 || 1;
                    if (primoAvvioOrdine || id !== idUltimoOrdineGlobale) {
                        primoAvvioOrdine = false; idUltimoOrdineGlobale = id;
                        const ch = client.channels.cache.get(ORDINI_CHANNEL_ID); if (!ch) return;
                        const emb = new EmbedBuilder().setColor(0xFFD700).setAuthor({ name: "💀 ALTO COMANDO" }).setTitle(`⚠️ DISPACCIO: ${(o.title || "ORDINE").toUpperCase()}`).setDescription(`🎯 **Obiettivo:**\n${o.description || ""}`).setTimestamp();
                        let files = fs.existsSync("./ordine.png") ? [new AttachmentBuilder("./ordine.png")] : []; if (files.length > 0) emb.setImage("attachment://ordine.png");
                        const btn = new ButtonBuilder().setLabel("💀 HDC/major_orders").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#overview");
                        ch.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
                    }
                } catch (err) {}
            });
        });
    } catch (e) {}
}
function controllaDSS() {
    try {
        https.get({ hostname: 'api.helldivers2.dev', path: '/v1/space-station', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = ""; res.on("data", (c) => data += c);
            res.on("end", () => {
                try {
                    if (res.statusCode !== 200) return;
                    const d = JSON.parse(data); if (!d) return;
                    let p = d.planet?.name || d.planetName || "", s = d.planet?.sector || d.sector || "";
                    let pos = p ? (s ? `${s.toUpperCase()} — ${p.toUpperCase()}` : p.toUpperCase()) : "✨ SETTORE OPERATIVO TOP SECRET ✨";
                    if (pos !== "✨ SETTORE OPERATIVO TOP SECRET ✨" && (primoAvvioDSS || pos !== ultimoPianetaDSS)) {
                        primoAvvioDSS = false; ultimoPianetaDSS = pos;
                        const ch = client.channels.cache.get(DSS_CHANNEL_ID); if (!ch) return;
                        const emb = new EmbedBuilder().setColor(0x00AEFF).setAuthor({ name: "🛰️ COMANDO DSS" }).setTitle("🛰️ RILEVATO SALTO ORBITALE DELLA DSS!").setDescription(`La Stazione Spaziale della Democrazia si è spostata nel settore:\n\n📍 **\`\${pos}\`**`).setTimestamp();
                        let files = fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : []; if (files.length > 0) emb.setImage("attachment://logo.png");
                        const btn = new ButtonBuilder().setLabel("💀 HDC/space_stations").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#hellpad/stations");
                        ch.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
                    }
                } catch (err) {}
            });
        });
    } catch (e) {}
}
function inviaGiocatori(canaleId, colore, autore, titolo, descrizione) {
    const channel = client.channels.cache.get(canaleId); if (!channel) return;
    let files = fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : [];
    const emb = new EmbedBuilder().setColor(colore).setAuthor({ name: autore }).setTitle(titolo).setDescription(descrizione).setTimestamp();
    if (files.length > 0) emb.setImage("attachment://logo.png");
    channel.send({ embeds: [emb], files }).catch(() => {});
}
client.on("error", () => {}); process.on("unhandledRejection", () => {}); client.login(DISCORD_TOKEN);
