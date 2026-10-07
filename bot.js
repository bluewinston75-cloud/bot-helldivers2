const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const utentiInPartita = new Set();
const timerUscitaUtenti = new Map();

const { DISCORD_TOKEN, DISCORD_CHANNEL_ID, DSS_CHANNEL_ID, ORDINI_CHANNEL_ID, NEWS_CHANNEL_ID, OWNER_USERNAME } = process.env;

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
    inviaMessaggiBenvenuto();
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

function inviaMessaggiBenvenuto() {
    try {
        const ordiniCh = client.channels.cache.get(ORDINI_CHANNEL_ID);
        if (ordiniCh) {
            const emb = new EmbedBuilder().setColor(0xFFD700).setAuthor({ name: "💀 ALTO COMANDO DELLA SUPER TERRA" }).setTitle("⚠️ DISPACCIO UFFICIALE: SISTEMA DI TRASMISSIONE ATTIVO").setDescription(`✉️ **Briefing di Guerra:**\n*Il sistema di ricezione dell'Alto Comando è stato potenziato e configurato con successo. Le plance tattiche sono allineate H24.*\n\n🎯 **Obiettivo Strategico:**\nIn attesa di nuove direttive urgenti sul fronte galattico dal Comando Centrale. Tenere i motori delle navi spaziali accesi.\n\n🎁 **Ricompensa della Vittoria:**\n🏅 **50 Medaglie di Schieramento**\n\n⚠️ *Tutti gli Helldiver sono invitati a fare rapporto sul fronte indicato. Per la Democrazia!*`).setTimestamp();
            let files = fs.existsSync("./ordine.png") ? [new AttachmentBuilder("./ordine.png")] : (fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : []);
            if (files.length > 0) emb.setImage(`attachment://${files[0].name}`);
            const btn = new ButtonBuilder().setLabel("💀 HDC/major_orders").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#overview");
            ordiniCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
        }

        setTimeout(() => {
            const dssCh = client.channels.cache.get(DSS_CHANNEL_ID);
            if (dssCh) {
                const emb = new EmbedBuilder().setColor(0x00AEFF).setAuthor({ name: "🛰️ COMANDO STRATEGICO SUPER TERRA" }).setTitle("Stazione Spaziale della Democrazia (DSS) Collegata").setDescription("🛰️ **Sincronizzazione Radar Completata!**\n\nLa Stazione Spaziale ha agganciato i sistemi di tracciamento satellitari del server.\n\n📍 **Fronte Attuale:** `REGISTRO OPERATIVO IN AGGIORNAMENTO`\n\n🛸 *Tutte le navi spaziali nell'area sono invitate a consultare i registri orbitali per i voti tattici.*").setTimestamp();
                let files = fs.existsSync("./dss.png") ? [new AttachmentBuilder("./dss.png")] : (fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : []);
                if (files.length > 0) emb.setImage(`attachment://${files[0].name}`);
                const btn = new ButtonBuilder().setLabel("💀 HDC/space_stations").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#hellpad/stations");
                dssCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
            }
        }, 3000);

        setTimeout(() => {
            const newsCh = client.channels.cache.get(NEWS_CHANNEL_ID);
            if (newsCh) {
                const emb = new EmbedBuilder().setColor(0xEE82EE).setAuthor({ name: "📺 MINISTERO DELLA VERITÀ" }).setTitle("📰 CANALE NOTIZIE DI GALASSIA ATTIVO").setDescription(`📢 **Bollettino Informativo:**\n*La plancia dei corrispondenti di guerra della Super Terra è stata sincronizzata con la rete internet planetaria.*\n\n🛰️ **Fronte di Monitoraggio:**\nIl bot è in ascolto per intercettare i comunicati di recensione, le manutenzioni logistiche e i briefing strategici del Generale Bresch.\n\n⚠️ *Si ricorda ai cittadini che consultare fontes non verificate dal Ministero costituisce reato di tradimento.*`).setTimestamp();
                let files = fs.existsSync("./news.png") ? [new AttachmentBuilder("./news.png")] : (fs.existsSync("./logo.png") ? [new AttachmentBuilder("./logo.png")] : []);
                if (files.length > 0) emb.setImage(`attachment://${files[0].name}`);
                const btn = new ButtonBuilder().setLabel("💀 HDC/news_feed").setStyle(ButtonStyle.Link).setURL("https://helldiverscompanion.com/#news");
                newsCh.send({ embeds: [emb], files, components: [new ActionRowBuilder().addComponents(btn)] }).catch(() => {});
            }
        }, 6000);
    } catch (e) {}
}

setInterval(() => {
    client.guilds.cache.forEach(async (g) => {
        try {
            const members = await g.members.fetch({ withPresences: true });
            members.forEach((m) => {
                if (m.user.bot || m.user.username === OWNER_USERNAME) return;
                const gestisciUscita = () => {
                    if (utentiInPartita.has(m.user.id) && !timerUscitaUtenti.has(m.user.id)) {
                        const tId = setTimeout(() => {
                            utentiInPartita.delete(m.user.id);
                            timerUscitaUtenti.delete(m.user.id);
                            inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0x8B0000, "🚀 FRONTE GALATTICO", "Rientro alla Base Completo", `Il soldato **${m.user.username}** ha completato le operazioni ed è **rientrato sulla sua nave spaziale**.`, m);
                        }, 30000);
                        timerUscitaUtenti.set(m.user.id, tId);
                    }
                };
                if (!m.presence?.activities || m.presence.activities.length === 0) return gestisciUscita();
                if (m.presence.activities.some(act => act.name?.toLowerCase().includes("helldivers"))) {
                    if (timerUscitaUtenti.has(m.user.id)) {
                        clearTimeout(timerUscitaUtenti.get(m.user.id));
                        timerUscitaUtenti.delete(m.user.id);
                        return;
                    }
                    if (!utentiInPartita.has(m.user.id)) {
                        utentiInPartita.add(m.user.id);
                        inviaEmbedGiocatori(DISCORD_CHANNEL_ID, 0xFFDF00, "🚀 ORDINE DALLA SUPER TERRA", "Helldiver Schierato in Orbita", `Il soldato **${m.user.username}** si è appena schierato su **HELLDIVERS™ 2**!\n\n**Stato Missione:** Spargere Democrazia ✨`, m);
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
