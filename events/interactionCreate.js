require('dotenv').config();
const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { guardarPendiente, eliminarPendiente, getPendiente } = require('../utils/storage');

// Almacén temporal en memoria para respuestas parciales (sección 1 y 2)
const sesiones = {};

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    // ─────────────────────────────────────────────
    // COMANDO SLASH
    // ─────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        const msg = { content: '❌ Ocurrió un error al ejecutar este comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
      return;
    }

    // ─────────────────────────────────────────────
    // BOTÓN: Iniciar Verificación
    // ─────────────────────────────────────────────
    if (interaction.isButton()) {
      const userId = interaction.user.id;

      // ── Botón iniciar verificación (usuario) ──
      if (interaction.customId === `iniciar_verificacion_${userId}`) {
        const modal = buildModal1();
        return interaction.showModal(modal);
      }

      // ── Botón ACEPTAR verificación (staff) ──
      if (interaction.customId.startsWith('aceptar_')) {
        if (!interaction.member.permissions.has('ManageRoles')) {
          return interaction.reply({ content: '❌ No tienes permisos para esto.', ephemeral: true });
        }
        const targetId = interaction.customId.replace('aceptar_', '');
        try {
          const guild = interaction.guild;
          const member = await guild.members.fetch(targetId);

          // Agregar rol Ciudadano
          await member.roles.add(process.env.ROL_CIUDADANO);
          // Quitar rol No Verificado
          await member.roles.remove(process.env.ROL_NO_VERIFICADO);

          eliminarPendiente(targetId);

          // Editar embed original
          const embedAceptado = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0x57F287)
            .setFooter({ text: `✅ ACEPTADO por ${interaction.user.tag}` });

          await interaction.message.edit({ embeds: [embedAceptado], components: [] });

          // DM al usuario
          try {
            const userDM = await client.users.fetch(targetId);
            await userDM.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle('✅ ¡Verificación Aceptada!')
                  .setColor(0x57F287)
                  .setDescription(
                    `¡Felicidades! Tu verificación en **Liberty County RP** ha sido **aceptada**.\n\n` +
                    `Ya tienes acceso al servidor como **Ciudadano**. ¡Bienvenido a la comunidad! 🏙️`
                  )
                  .setTimestamp()
              ]
            });
          } catch { /* El usuario tiene DMs cerrados */ }

          return interaction.reply({ content: `✅ Verificación de <@${targetId}> aceptada correctamente.`, ephemeral: true });
        } catch (err) {
          console.error(err);
          return interaction.reply({ content: '❌ Error al procesar la aceptación.', ephemeral: true });
        }
      }

      // ── Botón RECHAZAR verificación (staff) ──
      if (interaction.customId.startsWith('rechazar_')) {
        if (!interaction.member.permissions.has('ManageRoles')) {
          return interaction.reply({ content: '❌ No tienes permisos para esto.', ephemeral: true });
        }
        const targetId = interaction.customId.replace('rechazar_', '');

        // Modal para poner razón de rechazo
        const modal = new ModalBuilder()
          .setCustomId(`razon_rechazo_${targetId}`)
          .setTitle('Razón del Rechazo');

        const razonInput = new TextInputBuilder()
          .setCustomId('razon')
          .setLabel('¿Por qué rechazas esta verificación?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500);

        modal.addComponents(new ActionRowBuilder().addComponents(razonInput));
        return interaction.showModal(modal);
      }
    }

    // ─────────────────────────────────────────────
    // MODALES
    // ─────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const userId = interaction.user.id;

      // ── Modal Sección 1 ──
      if (interaction.customId === 'modal_seccion1') {
        sesiones[userId] = {
          s1: {
            roblox_usuario: interaction.fields.getTextInputValue('roblox_usuario'),
            roblox_link: interaction.fields.getTextInputValue('roblox_link'),
            edad: interaction.fields.getTextInputValue('edad'),
            pais: interaction.fields.getTextInputValue('pais'),
            como_enteraste: interaction.fields.getTextInputValue('como_enteraste'),
          }
        };

        const modal2 = buildModal2();
        return interaction.showModal(modal2);
      }

      // ── Modal Sección 2 ──
      if (interaction.customId === 'modal_seccion2') {
        if (!sesiones[userId]) {
          return interaction.reply({ content: '❌ Sesión expirada, usa `/verificarme` nuevamente.', ephemeral: true });
        }
        sesiones[userId].s2 = {
          metagaming: interaction.fields.getTextInputValue('metagaming'),
          powergaming: interaction.fields.getTextInputValue('powergaming'),
          zonezone: interaction.fields.getTextInputValue('zonezone'),
          breakdown: interaction.fields.getTextInputValue('breakdown'),
          failrp: interaction.fields.getTextInputValue('failrp'),
        };

        const modal3 = buildModal3();
        return interaction.showModal(modal3);
      }

      // ── Modal Sección 3 ──
      if (interaction.customId === 'modal_seccion3') {
        if (!sesiones[userId]) {
          return interaction.reply({ content: '❌ Sesión expirada, usa `/verificarme` nuevamente.', ephemeral: true });
        }
        sesiones[userId].s3 = {
          bh_bj: interaction.fields.getTextInputValue('bh_bj'),
          rdm: interaction.fields.getTextInputValue('rdm'),
          baneado: interaction.fields.getTextInputValue('baneado'),
          experiencia: interaction.fields.getTextInputValue('experiencia'),
          motivo: interaction.fields.getTextInputValue('motivo'),
        };

        // Enviar al canal de verificaciones
        const canal = await interaction.client.channels.fetch(process.env.CANAL_VERIFICACIONES);
        if (!canal) {
          return interaction.reply({ content: '❌ No se encontró el canal de verificaciones. Contacta a un admin.', ephemeral: true });
        }

        const { s1, s2, s3 } = sesiones[userId];

        const embed = new EmbedBuilder()
          .setTitle('📋 Nueva Solicitud de Verificación')
          .setColor(0xFEE75C)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: '👤 Usuario Discord', value: `<@${userId}> (${interaction.user.tag})`, inline: true },
            { name: '🆔 ID Discord', value: userId, inline: true },
            { name: '\u200B', value: '\u200B' },

            { name: '🎮 Usuario Roblox', value: s1.roblox_usuario, inline: true },
            { name: '🔗 Link Perfil', value: s1.roblox_link, inline: true },
            { name: '🎂 Edad', value: s1.edad, inline: true },
            { name: '🌍 País', value: s1.pais, inline: true },
            { name: '📣 ¿Cómo se enteró?', value: s1.como_enteraste },

            { name: '─── Conocimientos RP ───', value: '\u200B' },
            { name: '❓ Metagaming (MG)', value: s2.metagaming },
            { name: '❓ Powergaming (PG)', value: s2.powergaming },
            { name: '❓ ZoneZone (ZZ)', value: s2.zonezone },
            { name: '❓ BreakDown (BD)', value: s2.breakdown },
            { name: '❓ FailRP', value: s2.failrp },

            { name: '─── RP Avanzado + Ingreso ───', value: '\u200B' },
            { name: '❓ BH / BJ', value: s3.bh_bj },
            { name: '❓ RDM', value: s3.rdm },
            { name: '⚠️ ¿Baneado antes?', value: s3.baneado },
            { name: '🏙️ Experiencia Liberty County', value: s3.experiencia },
            { name: '💬 Motivo de ingreso', value: s3.motivo },
          )
          .setFooter({ text: 'Liberty County RP — Verificación Pendiente' })
          .setTimestamp();

        const botonesStaff = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aceptar_${userId}`)
            .setLabel('✅ Aceptar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rechazar_${userId}`)
            .setLabel('❌ Rechazar')
            .setStyle(ButtonStyle.Danger),
        );

        const msg = await canal.send({ embeds: [embed], components: [botonesStaff] });
        guardarPendiente(userId, { s1, s2, s3 }, msg.id);

        delete sesiones[userId];

        return interaction.reply({
          content: `✅ **¡Tu solicitud fue enviada exitosamente!**\nUn asistente revisará tus respuestas pronto. Por favor, sé paciente. 🙏`,
          ephemeral: true,
        });
      }

      // ── Modal Razón de Rechazo (staff) ──
      if (interaction.customId.startsWith('razon_rechazo_')) {
        const targetId = interaction.customId.replace('razon_rechazo_', '');
        const razon = interaction.fields.getTextInputValue('razon');

        eliminarPendiente(targetId);

        // Editar embed original
        const embedRechazado = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(0xED4245)
          .setFooter({ text: `❌ RECHAZADO por ${interaction.user.tag} — Razón: ${razon}` });

        await interaction.message.edit({ embeds: [embedRechazado], components: [] });

        // DM al usuario
        try {
          const userDM = await client.users.fetch(targetId);
          await userDM.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ Verificación Rechazada')
                .setColor(0xED4245)
                .setDescription(
                  `Lo sentimos, tu verificación en **Liberty County RP** fue **rechazada**.\n\n` +
                  `📌 **Razón:** ${razon}\n\n` +
                  `Puedes volver a intentarlo más tarde cuando estés preparado.`
                )
                .setTimestamp()
            ]
          });
        } catch { /* DMs cerrados */ }

        return interaction.reply({ content: `❌ Verificación de <@${targetId}> rechazada.`, ephemeral: true });
      }
    }
  },
};

// ─────────────────────────────────────────────
// BUILDERS DE MODALES
// ─────────────────────────────────────────────

function buildModal1() {
  const modal = new ModalBuilder()
    .setCustomId('modal_seccion1')
    .setTitle('📋 Sección 1 — Identidad (1/3)');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('roblox_usuario').setLabel('¿Cuál es tu nombre de usuario en Roblox?')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('roblox_link').setLabel('Link a tu perfil de Roblox')
        .setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://www.roblox.com/users/...')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('edad').setLabel('¿Cuántos años tienes?')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('pais').setLabel('¿De qué país eres?')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('como_enteraste').setLabel('¿Cómo te enteraste de esta comunidad?')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(200)
    ),
  );
  return modal;
}

function buildModal2() {
  const modal = new ModalBuilder()
    .setCustomId('modal_seccion2')
    .setTitle('📖 Sección 2 — Conocimientos RP (2/3)');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('metagaming').setLabel('¿Qué es el Metagaming (MG)? Da un ejemplo.')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('powergaming').setLabel('¿Qué es el Powergaming (PG)? Da un ejemplo.')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('zonezone').setLabel('¿Qué es el ZoneZone (ZZ) / zona segura?')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('breakdown').setLabel('¿Qué es el BreakDown (BD) / salir del personaje?')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('failrp').setLabel('¿Qué es el FailRP? Menciona una situación.')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
    ),
  );
  return modal;
}

function buildModal3() {
  const modal = new ModalBuilder()
    .setCustomId('modal_seccion3')
    .setTitle('🎯 Sección 3 — RP Avanzado + Ingreso (3/3)');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('bh_bj').setLabel('¿Qué es BH/BJ y por qué está prohibido?')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('rdm').setLabel('¿Qué es el RDM? ¿Cómo lo diferencias del combate RP?')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('baneado').setLabel('¿Fuiste baneado de alguna comunidad RP? ¿Por qué?')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('experiencia').setLabel('¿Tienes experiencia en comunidades Liberty County?')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(200)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('motivo').setLabel('¿Por qué quieres unirte a esta comunidad?')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(400)
    ),
  );
  return modal;
}
