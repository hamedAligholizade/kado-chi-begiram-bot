const queries = require('../database/queries');

const setBirthdayHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const dateStr = match[1]?.trim();
    
    if (!dateStr) {
      return bot.sendMessage(msg.chat.id, 
        'Please provide your birthday in YYYY-MM-DD format. Example: /setbirthday 1990-12-31');
    }

    // Validate date format
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return bot.sendMessage(msg.chat.id, 
        'Invalid date format. Please use YYYY-MM-DD format. Example: /setbirthday 1990-12-31');
    }

    await queries.setBirthday(userId, dateStr);
    await bot.sendMessage(msg.chat.id, '🎂 Your birthday has been set!');
  } catch (error) {
    console.error('Error in setBirthday:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your request.');
  }
};

const getBirthdayHandler = async (msg, bot) => {
  try {
    const userId = msg.from.id;
    const birthday = await queries.getBirthday(userId);
    
    if (!birthday) {
      return bot.sendMessage(msg.chat.id, 
        'You haven\'t set your birthday yet. Use /setbirthday YYYY-MM-DD to set it!');
    }

    const date = new Date(birthday);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    await bot.sendMessage(msg.chat.id, `🎂 Your birthday is set to: ${formattedDate}`);
  } catch (error) {
    console.error('Error in getBirthday:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your request.');
  }
};

const upcomingBirthdaysHandler = async (msg, bot) => {
  try {
    const birthdays = await queries.getUpcomingBirthdays(7); // Next 7 days
    
    if (!birthdays.length) {
      return bot.sendMessage(msg.chat.id, 'No upcoming birthdays in the next 7 days! 🎂');
    }

    const message = birthdays.map(b => {
      const date = new Date(b.birth_date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      });
      const name = b.first_name || b.username;
      return `• ${formattedDate} - ${name}`;
    }).join('\n');

    await bot.sendMessage(msg.chat.id, 
      '🎂 Upcoming birthdays in the next 7 days:\n\n' + message);
  } catch (error) {
    console.error('Error in upcomingBirthdays:', error);
    await bot.sendMessage(msg.chat.id, 'Sorry, there was an error processing your request.');
  }
};

module.exports = {
  setBirthdayHandler,
  getBirthdayHandler,
  upcomingBirthdaysHandler
}; 