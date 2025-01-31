const queries = require('../database/queries');
const moment = require('moment-jalaali');

const addToWatchlistHandler = async (msg, bot, match) => {
  try {
    const watcherId = msg.from.id;
    const username = match[1]?.trim();
    
    if (!username) {
      return bot.sendMessage(msg.chat.id, 
        'Please provide a username. Usage: /watch @username');
    }

    const cleanUsername = username.replace('@', '');
    await queries.addToWatchlist(watcherId, cleanUsername);
    await bot.sendMessage(msg.chat.id, 
      `✅ Added ${username} to your watchlist! You'll receive birthday reminders for them.`);
  } catch (error) {
    if (error.message === 'User not found') {
      await bot.sendMessage(msg.chat.id, 
        'User not found. Make sure they have interacted with the bot!');
    } else if (error.message === 'You cannot add yourself to your watchlist') {
      await bot.sendMessage(msg.chat.id, 
        'You cannot add yourself to your watchlist!');
    } else {
      console.error('Error in addToWatchlist:', error);
      await bot.sendMessage(msg.chat.id, 
        'Sorry, there was an error processing your request.');
    }
  }
};

const removeFromWatchlistHandler = async (msg, bot, match) => {
  try {
    const watcherId = msg.from.id;
    const username = match[1]?.trim();
    
    if (!username) {
      return bot.sendMessage(msg.chat.id, 
        'Please provide a username. Usage: /unwatch @username');
    }

    const cleanUsername = username.replace('@', '');
    await queries.removeFromWatchlist(watcherId, cleanUsername);
    await bot.sendMessage(msg.chat.id, 
      `✅ Removed ${username} from your watchlist.`);
  } catch (error) {
    if (error.message === 'User not found') {
      await bot.sendMessage(msg.chat.id, 
        'User not found. Make sure they have interacted with the bot!');
    } else {
      console.error('Error in removeFromWatchlist:', error);
      await bot.sendMessage(msg.chat.id, 
        'Sorry, there was an error processing your request.');
    }
  }
};

const listWatchlistHandler = async (msg, bot) => {
  try {
    const watcherId = msg.from.id;
    const watchlist = await queries.getWatchlist(watcherId);
    
    if (!watchlist.length) {
      return bot.sendMessage(msg.chat.id, 
        'Your watchlist is empty. Use /watch @username to add someone!');
    }

    const message = watchlist.map(w => {
      const name = w.first_name || w.username;
      if (w.birth_date) {
        // Convert Gregorian to Jalali for display
        const formattedDate = moment(w.birth_date).format('jDD jMMMM');
        return `• ${name} - Birthday: ${formattedDate}`;
      }
      return `• ${name} - Birthday not set`;
    }).join('\n');

    await bot.sendMessage(msg.chat.id, 
      '👥 Your watchlist:\n\n' + message);
  } catch (error) {
    console.error('Error in listWatchlist:', error);
    await bot.sendMessage(msg.chat.id, 
      'Sorry, there was an error processing your request.');
  }
};

// Function to send birthday reminders
const sendBirthdayReminders = async (bot) => {
  try {
    const reminders = await queries.getBirthdayReminders();
    
    for (const reminder of reminders) {
      const name = reminder.watched_firstname || reminder.watched_username;
      const birthDate = moment(reminder.birth_date).format('jDD jMMMM');
      let message;
      
      switch (reminder.reminder_type) {
        case 'two_week':
          message = `🎂 Reminder: ${name}'s birthday (${birthDate}) is in 2 weeks!`;
          break;
        case 'one_week':
          message = `🎂 Reminder: ${name}'s birthday (${birthDate}) is in 1 week!`;
          break;
        case 'three_day':
          message = `🎂 Reminder: ${name}'s birthday (${birthDate}) is in 3 days!\nDon't forget to check their gift preferences with /suggest @${reminder.watched_username}`;
          break;
      }

      await bot.sendMessage(reminder.watcher_user_id, message);
      await queries.logReminder(
        reminder.watcher_id,
        reminder.watched_id,
        reminder.reminder_type,
        reminder.current_year
      );
    }
  } catch (error) {
    console.error('Error sending birthday reminders:', error);
  }
};

module.exports = {
  addToWatchlistHandler,
  removeFromWatchlistHandler,
  listWatchlistHandler,
  sendBirthdayReminders
}; 