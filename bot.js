const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const utentiInPartita = new Set();
const timerUscitaUtenti = new Map();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; 
const DSS_CHANNEL_ID = process.env.DSS_CHANNEL_ID;       
const ORDINI_CHANNEL_ID = process.env.ORDINI_CHANNEL_ID; 
const NEWS_CHANNEL_ID = process.env.NEWS_CHANNEL_ID; 
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

    inviaMessaggiBenvenuto();
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

function inviaMessaggiBenvenuto() {
    try {
        // 1. MESSAGGIO IN STANZA ORDINI ALTO COMANDO
        const ordiniChannel = client.channels.cache.get(ORDINI_CHANNEL_ID);
        if (ordiniChannel) {
            const embedOrdine = new EmbedBuilder()
                .setColor(0xFFD700) 
                .setAuthor({ name: "💀 ALTO COMANDO DELLA SUPER TERRA" })
                .setTitle("⚠️ DISPACCIO UFFICIALE: SISTEMA DI TRASMISSIONE ATTIVO")
                .setDescription(
                    `✉️ **Briefing di Guerra:**\n*Il sistema di ricezione dell'Alto Comando è stato potenziato e configurato con successo. Le plance tattiche sono allineate H24.*\n\n` +
                    `🎯 **Obiettivo Strategico:**\nIn attesa di nuove direttive urgenti sul fronte galattico dal Comando Centrale. Tenere i motori delle navi spaziali accesi.\n\n` +
                    `🎁 **Ricompensa della Vittoria:**\n🏅 **50 Medaglie di Schieramento**\n\n` +
                    `⚠️ *Tutti gli Helldiver sono invitati a fare rapporto sul fronte indicato. Per la Democrazia!*`
                )
                .setTimestamp();

            let filesList = [];
            if (fs.existsSync("./ordine.png")) {
                filesList.push(new AttachmentBuilder("./ordine.png"));
                embedOrdine.setImage("attachment://ordine.png"); 
            } else if (fs.existsSync("./logo.png")) {
                filesList.push(new AttachmentBuilder("./logo.png"));
                embedOrdine.setImage("attachment://logo.png");
            }

            const bottoneOrdini = new ButtonBuilder()
                .setLabel("💀 HDC/major_orders")
                .setStyle(ButtonStyle.Link)
                .setURL("https://helldiverscompanion.com/#overview");

            const rigaOrdini = new ActionRowBuilder().addComponents(bottoneOrdini);

            ordiniChannel.send({ embeds: [embedOrdine], files: filesList, components: [rigaOrdini] }).catch(() => {});
        }

        // 2. MESSAGGIO IN STANZA STAZIONE SPAZIALE (DSS)
        setTimeout(() => {
            const dssChannel = client.channels.cache.get(DSS_CHANNEL_ID);
            if (dssChannel) {
                const embedDSS = new EmbedBuilder()
                    .setColor(0x00AEFF)
                    .setAuthor({ name: "🛰️ COMANDO STRATEGICO SUPER TERRA" })
                    .setTitle("Stazione Spaziale della Democrazia (DSS) Collegata")
                    .setDescription(
                        "🛰️ **Sincronizzazione Radar Completata!**\n\nLa Stazione Spaziale ha agganciato i sistemi di tracciamento satellitari del server.\n\n📍 **Fronte Attuale:** `REGISTRO OPERATIVO IN AGGIORNAMENTO`\n\n🛸 *Tutte le navi spaziali nell'area sono invitate a consultare i registri orbitali per i voti tattici.*"
                    )
                    .setTimestamp();

                let filesListDSS = [];
                if (fs.existsSync("./dss.png")) {
                    filesListDSS.push(new AttachmentBuilder("./dss.png"));
                    embedDSS.setThumbnail("attachment://dss.png");
                }
                if (fs.existsSync("./logo.png")) {
                    filesListDSS.push(new AttachmentBuilder("./logo.png"));
                    embedDSS.setImage("attachment://logo.png"); 
                }

                const bottoneSito = new ButtonBuilder()
                    .setLabel("💀 HDC/space_stations")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://helldiverscompanion.com/#hellpad/stations"); 

                const rigaBottoni = new ActionRowBuilder().addComponents(bottoneSito);

                dssChannel.send({ embeds: [embedDSS], files: filesListDSS, components: [rigaBottoni] }).catch(() => {});
            }
        }, 3000);

        // 3. MESSAGGIO IN STANZA NEWS DI LOGISTICA WITH GENERALE BRESCH IMAGE
        setTimeout(() => {
            const newsChannel = client.channels.cache.get(NEWS_CHANNEL_ID);
            if (newsChannel) {
                const embedNews = new EmbedBuilder()
                    .setColor(0xEE82EE) 
                    .setAuthor({ name: "📺 MINISTERO DELLA VERITÀ" })
                    .setTitle("📰 CANALE NOTIZIE DI GALASSIA ATTIVO")
                    .setDescription(
                        `📢 **Bollettino Informativo:**\n*La plancia dei corrispondenti di guerra della Super Terra è stata sincronizzata con la rete internet planetaria.*\n\n` +
                        `🛰️ **Fronte di Monitoraggio:**\nIl bot è in ascolto per intercettare i comunicati di recensione, le manutenzioni logistiche e i briefing strategici del Generale Bresch.\n\n` +
                        `⚠️ *Si ricorda ai cittadini che consultare fontes non verificate dal Ministero costituisce reato di tradimento.*`
                    )
                    .setTimestamp();

                let filesListNews = [];
                if (fs.existsSync("./news.png")) {
                    filesListNews.push(new AttachmentBuilder("./news.png"));
                    embedNews.setImage("attachment://news.png"); 
                } else if (fs.existsSync("./logo.png")) {
                    filesListNews.push(new AttachmentBuilder("./logo.png"));
                    embedNews.setImage("attachment://logo.png"); 
                }

                const bottoneNews = new ButtonBuilder()
                    .setLabel("💀 HDC/news_feed")
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://helldiverscompanion.com/#news"); 

                const rigaNews = new ActionRowBuilder().addComponents(bottoneNews);

                newsChannel.send({ embeds: [embedNews], files: filesListNews, components: [rigaNews] })
                    .then(() => console.log("[RADAR NEWS] Tabellone notizie configurato con successo."))
                    .catch(console.error);
            }
        }, 6000);

    } catch (e) {}
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
