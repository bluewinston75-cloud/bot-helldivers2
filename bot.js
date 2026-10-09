const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const https = require("https");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const utentiInPartita = new Set();
const timerUscitaUtenti = new Map();
let ultimoPianetaDSS = "", idUltimoOrdineGlobale = 0, primoAvvioDSS = true, primoAvvioOrdine = true;

const { DISCORD_TOKEN, DISCORD_CHANNEL_ID, DSS_CHANNEL_ID, ORDINI_CHANNEL_ID, NEWS_CHANNEL_ID, OWNER_USERNAME } = process.env;

const commands = [
    new SlashCommandBuilder().setName("inizia").setDescription("🚀 Schierati in orbita"),
    new SlashCommandBuilder().setName("termina").setDescription("🚀 Rientra alla base")
].map(c => c.toJSON());

client.on("ready", async () => {
    console.log("Bot ONLINE! Autenticato come: " + client.user.tag);
    try {
        await new REST({ version: "10" }).setToken(DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { console.error(e); }
    
    // Timer di sicurezza di 5 secondi prima di inviare i messaggi e attivare i radar
    setTimeout(() => {
        inviaMessaggiFissi();
        controllaSpostamentoDSS();
        controllaOrdineGlobale();
        setInterval(controllaSpostamentoDSS, 60000);
        setInterval(controllaOrdineGlobale, 300000);
    }, 5000);
});

client.on("interactionCreate", async (int) => {
    if (!int.isChatInputCommand() || int.user.username !== OWNER_USERNAME) return;
    if (int.commandName === "inizia") {
        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0xFFDF00, "🚀 ORDINE DALLA SUPER TERRA", "Helldiver Schierato in Orbita", `Il soldato **${int.user.username}** si è appena schierato su **HELLDIVERS™ 2**!`);
        await int.reply({ content: "✅ Schieramento registrato!", ephemeral: true });
    }
    if (int.commandName === "termina") {
        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0x8B0000, "🚀 FRONTE GALATTICO", "Rientro alla Base Completo", `Il soldato **${int.user.username}** è **rientrato sulla sua nave spaziale**.`);
        await int.reply({ content: "🛑 Rientro alla base registrato!", ephemeral: true });
    }
});

function inviaMessaggiFissi() {
    try {
        // 1. ORDINI ALTO COMANDO
        const ordiniCh = client.channels.cache.get(ORDINI_CHANNEL_ID);
        if (ordiniCh) {
            const emb = new EmbedBuilder().setColor(0xFFD700).setAuthor({ name: "💀 ALTO COMANDO DELLA SUPER TERRA" }).setTitle("⚠️ DISPACCIO UFFICIALE: SISTEMA DI TRASMISSIONE ATTIVO").setDescription(`✉️ **Briefing di Guerra:**\n*Il sistema di ricezione dell'Alto Comando è stato potenziato e configurato con successo. Le plance tattiche sono allineate H24.*\n\n🎯 **Obiettivo Strategico:**\nIn attesa di nuove direttive urgenti sul fronte galattico dal Comando Centrale. Tenere i motori delle navi spaziali accesi.\n\n🎁 **Ricompensa della Vittoria:**\n🏅 **50 Medaglie di Schieramento**`).setTimestamp();
            let files = fs.existsSync("./ordine.png") ? [new AttachmentBuilder("./ordine.png")] : [];
            if (files.length > 0) emb.setImage("attachment://ordine.png");
            const btn = new ButtonBuilder().setLabel("💀 HDC/major_orders").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#overview");
            ordiniCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
        }

        // 2. STAZIONE SPAZIALE (DSS)
        const dssCh = client.channels.cache.get(DSS_CHANNEL_ID);
        if (dssCh) {
            const emb = new EmbedBuilder().setColor(0x00AEFF).setAuthor({ name: "🛰️ COMANDO STRATEGICO SUPER TERRA" }).setTitle("Stazione Spaziale della Democrazia (DSS) Collegata").setDescription("🛰️ **Sincronizzazione Radar Completata!**\n\nLa Stazione Spaziale ha agganciato i sistemi di tracciamento satellitari del server.\n\n📍 **Fronte Attuale:** `REGISTRO OPERATIVO IN AGGIORNAMENTO`\n\n🛸 *Tutte le navi spaziali nell'area sono invitate a consultare i registri orbitali per i voti tattici.*").setTimestamp();
            let files = fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : [];
            if (files.length > 0) emb.setImage("attachment://logo.png");
            const btn = new ButtonBuilder().setLabel("💀 HDC/space_stations").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#hellpad/stations");
            dssCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
        }

        // 3. NEWS DI LOGISTICA
        const newsCh = client.channels.cache.get(NEWS_CHANNEL_ID);
        if (newsCh) {
            const emb = new EmbedBuilder().setColor(0xEE82EE).setAuthor({ name: "📺 MINISTERO DELLA VERITÀ" }).setTitle("📰 CANALE NOTIZIE DI GALASSIA ATTIVO").setDescription(`📢 **Bollettino Informativo:**\n*La plancia dei corrispondenti di guerra della Super Terra è stata sincronizzata con la rete internet planetaria.*\n\n🛰️ **Fronte di Monitoraggio:**\nIl bot è in ascolto per intercettare i comunicati di recensione, le manutenzioni logistiche e i briefing strategici del Generale Bresch.`).setTimestamp();
            let files = fs.existsSync("./news.png") ? [new AttachmentBuilder("./news.png")] : [];
            if (files.length > 0) emb.setImage("attachment://news.png");
            const btn = new ButtonBuilder().setLabel("💀 HDC/news_feed").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#news");
            newsCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
        }
    } catch (e) {}
}

function controllaOrdineGlobale() {
    try {
        const opz = { hostname: 'api.helldivers2.dev', path: '/v1/assignments', method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'it-IT' } };
        https.get(opz, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    if (res.statusCode !== 200) return;
                    let jsonParsed = JSON.parse(data);
                    if (!jsonParsed) return;
                    let o = Array.isArray(jsonParsed) ? jsonParsed : jsonParsed;
                    if (!o || typeof o !== 'object') return;
                    const id = o.id || o.id32 || 1;
                    if (primoAvvioOrdine || id !== idUltimoOrdineGlobale) {
                        primoAvvioOrdine = false; idUltimoOrdineGlobale = id;
                        const ch = client.channels.cache.get(ORDINI_CHANNEL_ID);
                        if (!ch) return;
                        const emb = new EmbedBuilder().setColor(0xFFD700).setAuthor({ name: "💀 ALTO COMANDO" }).setTitle(`⚠️ DISPACCIO: ${(o.title || "ORDINE").toUpperCase()}`).setDescription(`🎯 **Obiettivo:**\n${o.description || ""}`).setTimestamp();
                        let files = fs.existsSync("./ordine.png") ? [new AttachmentBuilder("./ordine.png")] : [];
                        if (files.length > 0) emb.setImage("attachment://ordine.png");
                        const btn = new ButtonBuilder().setLabel("💀 HDC/major_orders").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#overview");
                        ch.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
                    }
                } catch (err) {}
            });
        }).on("error", () => {});
    } catch (e) {}
}

function controllaSpostamentoDSS() {
    try {
        const opz = { hostname: 'api.helldivers2.dev', path: '/v1/space-station', method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } };
        https.get(opz, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    if (res.statusCode !== 200) return;
                    const d = JSON.parse(data);
                    if (!d) return;
                    let p = d.planet?.name || d.planetName || "";
                    let s = d.planet?.sector || d.sector || "";
                    let pos = p ? (s ? `${s.toUpperCase()} — ${p.toUpperCase()}` : p.toUpperCase()) : "✨ SETTORE OPERATIVO TOP SECRET ✨";
                    if (pos !== "✨ SETTORE OPERATIVO TOP SECRET ✨" && (primoAvvioDSS || pos !== ultimoPianetaDSS)) {
                        primoAvvioDSS = false; ultimoPianetaDSS = pos;
                        const ch = client.channels.cache.get(DSS_CHANNEL_ID);
                        if (!ch) return;
                        const emb = new EmbedBuilder().setColor(0x00AEFF).setAuthor({ name: "🛰️ COMANDO DSS" }).setTitle("🛰️ RILEVATO SALTO ORBITALE DELLA DSS!").setDescription(`La Stazione Spaziale della Democrazia si è spostata nel settore:\n\n📍 **\`${pos}\`**`).setTimestamp();
                        let files = fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : [];
                        if (files.length > 0) emb.setImage("attachment://logo.png");
                        const btn = new ButtonBuilder().setLabel("💀 HDC/space_stations").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#hellpad/stations");
                        ch.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
                    }
                } catch (err) {}
            });
        }).on("error", () => {});
    } catch (e) {}
}

function inviaEmbedGiocatori(canaleId, colore, autore, titolo, descrizione) {
    const channel = client.channels.cache.get(canaleId);
    if (!channel) return;
    let files = fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : [];
