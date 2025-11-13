import ctaCommand from '../commands/ctaCreate.js';
import postularCommand from '../commands/postular.js';

export const name = 'interactionCreate';

export async function execute(client, interaction) {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('[bot] Error ejecutando comando', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Ocurrió un error al ejecutar el comando.');
      } else {
        await interaction.reply({
          content: 'Ocurrió un error al ejecutar el comando.',
          ephemeral: true
        });
      }
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const [type, ctaId, userId] = interaction.customId.split(':');

    if (type === 'cta-postular') {
      await postularCommand.handleSelect(interaction, ctaId);
      return;
    }

    if (type === 'cta-assign') {
      await ctaCommand.handleAssignmentSelect(interaction, ctaId, userId);
      return;
    }
  }
}

export default { name, execute };

