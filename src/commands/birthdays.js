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

const setBirthdayHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const dateStr = match[1]?.trim();
    
    if (!dateStr) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا تاریخ تولد خود را به فرمت YYYY-MM-DD وارد کنید. مثال: /setbirthday 1370-06-15');
    }

    // Validate Jalali date format
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Check if the date components are valid numbers
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return bot.sendMessage(msg.chat.id, 
        'فرمت تاریخ نامعتبر است. لطفا از فرمت YYYY-MM-DD استفاده کنید. مثال: /setbirthday 1370-06-15');
    }

    // Create a moment object with the Jalali date
    const jDate = moment(`${year}-${month}-${day}`, 'jYYYY-jMM-jDD');
    
    // Check if it's a valid Jalali date
    if (!jDate.isValid()) {
      return bot.sendMessage(msg.chat.id, 
        'تاریخ وارد شده نامعتبر است. لطفا یک تاریخ معتبر وارد کنید. مثال: /setbirthday 1370-06-15');
    }

    // Additional validation for reasonable date ranges
    if (year < 1300 || year > 1420) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا سال را بین ۱۳۰۰ تا ۱۴۲۰ وارد کنید.');
    }

    if (month < 1 || month > 12) {
      return bot.sendMessage(msg.chat.id, 
        'ماه باید بین ۱ تا ۱۲ باشد.');
    }

    if (day < 1 || day > 31 || (month <= 6 && day > 31) || (month > 6 && day > 30) || (month === 12 && day > 29)) {
      return bot.sendMessage(msg.chat.id, 
        'روز وارد شده برای این ماه در تقویم شمسی نامعتبر است.');
    }

    // Convert Jalali to Gregorian for storage
    const gregorianDate = jDate.format('YYYY-MM-DD');
    await queries.setBirthday(userId, gregorianDate);
    
    // Format the Jalali date for display
    const formattedDate = formatJalaliDate(jDate);
    await bot.sendMessage(msg.chat.id, `🎂 تاریخ تولد شما با موفقیت ثبت شد: ${formattedDate}`);
  } catch (error) {
    console.error('Error in setBirthday:', error);
    await bot.sendMessage(msg.chat.id, 'متأسفانه در ثبت تاریخ تولد مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const getBirthdayHandler = async (msg, bot) => {
  try {
    const userId = msg.from.id;
    const birthday = await queries.getBirthday(userId);
    
    if (!birthday) {
      return bot.sendMessage(msg.chat.id, 
        'شما هنوز تاریخ تولد خود را ثبت نکرده‌اید. برای ثبت از دستور /setbirthday YYYY-MM-DD استفاده کنید. (مثال: /setbirthday 1370-06-15)');
    }

    // Convert Gregorian to Jalali for display
    const jDate = moment(birthday);
    const formattedDate = formatJalaliDate(jDate);
    await bot.sendMessage(msg.chat.id, `🎂 تاریخ تولد شما: ${formattedDate}`);
  } catch (error) {
    console.error('Error in getBirthday:', error);
    await bot.sendMessage(msg.chat.id, 'متأسفانه در نمایش تاریخ تولد مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
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