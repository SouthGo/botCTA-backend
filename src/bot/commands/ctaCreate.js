import {
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

const API_BASE_URL = process.env.BACKEND_API_URL ?? 'http://localhost:4000';

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
    await interaction.deferReply({ ephemeral: true });

    const payload = {
      title: interaction.options.getString('titulo', true),
      date: interaction.options.getString('hora', true),
      compo: parseMaybeJson(interaction.options.getString('compo')),
      description: interaction.options.getString('descripcion') ?? '',
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
      await interaction.editReply(`CTA creada con ID \`${data.id}\``);
    } catch (error) {
      console.error('[bot] Error creando CTA', error);
      await interaction.editReply('No se pudo crear la CTA, revisa los logs.');
    }

    return;
  }

  if (subcommand === 'listar') {
    await interaction.deferReply({ ephemeral: true });

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
    await interaction.deferReply({ ephemeral: true });

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
    await interaction.deferReply({ ephemeral: true });

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

export default { data, execute, handleAssignmentSelect };

