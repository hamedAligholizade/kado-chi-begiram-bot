const queries = require('../database/queries');

const addGiftHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const [itemName, description] = match[1].split('|').map(s => s.trim());
    
    if (!itemName) {
      return bot.sendMessage(msg.chat.id, 
        'Please provide an item name. Usage: /addgift item name | optional description');
    }

    await queries.addGiftPreference(userId, itemName, description || null);
    await bot.sendMessage(msg.chat.id, `Added "${itemName}" to your gift preferences! 🎁`);
  } catch (error) {
    console.error('Error in addGift:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your request.');
  }
};

const removeGiftHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const itemName = match[1]?.trim();
    
    if (!itemName) {
      return bot.sendMessage(msg.chat.id, 
        'Please provide an item name to remove. Usage: /removegift item name');
    }

    await queries.removeGiftPreference(userId, itemName);
    await bot.sendMessage(msg.chat.id, `Removed "${itemName}" from your gift preferences! ✅`);
  } catch (error) {
    console.error('Error in removeGift:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your request.');
  }
};

const listGiftsHandler = async (msg, bot) => {
  try {
    const userId = msg.from.id;
    const preferences = await queries.getUserGiftPreferences(userId);
    
    if (!preferences.length) {
      return bot.sendMessage(msg.chat.id, 
        'You haven\'t added any gift preferences yet. Use /addgift to add some!');
    }

    const message = preferences
      .map(p => p.description 
        ? `• ${p.item_name} - ${p.description}`
        : `• ${p.item_name}`)
      .join('\n');

    await bot.sendMessage(msg.chat.id, 
      '🎁 Your gift preferences:\n\n' + message);
  } catch (error) {
    console.error('Error in listGifts:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your request.');
  }
};

const suggestGiftsHandler = async (msg, bot, match) => {
  try {
    const username = match[1]?.trim();
    
    if (!username) {
      return bot.sendMessage(msg.chat.id, 
        'Please provide a username. Usage: /suggest @username');
    }

    const cleanUsername = username.replace('@', '');
    const user = await queries.getUserByUsername(cleanUsername);
    
    if (!user) {
      return bot.sendMessage(msg.chat.id, 
        'User not found. Make sure they have interacted with the bot!');
    }

    const preferences = await queries.getUserGiftPreferences(user.user_id);
    
    if (!preferences.length) {
      return bot.sendMessage(msg.chat.id, 
        `${username} hasn't added any gift preferences yet!`);
    }

    const message = preferences
      .map(p => p.description 
        ? `• ${p.item_name} - ${p.description}`
        : `• ${p.item_name}`)
      .join('\n');

    await bot.sendMessage(msg.chat.id, 
      `🎁 Gift suggestions for ${username}:\n\n${message}`);
  } catch (error) {
    console.error('Error in suggestGifts:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your request.');
  }
};

module.exports = {
  addGiftHandler,
  removeGiftHandler,
  listGiftsHandler,
  suggestGiftsHandler
}; 