export const name = 'ready';
export const once = true;

export async function execute(client) {
  console.log(`[bot] Conectado como ${client.user.tag}`);
}

export default { name, once, execute };

