module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`[EVENT] Bot prêt - ${client.guilds.cache.size} serveurs`);
  },
};
