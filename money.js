// ...[your other required imports]...
const mineflayer = require('mineflayer');
const express = require('express');
const { Authflow } = require('prismarine-auth');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock, GoalXZ } = require('mineflayer-pathfinder').goals;
const readline = require('readline');
const config = require('./settings.json');
const loggers = require('./logging.js');
const logger = loggers.logger;
const app = express();

app.listen(3000);

let shardCount = 0;
let startTime = Date.now();

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
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    console.log("Bot is ready and pathfinder initialized.");

    logger.info("Bot joined to the server");

    // Spam loop: "DOUBLING MONEY 400K MAX"
    function randomSpamLoop() {
      const delay = Math.floor(Math.random() * 10000) + 5000; // 5 to 15 seconds
      setTimeout(() => {
        bot.chat("DOUBLING MONEY 400K MAX");
        randomSpamLoop(); // Loop again
      }, delay);
    }

    randomSpamLoop(); // Start the loop after spawn

    // Wait 5 seconds, execute /afk, and click slot 49
    try {
      await new Promise((res) => setTimeout(res, 5000));
      bot.chat("/afk");
      console.log("[*] Executed /afk");

      await new Promise((res) => setTimeout(res, 2000));

      const slotToClick = 49;
      bot.clickWindow(slotToClick, 0, 0);
      console.log(`[*] Clicked on slot ${slotToClick}`);
    } catch (err) {
      console.error("[!] Error during /afk and slot interaction:", err);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', (input) => {
      if (input.trim()) {
        bot.chat(input.trim());
        console.log(`You: ${input.trim()}`);
      }
    });
  });

  setInterval(() => {
    shardCount++;
    const shardMessage = `\u001b[33mShards collected: ${shardCount}\u001b[0m`;
    logger.info(`Shards collected: ${shardCount}`);
    console.log(shardMessage);
  }, 60000);

  bot.on('message', (message) => {
    if (!message.json.translate || !message.json.translate.startsWith('chat.type.text')) {
      const msgText = message.toString().replace(/§./g, '');
      logger.info(`[CHAT] ${msgText}`);
      console.log(`[CHAT] ${msgText}`);
    }
  });

  bot.on('goal_reached', () => {
    if (config.position.enabled) {
      logger.info(`Bot arrived at target location: ${bot.entity.position}`);
    }
  });

  bot.on('death', () => {
    logger.warn(`Bot has died and respawned at ${bot.entity.position}`);
  });

  bot.on('kicked', (reason) => {
    let reasonText;
    try {
      reasonText = JSON.parse(reason).text;
    } catch {
      reasonText = reason;
    }
    logger.warn(`Bot was kicked: ${reasonText}`);
  });

  bot.on('error', (err) => logger.error(`${err.message}`));

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      logger.warn('Bot disconnected. Attempting to reconnect...');
      setTimeout(createBot, config.utils['auto-reconnect-delay']);
    });
  }
}

createBot();
