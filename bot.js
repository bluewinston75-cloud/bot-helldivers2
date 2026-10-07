const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const https = require("https");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const utentiInPartita = new Set();
const timerUscitaUtenti = new Map();
let ultimoPianetaDSS = ""; 
let idUltimoOrdineGlobale = 0;
let primoAvvioDSS = true;
let primoAvvioOrdine = true;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; 
const DSS_CHANNEL_ID = process.env.DSS_CHANNEL_ID;       
const ORDINI_CHANNEL_ID = process.env.ORDINI_CHANNEL_ID; 
const OWNER_USERNAME = process.env.OWNER_USERNAME;       

const commands = [
    new SlashCommandBuilder().setName("inizia").setDescription("🚀 Schierati in orbita su Helldivers 2 (Solo per winstonblue76)"),
    new SlashCommandBuilder().setName("termina").setDescription("🚀 Rientra sulla nave spaziale completa (Solo per winstonblue76)")
].map(command => command.toJSON());

client.on("ready", async () => {
    console.log("Bot di Helldivers ONLINE su internet H24! Autenticato come: " + client.user.tag);
    
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("[SUCCESSO] Comandi veloci /inizia e /termina attivati!");
    } catch (error) {
        console.error(error);
    }

    controllaSpostamentoDSS();
    controllaOrdineGlobale();
    
    setInterval(controllaSpostamentoDSS, 60000);
    setInterval(controllaOrdineGlobale, 300000); 
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.user.username !== OWNER_USERNAME) {
        return interaction.reply({ content: "❌ Questo comando rapido è riservato esclusivamente a " + OWNER_USERNAME + "!", ephemeral: true });
    }

    if (interaction.commandName === "inizia") {
        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0xFFDF00, "🚀 ORDINE DALLA SUPER TERRA", "Helldiver Schierato in Orbita", "Il soldato **" + interaction.user.username + "** si è appena schierato su **HELLDIVERS™ 2**!\n\n**Stato Missione:** Spargere Democrazia ✨");
        await interaction.reply({ content: "✅ Schieramento orbitale registrato nel server!", ephemeral: true });
    }

    if (interaction.commandName === "termina") {
        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0x8B0000, "🚀 FRONTE GALATTICO", "Rientro alla Base Completo", "Il soldato **" + interaction.user.username + "** ha completato le operazioni ed è **rientrato sulla sua nave spaziale**.");
        await interaction.reply({ content: "🛑 Rientro alla base registrato nel server!", ephemeral: true });
    }
});

function controllaOrdineGlobale() {
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
                
                let ordineAttuale = null;
                if (Array.isArray(jsonParsed)) {
                    if (jsonParsed.length === 0) return;
                    ordineAttuale = jsonParsed[0]; // Estrae il primo ordine reale attivo dall'elenco
                } else {
                    ordineAttuale = jsonParsed;
                }
                
                if (!ordineAttuale || typeof ordineAttuale !== 'object') return;

                const idOrdine = ordineAttuale.id || ordineAttuale.id32 || 1;

                if (primoAvvioOrdine || idOrdine !== idUltimoOrdineGlobale) {
                    primoAvvioOrdine = false;
                    idUltimoOrdineGlobale = idOrdine;

                    const ordiniChannel = client.channels.cache.get(ORDINI_CHANNEL_ID);
                    if (!ordiniChannel) return;

                    const titoloMO = ordineAttuale.title || "NUOVO ORDINE GLOBALE";
                    const descrizioneMO = ordineAttuale.description || "Istruzioni tattiche in corso di ricezione dal comando centrale.";
                    const briefingMO = ordineAttuale.briefing || "";
                    
                    let ricompensaTesto = "Nessuna medaglia specificata";
                    if (ordineAttuale.reward && ordineAttuale.reward.amount) {
                        ricompensaTesto = `🏅 **${ordineAttuale.reward.amount} Medaglie di Schieramento**`;
                    }

                    const embedOrdine = new EmbedBuilder()
                        .setColor(0xFFD700) 
                        .setAuthor({ name: "💀 ALTO COMANDO DELLA SUPER TERRA" })
                        .setTitle(`⚠️ DISPACCIO UFFICIALE: ${titoloMO.toUpperCase()}`)
                        .setDescription(
                            `✉️ **Briefing di Guerra:**\n*${briefingMO}*\n\n` +
                            `🎯 **Obiettivo Strategico:**\n${descrizioneMO}\n\n` +
                            `🎁 **Ricompensa della Vittoria:**\n${ricompensaTesto}\n\n` +
                            `⚠️ *Tutti gli Helldiver sono invitati a fare rapporto sul fronte indicato. Per la Democrazia!*`
                        )
                        .setImage("https://discordapp.com") // LINK DIRETTO CORAZZATO E SICURO SENZA FILE LOCALI!
                        .setTimestamp();

                    ordiniChannel.send({ embeds: [embedOrdine] })
                        .then(() => console.log("[RADAR ORDINI] Nuovo ordine inviato in chat con grafica High Command: " + titoloMO))
                        .catch(console.error);
                }
            } catch (err) {
                console.log("[PROTETTO] Errore assorbito, salto il turno degli ordini senza crashare.");
            }
        });
    }).on("error", () => {});
}

function controllaSpostamentoDSS() {
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
                let nomePianeta = "";
                let nomeSettore = "";
                let stringaPosizioneCompleta = "✨ SETTORE OPERATIVO TOP SECRET ✨";

                if (res.statusCode === 200) {
                    const dssInfo = JSON.parse(data);
                    if (dssInfo && dssInfo.planet && dssInfo.planet.name) {
                        nomePianeta = dssInfo.planet.name;
                    } else if (dssInfo && dssInfo.planetName) {
                        nomePianeta = dssInfo.planetName;
                    }

                    if (dssInfo && dssInfo.planet && dssInfo.planet.sector) {
                        nomeSettore = dssInfo.planet.sector;
                    } else if (dssInfo && dssInfo.sector) {
                        nomeSettore = dssInfo.sector;
                    }

                    if (nomePianeta) {
                        if (nomeSettore) {
                            stringaPosizioneCompleta = `${nomeSettore.toUpperCase()} — ${nomePianeta.toUpperCase()}`;
                        } else {
                            stringaPosizioneCompleta = nomePianeta.toUpperCase();
                        }
                    }
                }

                if (stringaPosizioneCompleta === "✨ SETTORE OPERATIVO TOP SECRET ✨" && ultimoPianetaDSS !== "") {
                    return; 
                }

                if (primoAvvioDSS || stringaPosizioneCompleta !== ultimoPianetaDSS || ultimoPianetaDSS === "") {
                    primoAvvioDSS = false;
                    ultimoPianetaDSS = stringaPosizioneCompleta;

                    const dssChannel = client.channels.cache.get(DSS_CHANNEL_ID);
                    if (!dssChannel) return;

                    let filesList = [];
                    const embedDSS = new EmbedBuilder()
                        .setColor(0x00AEFF)
                        .setAuthor({ name: "🛰️ COMANDO STRATEGICO SUPER TERRA" })
                        .setTitle("Aggiornamento Posizione Stazione Spaziale (DSS)")
                        .setDescription("🛰️ **Rilevato Salto Orbitale della DSS!**\n\nLa Stazione Spaziale della Democrazia ha completato le manovre di volo ed è attualmente posizionata nel settore:\n📍 **`" + stringaPosizioneCompleta + "`**\n\n🛸 *Tutte le navi spaziali nell'area sono invitate a sincronizzare le plance di comando e a consultare il registro dei voti di schieramento in gioco.*")
                        .setTimestamp();

                    if (fs.existsSync("./dss.png")) {
                        filesList.push(new AttachmentBuilder("./dss.png"));
                        embedDSS.setThumbnail("attachment://dss.png");
                    }
                    if (fs.existsSync("./logo.png")) {
                        filesList.push(new AttachmentBuilder("./logo.png"));
                        embedDSS.setImage("attachment://logo.png"); 
                    }

                    dssChannel.send({ embeds: [embedDSS], files: filesList }).catch(console.error);
                }
            } catch (err) {}
        });
    }).on("error", () => {});
}

setInterval(() => {
    client.guilds.cache.forEach(async (guild) => {
        try {
            const members = await guild.members.fetch({ withPresences: true });
