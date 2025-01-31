const queries = require('../database/queries');

const addGiftHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const [itemName, description] = match[1].split('|').map(s => s.trim());
    
    if (!itemName) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا نام هدیه را وارد کنید. مثال: /addgift نام هدیه | توضیحات (اختیاری)');
    }

    await queries.addGiftPreference(userId, itemName, description || null);
    await bot.sendMessage(msg.chat.id, `✅ "${itemName}" به لیست هدایای مورد علاقه شما اضافه شد!`);
  } catch (error) {
    console.error('Error in addGift:', error);
    await bot.sendMessage(msg.chat.id, 'متأسفانه در افزودن هدیه مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const removeGiftHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const itemName = match[1]?.trim();
    
    if (!itemName) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا نام هدیه را وارد کنید. مثال: /removegift نام هدیه');
    }

    await queries.removeGiftPreference(userId, itemName);
    await bot.sendMessage(msg.chat.id, `✅ "${itemName}" از لیست هدایای مورد علاقه شما حذف شد.`);
  } catch (error) {
    console.error('Error in removeGift:', error);
    await bot.sendMessage(msg.chat.id, 'متأسفانه در حذف هدیه مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const listGiftsHandler = async (msg, bot) => {
  try {
    const userId = msg.from.id;
    const preferences = await queries.getUserGiftPreferences(userId);
    
    if (!preferences.length) {
      return bot.sendMessage(msg.chat.id, 
        'شما هنوز هیچ هدیه‌ای به لیست اضافه نکرده‌اید. برای افزودن از دستور /addgift استفاده کنید!');
    }

    const message = preferences
      .map(p => p.description 
        ? `• ${p.item_name} - ${p.description}`
        : `• ${p.item_name}`)
      .join('\n');

    await bot.sendMessage(msg.chat.id, 
      '🎁 لیست هدایای مورد علاقه شما:\n\n' + message);
  } catch (error) {
    console.error('Error in listGifts:', error);
    await bot.sendMessage(msg.chat.id, 'متأسفانه در نمایش لیست هدایا مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const suggestGiftsHandler = async (msg, bot, match) => {
  try {
    const username = match[1]?.trim();
    
    if (!username) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا نام کاربری را وارد کنید. مثال: /suggest @username');
    }

    const cleanUsername = username.replace('@', '');
    const user = await queries.getUserByUsername(cleanUsername);
    
    if (!user) {
      return bot.sendMessage(msg.chat.id, 
        'کاربر مورد نظر پیدا نشد. لطفا مطمئن شوید که کاربر با ربات تعامل داشته است!');
    }

    const preferences = await queries.getUserGiftPreferences(user.user_id);
    
    if (!preferences.length) {
      return bot.sendMessage(msg.chat.id, 
        `${username} هنوز هیچ هدیه‌ای به لیست خود اضافه نکرده است!`);
    }

    const message = preferences
      .map(p => p.description 
        ? `• ${p.item_name} - ${p.description}`
        : `• ${p.item_name}`)
      .join('\n');

    await bot.sendMessage(msg.chat.id, 
      `🎁 پیشنهادات هدیه برای ${username}:\n\n${message}`);
  } catch (error) {
    console.error('Error in suggestGifts:', error);
    await bot.sendMessage(msg.chat.id, 'متأسفانه در دریافت لیست هدایا مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

module.exports = {
  addGiftHandler,
  removeGiftHandler,
  listGiftsHandler,
  suggestGiftsHandler
}; 