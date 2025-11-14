import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

const API_BASE_URL = process.env.BACKEND_API_URL ?? `http://localhost:${process.env.PORT || 4000}`;

export const data = new SlashCommandBuilder()
  .setName('cta')
  .setDescription('Gestiona las CTA disponibles')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Crea una nueva CTA')
      .addStringOption((option) =>
        option
          .setName('titulo')
          .setDescription('Título de la CTA')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('hora')
          .setDescription('Fecha y hora en ISO (ej. 2025-11-13T19:30:00Z)')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('compo')
          .setDescription('Composición en JSON o texto')
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName('descripcion')
          .setDescription('Descripción breve')
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('listar')
      .setDescription('Lista las CTA abiertas')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('asignar')
      .setDescription('Abre la interfaz de asignación de roles')
      .addStringOption((option) =>
        option
          .setName('cta_id')
          .setDescription('ID de la CTA')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('cerrar')
      .setDescription('Cierra una CTA')
      .addStringOption((option) =>
        option
          .setName('cta_id')
          .setDescription('ID de la CTA')
          .setRequired(true)
      )
  );

const ASSIGNABLE_ROLES = [
  { value: 'tank', label: 'Tank' },
  { value: 'healer', label: 'Healer' },
  { value: 'dps_melee', label: 'DPS Melee' },
  { value: 'dps_ranged', label: 'DPS Ranged' },
  { value: 'support', label: 'Support' },
  { value: 'scout', label: 'Scout' }
];

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'create') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const title = interaction.options.getString('titulo', true);
    const dateStr = interaction.options.getString('hora', true);
    const compo = parseMaybeJson(interaction.options.getString('compo'));
    const description = interaction.options.getString('descripcion') ?? '';

    const payload = {
      title,
      date: dateStr,
      compo,
      description,
      createdBy: interaction.user.username,
      guildId: interaction.guildId
    };

    try {
      const response = await fetch(`${API_BASE_URL}/cta/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const { data } = await response.json();
      
      // Obtener postulantes (inicialmente vacío)
      let postulants = [];
      try {
        const postulantsResponse = await fetch(`${API_BASE_URL}/cta/${data.id}/postulants`);
        if (postulantsResponse.ok) {
          const result = await postulantsResponse.json();
          postulants = result.data || [];
        }
      } catch (error) {
        console.warn('[bot] No se pudieron obtener postulantes iniciales', error);
      }
      
      // Crear embed con la información de la CTA
      const embed = await createCtaEmbed(data, compo, postulants);
      const buttons = createCtaButtons(data.id);

      // Enviar mensaje público con embed y botones
      const message = await interaction.channel.send({
        embeds: [embed],
        components: [buttons]
      });

      // Guardar el message ID en la base de datos para poder actualizarlo después
      // TODO: Agregar campo message_id a la tabla ctas

      await interaction.editReply(`✅ CTA creada y publicada correctamente!`);
    } catch (error) {
      console.error('[bot] Error creando CTA', error);
      await interaction.editReply('❌ No se pudo crear la CTA, revisa los logs.');
    }

    return;
  }

  if (subcommand === 'listar') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const response = await fetch(`${API_BASE_URL}/cta/list`);
      const { data } = await response.json();

      if (!data?.length) {
        await interaction.editReply('No hay CTAs abiertas.');
        return;
      }

      const message = data
        .map((cta) => `• **${cta.title}** (${cta.status}) → ${cta.id}`)
        .join('\n');

      await interaction.editReply(message);
    } catch (error) {
      console.error('[bot] Error listando CTAs', error);
      await interaction.editReply('No se pudo obtener la lista de CTAs.');
    }

    return;
  }

  if (subcommand === 'asignar') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const ctaId = interaction.options.getString('cta_id', true);

    try {
      const response = await fetch(`${API_BASE_URL}/cta/${ctaId}/postulants`);
      if (!response.ok) throw new Error(`Error ${response.status}`);

      const { data } = await response.json();

      if (!data?.length) {
        await interaction.editReply('No hay postulantes para esta CTA.');
        return;
      }

      const components = buildAssignmentComponents(ctaId, data);
      await interaction.editReply({
        content: 'Selecciona el rol final para cada postulante.',
        components
      });
    } catch (error) {
      console.error('[bot] Error obteniendo postulantes para asignar', error);
      await interaction.editReply('No se pudo preparar la asignación de roles.');
    }

    return;
  }

  if (subcommand === 'cerrar') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const ctaId = interaction.options.getString('cta_id', true);
      const response = await fetch(`${API_BASE_URL}/cta/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctaId })
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      await interaction.editReply(`CTA ${ctaId} cerrada correctamente.`);
    } catch (error) {
      console.error('[bot] Error cerrando CTA', error);
      await interaction.editReply('No se pudo cerrar la CTA.');
    }
  }
}

function parseMaybeJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[bot] No se pudo parsear compo como JSON, se guardará como texto');
    return { raw: value };
  }
}

function buildAssignmentComponents(ctaId, postulants) {
  const rows = [];

  for (const postulant of postulants.slice(0, 25)) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`cta-assign:${ctaId}:${postulant.user_id}`)
      .setPlaceholder(`Rol final para ${postulant.user_name}`)
      .addOptions(
        ASSIGNABLE_ROLES.map((role) => ({
          ...role,
          default: postulant.final_role === role.value
        }))
      );

    const row = new ActionRowBuilder().addComponents(select);
    rows.push(row);

    if (rows.length >= 5) break;
  }

  return rows;
}

export async function createCtaEmbed(cta, compo, postulants = []) {
  const date = new Date(cta.date);
  const utcTime = date.toISOString().substring(11, 16);
  const localTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  const embed = new EmbedBuilder()
    .setTitle(cta.title)
    .setColor(0x5865F2) // Color Discord
    .addFields(
      { name: '📅 Fecha', value: date.toLocaleDateString('es-ES'), inline: true },
      { name: '🕐 Hora (UTC)', value: utcTime, inline: true },
      { name: '🕐 Hora (Local)', value: localTime, inline: true }
    );

  if (cta.description) {
    embed.setDescription(cta.description);
  }

  // Agregar composición si existe
  if (compo && Object.keys(compo).length > 0) {
    const compoText = Object.entries(compo)
      .map(([role, count]) => `${role}: ${count}`)
      .join('\n');
    embed.addFields({ name: '⚔️ Composición', value: compoText, inline: false });
  }

  // Agregar listas de party si hay postulantes
  if (postulants && postulants.length > 0) {
    const party1 = postulants.slice(0, 20);
    const party2 = postulants.slice(20, 40);

    const party1Text = party1.length > 0
      ? party1.map((p, i) => {
          const role = p.final_role ? ` - ${p.final_role}` : '';
          const checkmark = p.final_role ? ' ✅' : '';
          return `${i + 1}. ${p.user_name}${role}${checkmark}`;
        }).join('\n')
      : 'Vacío';

    const party2Text = party2.length > 0
      ? party2.map((p, i) => {
          const role = p.final_role ? ` - ${p.final_role}` : '';
          const checkmark = p.final_role ? ' ✅' : '';
          return `${i + 21}. ${p.user_name}${role}${checkmark}`;
        }).join('\n')
      : 'Vacío';

    embed.addFields(
      { name: '⚔️ Party 1', value: party1Text.substring(0, 1024) || 'Vacío', inline: true },
      { name: '⚔️ Party 2', value: party2Text.substring(0, 1024) || 'Vacío', inline: true }
    );
  }

  embed.setFooter({ text: `Event ID: ${cta.id}` });
  embed.setTimestamp();

  return embed;
}

function createCtaButtons(ctaId) {
  const joinButton = new ButtonBuilder()
    .setCustomId(`cta:join:${ctaId}`)
    .setLabel('Join')
    .setStyle(ButtonStyle.Success);

  const leaveButton = new ButtonBuilder()
    .setCustomId(`cta:leave:${ctaId}`)
    .setLabel('Leave')
    .setStyle(ButtonStyle.Danger);

  const pingButton = new ButtonBuilder()
    .setCustomId(`cta:ping:${ctaId}`)
    .setLabel('Ping')
    .setEmoji('⚔️')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(joinButton, leaveButton, pingButton);
}

export async function handleButtonInteraction(interaction, ctaId, action) {
  try {
    const userId = interaction.user.id;
    const userName = interaction.user.username;

    if (action === 'join') {
    // Mostrar select menu para elegir roles
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`cta-postular:${ctaId}`)
      .setPlaceholder('Selecciona hasta 3 roles')
      .setMinValues(1)
      .setMaxValues(3)
      .addOptions([
        { label: 'Tank', value: 'tank' },
        { label: 'Healer', value: 'healer' },
        { label: 'DPS Melee', value: 'dps_melee' },
        { label: 'DPS Ranged', value: 'dps_ranged' },
        { label: 'Support', value: 'support' },
        { label: 'Scout', value: 'scout' }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: 'Elige los roles para los que quieres postularte:',
      components: [row],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (action === 'leave') {
    try {
      // TODO: Implementar endpoint para dejar CTA
      await interaction.reply({
        content: '✅ Te has retirado de la CTA',
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('[bot] Error dejando CTA', error);
      await interaction.reply({
        content: '❌ No se pudo procesar tu solicitud',
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }

  if (action === 'ping') {
    try {
      // Obtener postulantes y hacer ping
      const response = await fetch(`${API_BASE_URL}/cta/${ctaId}/postulants`);
      if (!response.ok) throw new Error(`Error ${response.status}`);

      const { data: postulants } = await response.json();
      const mentions = postulants
        .map(p => `<@${p.user_id}>`)
        .join(' ');

      await interaction.reply({
        content: `⚔️ **Recordatorio de CTA!** ${mentions}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('[bot] Error haciendo ping', error);
      await interaction.reply({
        content: '❌ No se pudo hacer ping a los postulantes',
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  } catch (error) {
    console.error('[bot] Error en handleButtonInteraction', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ Error procesando la acción. Intenta más tarde.');
    } else {
      await interaction.reply({
        content: '❌ Error procesando la acción. Intenta más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

export async function handleAssignmentSelect(interaction, ctaId, userId) {
  const finalRole = interaction.values?.[0];

  try {
    const response = await fetch(`${API_BASE_URL}/cta/asignar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ctaId,
        assignments: [{ userId, finalRole }]
      })
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    await interaction.update({
      content: `Rol asignado: ${finalRole}`,
      components: []
    });
  } catch (error) {
    console.error('[bot] Error asignando rol final', error);
    await interaction.update({
      content: 'No se pudo asignar el rol. Intenta nuevamente.',
      components: []
    });
  }
}

export default { data, execute, handleAssignmentSelect, handleButtonInteraction };

