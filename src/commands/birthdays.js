const queries = require('../database/queries');
const moment = require('moment-jalaali');

const setBirthdayHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const dateStr = match[1]?.trim();
    
    if (!dateStr) {
      return bot.sendMessage(msg.chat.id, 
        'Please provide your birthday in Jalali format (YYYY-MM-DD). Example: /setbirthday 1370-06-15');
    }

    // Validate Jalali date format
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!moment.jIsValidJalaaliDate(year, month, day)) {
      return bot.sendMessage(msg.chat.id, 
        'Invalid Jalali date format. Please use YYYY-MM-DD format. Example: /setbirthday 1370-06-15');
    }

    // Convert Jalali to Gregorian for storage
    const gregorianDate = moment(`${year}-${month}-${day}`, 'jYYYY-jMM-jDD').format('YYYY-MM-DD');
    await queries.setBirthday(userId, gregorianDate);
    
    // Format the Jalali date for display
    const formattedDate = moment(gregorianDate).format('jDD jMMMM jYYYY');
    await bot.sendMessage(msg.chat.id, `🎂 Your birthday has been set to: ${formattedDate}`);
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
        'You haven\'t set your birthday yet. Use /setbirthday YYYY-MM-DD to set it! (Example: 1370-06-15)');
    }

    // Convert Gregorian to Jalali for display
    const formattedDate = moment(birthday).format('jDD jMMMM jYYYY');
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