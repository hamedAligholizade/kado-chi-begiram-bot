const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const { initDatabase } = require('./database/init');
const queries = require('./database/queries');
const { statsHandler } = require('./commands/stats');
const { broadcastHandler } = require('./commands/broadcast');
const { 
  addGiftHandler, 
  removeGiftHandler, 
  listGiftsHandler, 
  suggestGiftsHandler 
} = require('./commands/gifts');
const {
  setBirthdayHandler,
  getBirthdayHandler
} = require('./commands/birthdays');
const {
  addToWatchlistHandler,
  removeFromWatchlistHandler,
  listWatchlistHandler,
  sendBirthdayReminders
} = require('./commands/watchlist');

async function startBot() {
  try {
    // Initialize database first
    await initDatabase();

    // Initialize bot
    const bot = new TelegramBot(config.botToken, { polling: true });

    // Command handlers
    bot.onText(/\/start/, async (msg) => {
      const { id: userId, username, first_name, last_name } = msg.from;
      const botName = (await bot.getMe()).username;

      try {
        await queries.saveUser(userId, username, first_name, last_name, botName);
        const welcomeMessage = `
Welcome to the Gift & Birthday Bot! 👋

Here are the available commands:

Gift Management:
/addgift item name | description - Add an item you'd like to receive
/removegift item name - Remove an item from your list
/listgifts - See your gift preferences
/suggest @username - Get gift suggestions for a friend

Birthday Management (Using Jalali Calendar):
/setbirthday YYYY-MM-DD - Set your birthday (Example: 1370-06-15)
/birthday - See your birthday

Watchlist Management:
/watch @username - Add someone to your watchlist
/unwatch @username - Remove someone from your watchlist
/watchlist - See your watchlist

Other Commands:
/help - Show this help message
`;
        await bot.sendMessage(msg.chat.id, welcomeMessage);
      } catch (error) {
        console.error('Error saving user:', error);
        await bot.sendMessage(msg.chat.id, 'An error occurred while processing your request.');
      }
    });

    // Gift-related commands
    bot.onText(/\/addgift (.+)/, (msg, match) => addGiftHandler(msg, bot, match));
    bot.onText(/\/removegift (.+)/, (msg, match) => removeGiftHandler(msg, bot, match));
    bot.onText(/\/listgifts/, (msg) => listGiftsHandler(msg, bot));
    bot.onText(/\/suggest (.+)/, (msg, match) => suggestGiftsHandler(msg, bot, match));

    // Birthday-related commands
    bot.onText(/\/setbirthday (.+)/, (msg, match) => setBirthdayHandler(msg, bot, match));
    bot.onText(/\/birthday/, (msg) => getBirthdayHandler(msg, bot));

    // Watchlist commands
    bot.onText(/\/watch (.+)/, (msg, match) => addToWatchlistHandler(msg, bot, match));
    bot.onText(/\/unwatch (.+)/, (msg, match) => removeFromWatchlistHandler(msg, bot, match));
    bot.onText(/\/watchlist/, (msg) => listWatchlistHandler(msg, bot));

    // Help command
    bot.onText(/\/help/, async (msg) => {
      const helpMessage = `
Here are the available commands:

Gift Management:
/addgift item name | description - Add an item you'd like to receive
/removegift item name - Remove an item from your list
/listgifts - See your gift preferences
/suggest @username - Get gift suggestions for a friend

Birthday Management (Using Jalali Calendar):
/setbirthday YYYY-MM-DD - Set your birthday (Example: 1370-06-15)
/birthday - See your birthday

Watchlist Management:
/watch @username - Add someone to your watchlist
/unwatch @username - Remove someone from your watchlist
/watchlist - See your watchlist

Other Commands:
/stats - See bot statistics
/help - Show this help message
`;
      await bot.sendMessage(msg.chat.id, helpMessage);
    });

    // Other commands
    bot.onText(/\/stats/, (msg) => statsHandler(msg, bot));
    bot.onText(/\/broadcast (.+)/, (msg) => broadcastHandler(msg, bot));

    // Set up periodic birthday reminder check (every hour)
    setInterval(() => {
      sendBirthdayReminders(bot).catch(error => {
        console.error('Error in birthday reminder interval:', error);
      });
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    // Error handling
    bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });

    console.log('Bot is running...');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

startBot(); 