const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const https = require("https");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const utentiInPartita = new Set();
const timerUscitaUtenti = new Map();
let ultimoPianetaDSS = ""; 
let primoAvvioDSS = true;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; 
const DSS_CHANNEL_ID = process.env.DSS_CHANNEL_ID;       
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
    setInterval(controllaSpostamentoDSS, 60000);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.user.username !== OWNER_USERNAME) {
        return interaction.reply({ content: "❌ Questo comando rapido è reserved esclusivamente a " + OWNER_USERNAME + "!", ephemeral: true });
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
                    
                    // Estraiamo il nome del pianeta specifico
                    if (dssInfo && dssInfo.planet && dssInfo.planet.name) {
                        nomePianeta = dssInfo.planet.name;
                    } else if (dssInfo && dssInfo.planetName) {
                        nomePianeta = dssInfo.planetName;
                    }

                    // Estraiamo il nome del settore galattico (es. Settore Omega)
                    if (dssInfo && dssInfo.planet && dssInfo.planet.sector) {
                        nomeSettore = dssInfo.planet.sector;
                    } else if (dssInfo && dssInfo.sector) {
                        nomeSettore = dssInfo.sector;
                    }

                    // Uniamo i dati in un formato militare elegante se disponibili
                    if (nomePianeta) {
                        if (nomeSettore) {
                            // Converte in maiuscolo per lo stile di gioco (es. SETTORE OMEGA — SENGE 23)
                            stringaPosizioneCompleta = `${nomeSettore.toUpperCase()} — ${nomePianeta.toUpperCase()}`;
                        } else {
                            stringaPosizioneCompleta = nomePianeta.toUpperCase();
                        }
                    }
                }

                // Se i dati internet sono vuoti, mantiene l'ultimo testo valido conosciuto per non resettare la chat
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
            members.forEach((m) => {
                if (m.user.bot || m.user.username === OWNER_USERNAME) return;
                const presence = m.presence;

                const gestisciUscita = () => {
                    if (utentiInPartita.has(m.user.id) && !timerUscitaUtenti.has(m.user.id)) {
                        const timerId = setTimeout(() => {
                            utentiInPartita.delete(m.user.id);
                            timerUscitaUtenti.delete(m.user.id);
                            inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0x8B0000, "🚀 FRONTE GALATTICO", "Rientro alla Base Completo", "Il soldato **" + m.user.username + "** ha completato le operazioni ed è **rientrato sulla sua nave spaziale**.", m);
                        }, 30000); 
                        timerUscitaUtenti.set(m.user.id, timerId);
                    }
                };

                if (!presence?.activities || presence.activities.length === 0) return gestisciUscita();
                if (presence.activities.some(act => act.name?.toLowerCase().includes("helldivers"))) {
                    if (timerUscitaUtenti.has(m.user.id)) {
                        clearTimeout(timerUscitaUtenti.get(m.user.id));
                        timerUscitaUtenti.delete(m.user.id);
                        return;
                    }
                    if (!utentiInPartita.has(m.user.id)) {
                        utentiInPartita.add(m.user.id);
                        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0xFFDF00, "🚀 ORDINE DALLA SUPER TERRA", "Helldiver Schierato in Orbita", "Il soldato **" + m.user.username + "** si è appena schierato su **HELLDIVERS™ 2**!\n\n**Stato Missione:** Spargere Democrazia ✨", m);
                    }
                } else gestisciUscita();
            });
        } catch (e) {}
    });
}, 5000);

function inviaEmbedGiocatori(canaleId, colore, autore, titolo, descrizione, member = null) {
    const channel = client.channels.cache.get(canaleId);
    if (!channel) return;
    let files = fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : [];
    const emb = new EmbedBuilder().setColor(colore).setAuthor({ name: autore }).setTitle(titolo).setDescription(descrizione).setTimestamp();
    if (member) emb.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    if (files.length > 0) emb.setImage("attachment://logo.png");
    channel.send({ embeds: [emb], files }).catch(() => {});
}

client.on("error", () => {});
process.on("unhandledRejection", () => {});
client.login(DISCORD_TOKEN);
