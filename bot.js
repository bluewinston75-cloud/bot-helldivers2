const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const https = require("https");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const utentiInPartita = new Set();
const timerUscitaUtenti = new Map();

let ultimoPianetaDSS = ""; 
let idUltimoOrdineGlobale = 0;
let primoAvvioDSS = true;
let primoAvvioOrdine = true;

// Dichiarazione esplicita e sicura delle variabili d'ambiente
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; 
const DSS_CHANNEL_ID = process.env.DSS_CHANNEL_ID;       
const ORDINI_CHANNEL_ID = process.env.ORDINI_CHANNEL_ID; 
const NEWS_CHANNEL_ID = process.env.NEWS_CHANNEL_ID; 
const OWNER_USERNAME = process.env.OWNER_USERNAME;       

const commands = [
    new SlashCommandBuilder().setName("inizia").setDescription("🚀 Schierati in orbita (Solo per winstonblue76)"),
    new SlashCommandBuilder().setName("termina").setDescription("🚀 Rientra alla base (Solo per winstonblue76)")
].map(c => c.toJSON());

client.on("ready", async () => {
    console.log("Bot di Helldivers ONLINE! Autenticato come: " + client.user.tag);
    try {
        await new REST({ version: "10" }).setToken(DISCORD_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("[SUCCESSO] Comandi slash registrati!");
    } catch (e) { console.error(e); }
    
    // Invia i messaggi fissi di benvenuto subito per dare un segno di vita
    inviaMessaggiBenvenuto();

    // Timer di sicurezza: aspetta 5 secondi prima di attivare i radar automatici esterni
    setTimeout(() => {
        console.log("[SISTEMA] Attivazione radar galattici in corso...");
        controllaSpostamentoDSS();
        controllaOrdineGlobale();

        // Avvia i cicli continui in background
        setInterval(controllaSpostamentoDSS, 60000); 
        setInterval(controllaOrdineGlobale, 300000); 
    }, 5000);
});

client.on("interactionCreate", async (int) => {
    if (!int.isChatInputCommand() || int.user.username !== OWNER_USERNAME) return;
    if (int.commandName === "inizia") {
        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0xFFDF00, "🚀 ORDINE DALLA SUPER TERRA", "Helldiver Schierato in Orbita", `Il soldato **${int.user.username}** si è appena schierato su **HELLDIVERS™ 2**!\n\n**Stato Missione:** Spargere Democrazia ✨`);
        await int.reply({ content: "✅ Schieramento registrato!", ephemeral: true });
    }
    if (int.commandName === "termina") {
        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0x8B0000, "🚀 FRONTE GALATTICO", "Rientro alla Base Completo", `Il soldato **${int.user.username}** ha completato le operazioni ed è **rientrato sulla sua nave spaziale**.`);
        await int.reply({ content: "🛑 Rientro alla base registrato!", ephemeral: true });
    }
});

function controllaOrdineGlobale() {
    try {
        const opz = { 
            hostname: 'api.helldivers2.dev', 
            path: '/v1/assignments', 
            method: 'GET', 
            headers: { 'User-Agent': 'Mozilla/5.0', 'X-Super-Client': 'HelldiversCommunityBot', 'Accept-Language': 'it-IT' } 
        };

        https.get(opz, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    if (res.statusCode !== 200) return;
                    let jsonParsed = JSON.parse(data);
                    if (!jsonParsed) return;
                    
                    let ordineAttuale = Array.isArray(jsonParsed) ? jsonParsed[0] : jsonParsed;
                    if (!ordineAttuale || typeof ordineAttuale !== 'object') return;

                    const idOrdine = ordineAttuale.id || ordineAttuale.id32 || 1;

                    if (primoAvvioOrdine || idOrdine !== idUltimoOrdineGlobale) {
                        primoAvvioOrdine = false;
                        idUltimoOrdineGlobale = idOrdine;

                        const ordiniCh = client.channels.cache.get(ORDINI_CHANNEL_ID);
                        if (!ordiniCh) return;

                        const titoloMO = ordineAttuale.title || "NUOVO ORDINE GLOBALE";
                        const descrizioneMO = ordineAttuale.description || "Istruzioni tattiche in corso di ricezione dal comando centrale.";
                        const briefingMO = ordineAttuale.briefing || "";
                        
                        let ricompensaTesto = "Nessuna medaglia specificata";
                        if (ordineAttuale.reward && ordineAttuale.reward.amount) {
                            ricompensaTesto = `🏅 **${ordineAttuale.reward.amount} Medaglie di Schieramento**`;
                        }

                        const emb = new EmbedBuilder()
                            .setColor(0xFFD700)
                            .setAuthor({ name: "💀 ALTO COMANDO DELLA SUPER TERRA" })
                            .setTitle(`⚠️ NUOVO ORDINE GLOBALE: ${titoloMO.toUpperCase()}`)
                            .setDescription(`✉️ **Briefing di Guerra:**\n*${briefingMO}*\n\n🎯 **Obiettivo Strategico:**\n${descrizioneMO}\n\n🎁 **Ricompensa della Vittoria:**\n${ricompensaTesto}`)
                            .setTimestamp();

                        let files = [];
                        if (fs.existsSync("./ordine.png")) {
                            files.push(new AttachmentBuilder("./ordine.png"));
                            emb.setImage("attachment://ordine.png");
                        }

                        const btn = new ButtonBuilder().setLabel("💀 HDC/major_orders").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com");
                        ordiniCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
                    }
                } catch (err) {}
            });
        }).on("error", () => {});
    } catch (e) {}
}

function controllaSpostamentoDSS() {
    try {
        const opz = { 
            hostname: 'api.helldivers2.dev', 
            path: '/v1/space-station', 
            method: 'GET', 
            headers: { 'User-Agent': 'Mozilla/5.0', 'X-Super-Client': 'HelldiversCommunityBot' } 
        };

        https.get(opz, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    if (res.statusCode !== 200) return;
                    const dssInfo = JSON.parse(data);
                    if (!dssInfo) return;

                    let nomePianeta = dssInfo.planet?.name || dssInfo.planetName || "";
                    let nomeSettore = dssInfo.planet?.sector || dssInfo.sector || "";
                    let stringaPosizioneCompleta = "✨ SETTORE OPERATIVO TOP SECRET ✨";

                    if (nomePianeta) {
                        stringaPosizioneCompleta = nomeSettore ? `${nomeSettore.toUpperCase()} — ${nomePianeta.toUpperCase()}` : nomePianeta.toUpperCase();
                    }

                    if (stringaPosizioneCompleta !== "✨ SETTORE OPERATIVO TOP SECRET ✨" && (primoAvvioDSS || stringaPosizioneCompleta !== ultimoPianetaDSS)) {
                        primoAvvioDSS = false;
                        ultimoPianetaDSS = stringaPosizioneCompleta;

                        const dssCh = client.channels.cache.get(DSS_CHANNEL_ID);
                        if (!dssCh) return;

                        const emb = new EmbedBuilder()
                            .setColor(0x00AEFF)
                            .setAuthor({ name: "🛰️ COMANDO STRATEGICO SUPER TERRA" })
                            .setTitle("🛰️ RILEVATO SALTO ORBITALE DELLA DSS!")
                            .setDescription(`La Stazione Spaziale della Democrazia ha completato le manovre di salto FTL ed è attualmente posizionata nel settore:\n\n📍 **\`${stringaPosizioneCompleta}\`**\n\n🛸 *Tutte le navi spaziali nell'area sono invitate a sincronizzare le plance di comando e a consultare l'Hellpad.*`)
                            .setTimestamp();

                        let files = [];
                        if (fs.existsSync("./logo.png")) {
                            files.push(new AttachmentBuilder("./logo.png"));
                            emb.setImage("attachment://logo.png");
                        }

                        const btn = new ButtonBuilder().setLabel("💀 HDC/space_stations").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com");
                        dssCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
                    }
                } catch (err) {}
            });
        }).on("error", () => {});
    } catch (e) {}
}

function inviaMessaggiBenvenuto() {
    try {
        const newsCh = client.channels.cache.get(NEWS_CHANNEL_ID);
        if (newsCh) {
            const emb = new EmbedBuilder().setColor(0xEE82EE).setAuthor({ name: "📺 MINISTERO DELLA VERITÀ" }).setTitle("📰 CANALE NOTIZIE DI GALASSIA ATTIVO").setDescription(`📢 **Bollettino Informativo:**\n*La plancia dei opportunisticamente corrispondenti di guerra della Super Terra è stata sincronizzata con la rete internet planetaria.*\n\n🛰️ **Fronte di Monitoraggio:**\nIl bot è in ascolto per intercettare i comunicati di recensione, le manutenzioni logistiche e i briefing strategici del Generale Bresch.\n\n⚠️ *Si ricorda ai cittadini che consultare fontes non verificate dal Ministero costituisce reato di tradimento.*`).setTimestamp();
            let files = fs.existsSync("./news.png") ? [new AttachmentBuilder("./news.png")] : [];
            if (files.length > 0) emb.setImage("attachment://news.png");
