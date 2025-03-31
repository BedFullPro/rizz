const mineflayer = require('mineflayer');
const express = require('express');
const { Authflow } = require('prismarine-auth');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const readline = require('readline');
const config = require('./settings.json');
const loggers = require('./logging.js');
const logger = loggers.logger;
const app = express();

app.listen(3000);

let shardCount = 0;

function createBot() {
  const authflow = new Authflow(config['bot-account']['username'], config['bot-account']['authflow-cache-location']);
  const bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
    auth: config['bot-account']['type'],
    username: authflow.username,
    authflow: authflow
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    console.log("Bot is ready.");

    logger.info("Bot joined the server");

    function randomSpamLoop() {
      const delay = Math.floor(Math.random() * 10000) + 5000; // 5-15 sec
      const randomAmount = Math.floor(Math.random() * 800) + 100; // 100K-900K

      setTimeout(() => {
        bot.chat(`DOUBLING MONEY ${randomAmount}K MAX`);
        randomSpamLoop();
      }, delay);
    }

    randomSpamLoop();

    await new Promise(res => setTimeout(res, 5000));
    bot.chat("/afk");
    await new Promise(res => setTimeout(res, 2000));
    bot.clickWindow(49, 0, 0);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('line', input => { if (input.trim()) bot.chat(input.trim()); });
  });

  setInterval(() => {
    shardCount++;
    logger.info(`Shards collected: ${shardCount}`);
    console.log(`Shards collected: ${shardCount}`);
  }, 60000);

  bot.on('message', message => {
    if (!message.json.translate || !message.json.translate.startsWith('chat.type.text')) {
      const msgText = message.toString().replace(/§./g, '');
      logger.info(`[CHAT] ${msgText}`);
      console.log(`[CHAT] ${msgText}`);
    }
  });

  bot.on('goal_reached', () => {
    if (config.position.enabled) logger.info(`Arrived at ${bot.entity.position}`);
  });

  bot.on('death', () => logger.warn(`Bot died at ${bot.entity.position}`));
  bot.on('kicked', reason => logger.warn(`Bot was kicked: ${reason}`));
  bot.on('error', err => logger.error(err.message));

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      logger.warn('Bot disconnected. Reconnecting...');
      setTimeout(createBot, config.utils['auto-reconnect-delay']);
    });
  }
}

createBot();
