const queries = require('../database/queries');
const moment = require('moment-jalaali');

// Persian month names
const PERSIAN_MONTHS = {
  1: 'فروردین',
  2: 'اردیبهشت',
  3: 'خرداد',
  4: 'تیر',
  5: 'مرداد',
  6: 'شهریور',
  7: 'مهر',
  8: 'آبان',
  9: 'آذر',
  10: 'دی',
  11: 'بهمن',
  12: 'اسفند'
};

// Format Jalali date in Persian
const formatJalaliDate = (jDate) => {
  const day = jDate.jDate();
  const month = PERSIAN_MONTHS[jDate.jMonth() + 1];
  const year = jDate.jYear();
  return `${day} ${month} ${year}`;
};

const addToWatchlistHandler = async (msg, bot, match) => {
  try {
    const watcherId = msg.from.id;
    const username = match[1]?.trim();
    
    if (!username) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا نام کاربری را وارد کنید. مثال: /watch @username');
    }

    const cleanUsername = username.replace('@', '');
    await queries.addToWatchlist(watcherId, cleanUsername);
    await bot.sendMessage(msg.chat.id, 
      `✅ کاربر ${username} به لیست دنبال‌شوندگان اضافه شد! یادآوری تولد برای این کاربر فعال شد.`);
  } catch (error) {
    if (error.message === 'User not found') {
      await bot.sendMessage(msg.chat.id, 
        'کاربر مورد نظر پیدا نشد. لطفا مطمئن شوید که کاربر با ربات تعامل داشته است!');
    } else if (error.message === 'You cannot add yourself to your watchlist') {
      await bot.sendMessage(msg.chat.id, 
        'شما نمی‌توانید خودتان را به لیست دنبال‌شوندگان اضافه کنید!');
    } else {
      console.error('Error in addToWatchlist:', error);
      await bot.sendMessage(msg.chat.id, 
        'متأسفانه در افزودن کاربر مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
    }
  }
};

const removeFromWatchlistHandler = async (msg, bot, match) => {
  try {
    const watcherId = msg.from.id;
    const username = match[1]?.trim();
    
    if (!username) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا نام کاربری را وارد کنید. مثال: /unwatch @username');
    }

    const cleanUsername = username.replace('@', '');
    await queries.removeFromWatchlist(watcherId, cleanUsername);
    await bot.sendMessage(msg.chat.id, 
      `✅ کاربر ${username} از لیست دنبال‌شوندگان حذف شد.`);
  } catch (error) {
    if (error.message === 'User not found') {
      await bot.sendMessage(msg.chat.id, 
        'کاربر مورد نظر پیدا نشد. لطفا مطمئن شوید که کاربر با ربات تعامل داشته است!');
    } else {
      console.error('Error in removeFromWatchlist:', error);
      await bot.sendMessage(msg.chat.id, 
        'متأسفانه در حذف کاربر مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
    }
  }
};

const listWatchlistHandler = async (msg, bot) => {
  try {
    const watcherId = msg.from.id;
    const watchlist = await queries.getWatchlist(watcherId);
    
    if (!watchlist.length) {
      return bot.sendMessage(msg.chat.id, 
        'لیست دنبال‌شوندگان شما خالی است. برای افزودن کاربر از دستور /watch @username استفاده کنید!');
    }

    const message = watchlist.map(w => {
      const name = w.first_name || w.username;
      if (w.birth_date) {
        const jDate = moment(w.birth_date);
        const day = jDate.jDate();
        const month = PERSIAN_MONTHS[jDate.jMonth() + 1];
        return `• ${name} - تاریخ تولد: ${day} ${month}`;
      }
      return `• ${name} - تاریخ تولد ثبت نشده`;
    }).join('\n');

    await bot.sendMessage(msg.chat.id, 
      '👥 لیست دنبال‌شوندگان شما:\n\n' + message);
  } catch (error) {
    console.error('Error in listWatchlist:', error);
    await bot.sendMessage(msg.chat.id, 
      'متأسفانه در نمایش لیست دنبال‌شوندگان مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

// Function to send birthday reminders
const sendBirthdayReminders = async (bot) => {
  try {
    const reminders = await queries.getBirthdayReminders();
    
    for (const reminder of reminders) {
      const name = reminder.watched_firstname || reminder.watched_username;
      const jDate = moment(reminder.birth_date);
      const day = jDate.jDate();
      const month = PERSIAN_MONTHS[jDate.jMonth() + 1];
      let message;
      
      switch (reminder.reminder_type) {
        case 'two_week':
          message = `🎂 یادآوری: دو هفته تا تولد ${name} (${day} ${month}) باقی مانده است!`;
          break;
        case 'one_week':
          message = `🎂 یادآوری: یک هفته تا تولد ${name} (${day} ${month}) باقی مانده است!`;
          break;
        case 'three_day':
          message = `🎂 یادآوری: سه روز تا تولد ${name} (${day} ${month}) باقی مانده است!\nبرای دیدن لیست هدایای مورد علاقه‌ی ایشان از دستور /suggest @${reminder.watched_username} استفاده کنید`;
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