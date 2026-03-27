require('dotenv').config();
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { tienePendiente, getCooldown, setCooldown } = require('../utils/storage');

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verificarme')
    .setDescription('Inicia tu proceso de verificación para ingresar a Liberty County RP'),

  async execute(interaction) {
    // Verificar que sea en el canal correcto
    if (interaction.channelId !== process.env.CANAL_COMANDO) {
      return interaction.reply({
        content: `❌ Este comando solo puede usarse en <#${process.env.CANAL_COMANDO}>.`,
        ephemeral: true,
      });
    }

    const userId = interaction.user.id;

    // Verificar si ya tiene una verificación pendiente
    if (tienePendiente(userId)) {
      return interaction.reply({
        content: `🚦 **¡Alto!** Tu verificación está siendo revisada por un asistente.\nSé paciente, pronto recibirás una respuesta.`,
        ephemeral: true,
      });
    }

    // Verificar cooldown
    const lastUse = getCooldown(userId);
    if (lastUse) {
      const elapsed = Date.now() - lastUse;
      if (elapsed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        const minutos = Math.floor(remaining / 60);
        const segundos = remaining % 60;
        return interaction.reply({
          content: `⏳ Debes esperar **${minutos}m ${segundos}s** antes de volver a usar este comando.`,
          ephemeral: true,
        });
      }
    }

    // Mensaje de bienvenida ephemeral con botón para iniciar
    const embed = new EmbedBuilder()
      .setTitle('🏙️ | Bienvenido al proceso de verificación — Argentina Roleplay')
      .setColor(0x2B2D31)
      .setDescription(
        `Hola **${interaction.user.username}**, estás a punto de iniciar tu proceso de verificación.\n\n` +
        `📋 | **¿En qué consiste?**\n` +
        `Responderás **15 preguntas** divididas en **3 secciones**:\n\n` +
        `> 🪪 | **Sección 1** — Identidad personal y Roblox\n` +
        `> 📖 | **Sección 2** — Conocimientos de Roleplay\n` +
        `> 🎯 | **Sección 3** — Conocimientos avanzados e ingreso\n\n` +
        `📌 **Reglas importantes:**\n` +
        `• Responde con honestidad — las respuestas son revisadas por el staff.\n` +
        `• Si eres rechazado, deberás esperar para volver a intentarlo.\n` +
        `• El proceso toma aproximadamente **5 minutos**.\n\n` +
        `Cuando estés listo, presiona el botón de abajo. ✅`
      )
      .setFooter({ text: 'Liberty County RP — Sistema de Verificación Automática' })
      .setTimestamp();

    const boton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`iniciar_verificacion_${userId}`)
        .setLabel('📋 | Iniciar Verificación')
        .setStyle(ButtonStyle.Success)
    );

    setCooldown(userId);

    await interaction.reply({
      embeds: [embed],
      components: [boton],
      ephemeral: true,
    });
  },
};
