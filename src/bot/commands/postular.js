import {
  ActionRowBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

const AVAILABLE_ROLES = [
  { value: 'tank', label: 'Tank' },
  { value: 'healer', label: 'Healer' },
  { value: 'dps_melee', label: 'DPS Melee' },
  { value: 'dps_ranged', label: 'DPS Ranged' },
  { value: 'support', label: 'Support' },
  { value: 'scout', label: 'Scout' }
];

const API_BASE_URL = process.env.BACKEND_API_URL ?? `http://localhost:${process.env.PORT || 4000}`;

export const data = new SlashCommandBuilder()
  .setName('postular')
  .setDescription('Postúlate a una CTA')
  .addStringOption((option) =>
    option
      .setName('cta_id')
      .setDescription('ID de la CTA')
      .setRequired(true)
  );

export async function execute(interaction) {
  const ctaId = interaction.options.getString('cta_id', true);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`cta-postular:${ctaId}`)
    .setPlaceholder('Selecciona hasta 3 roles')
    .setMinValues(1)
    .setMaxValues(3)
    .addOptions(AVAILABLE_ROLES);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: 'Elige los roles para los que quieres postularte.',
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

export async function handleSelect(interaction, ctaId) {
  const roles = interaction.values;

  try {
    const response = await fetch(`${API_BASE_URL}/cta/postular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ctaId,
        userId: interaction.user.id,
        userName: interaction.user.username,
        roles
      })
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    await interaction.update({
      content: '¡Postulación enviada! Mucha suerte.',
      components: []
    });
  } catch (error) {
    console.error('[bot] Error registrando postulación', error);
    await interaction.update({
      content: 'No se pudo registrar tu postulación. Intenta más tarde.',
      components: []
    });
  }
}

export default { data, execute, handleSelect };

