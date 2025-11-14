import { MessageFlags } from 'discord.js';
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
          flags: MessageFlags.Ephemeral
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

  if (interaction.isButton()) {
    try {
      const parts = interaction.customId.split(':');
      if (parts.length < 3) {
        console.warn('[bot] CustomId de botón inválido:', interaction.customId);
        return;
      }

      const [type, action, ...ctaIdParts] = parts;
      const ctaId = ctaIdParts.join(':'); // En caso de que el ID tenga ':'

      if (type === 'cta' && action && ctaId) {
        await ctaCommand.handleButtonInteraction(interaction, ctaId, action);
        return;
      }
    } catch (error) {
      console.error('[bot] Error manejando botón', error, interaction.customId);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply('❌ Error en esta interacción');
        } else {
          await interaction.reply({
            content: '❌ Error en esta interacción',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (replyError) {
        console.error('[bot] Error enviando mensaje de error', replyError);
      }
    }
    return;
  }
}

export default { name, execute };

