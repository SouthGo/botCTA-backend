import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const botBridge = {
  async notifyOfficials(ctaId, { cta } = {}) {
    const channelId = process.env.DISCORD_OFFICER_CHANNEL_ID;
    if (!channelId) {
      console.warn('[bot] DISCORD_OFFICER_CHANNEL_ID no configurado, notificando vía consola');
      console.info(`[bot] CTA ${ctaId} requiere asignación de roles`, cta);
      return;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) throw new Error('Canal no encontrado');

      const name = cta?.title ?? ctaId;
      await channel.send(`⚠️ Falta poco para la CTA **${name}**\nAquí están los postulantes. Debes asignar roles.`);
    } catch (error) {
      console.error('[bot] No se pudo notificar a los oficiales', error);
    }
  }
};

async function loadCommands() {
  const commandsDir = path.join(__dirname, 'commands');
  const files = await readdir(commandsDir);
  const commandsData = [];

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(commandsDir, file);
    const commandModule = await import(filePath);
    const command = commandModule.default ?? commandModule;
    if (!command?.data || !command?.execute) continue;

    client.commands.set(command.data.name, command);
    commandsData.push(command.data.toJSON());
  }

  return commandsData;
}

async function registerCommands(commandsData) {
  if (!commandsData.length) return;
  const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    console.warn('[bot] Faltan DISCORD_TOKEN (o DISCORD_BOT_TOKEN) o DISCORD_CLIENT_ID, no se registrarán comandos');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsData }
      );
      console.log('[bot] Comandos registrados en servidor específico');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commandsData });
      console.log('[bot] Comandos globales registrados');
    }
  } catch (error) {
    console.error('[bot] Error registrando comandos', error);
  }
}

async function loadEvents() {
  const eventsDir = path.join(__dirname, 'events');
  const files = await readdir(eventsDir);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(eventsDir, file);
    const eventModule = await import(filePath);
    const event = eventModule.default ?? eventModule;
    if (!event?.name || !event?.execute) continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}

export async function initializeBot() {
  const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn('[bot] DISCORD_TOKEN (o DISCORD_BOT_TOKEN) no configurado, el bot no se iniciará');
    return botBridge;
  }

  try {
    const commandsData = await loadCommands();
    await registerCommands(commandsData);
    await loadEvents();
    await client.login(token);
  } catch (error) {
    console.error('[bot] Error durante la inicialización', error);
  }

  return botBridge;
}

export function getBotBridge() {
  return botBridge;
}

export default client;

