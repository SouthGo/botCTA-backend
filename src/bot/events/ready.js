import { REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommandsData() {
  const commandsDir = path.join(__dirname, '../commands');
  const files = await readdir(commandsDir);
  const commandsData = [];

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(commandsDir, file);
    const commandModule = await import(filePath);
    const command = commandModule.default ?? commandModule;
    if (!command?.data) continue;
    commandsData.push(command.data.toJSON());
  }

  return commandsData;
}

async function tryRegisterCommands(client) {
  const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) return;

  const commandsData = await loadCommandsData();
  if (!commandsData.length) return;

  const rest = new REST({ version: '10' }).setToken(token);

  if (guildId) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsData }
      );
      console.log(`[bot] ✅ Comandos registrados en servidor después de conexión (guild: ${guildId})`);
      return;
    } catch (error) {
      if (error.code === 50001) {
        console.warn(`[bot] ⚠️  El bot no tiene permisos para registrar comandos en el servidor.`);
        console.warn(`[bot] ⚠️  Reinvita el bot con el scope 'applications.commands':`);
        console.warn(`[bot] ⚠️  https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`);
      }
    }
  }

  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commandsData });
    console.log('[bot] ✅ Comandos globales registrados (pueden tardar hasta 1 hora)');
  } catch (error) {
    // Silenciar error si ya se registraron antes
    if (error.code !== 50001) {
      console.error('[bot] Error registrando comandos globales:', error.message);
    }
  }
}

export const name = 'ready';
export const once = true;

export async function execute(client) {
  console.log(`[bot] Conectado como ${client.user.tag}`);
  // Intentar registrar comandos nuevamente cuando el bot esté listo
  await tryRegisterCommands(client);
}

export default { name, once, execute };

