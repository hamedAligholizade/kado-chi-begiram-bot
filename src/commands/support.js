const queries = require('../database/queries');
const config = require('../config/config');

const supportHandler = async (msg, bot, match) => {
  try {
    const userId = msg.from.id;
    const message = match[1]?.trim();
    
    if (!message) {
      return bot.sendMessage(msg.chat.id, 
        'لطفا پیام خود را همراه با دستور وارد کنید. مثال:\n/support سلام، من یک سوال دارم...');
    }

    // Get user info for better context
    const user = await queries.getUserById(userId);
    const userInfo = user.username ? `@${user.username}` : `${user.first_name || 'کاربر'} (${userId})`;

    // Forward the message to admin
    const adminMessage = `📨 پیام پشتیبانی جدید از ${userInfo}:\n\n${message}`;
    await bot.sendMessage(config.adminUserId, adminMessage);

    // Send confirmation to user
    await bot.sendMessage(msg.chat.id, 
      '✅ پیام شما با موفقیت به پشتیبانی ارسال شد. در اسرع وقت بررسی خواهد شد.');

  } catch (error) {
    console.error('Error in support:', error);
    await bot.sendMessage(msg.chat.id, 
      'متأسفانه در ارسال پیام مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const replyToUserHandler = async (msg, bot, match) => {
  try {
    // Only admin can use this command
    if (msg.from.id !== config.adminUserId) {
      return;
    }

    const [userId, ...messageArray] = match[1].split(' ');
    const message = messageArray.join(' ');

    if (!userId || !message) {
      return bot.sendMessage(msg.chat.id, 
        'فرمت نادرست. مثال:\n/reply 123456789 پیام پاسخ');
    }

    // Send reply to user
    await bot.sendMessage(userId, 
      `📬 پاسخ از پشتیبانی:\n\n${message}`);

    // Confirm to admin
    await bot.sendMessage(msg.chat.id, 
      '✅ پاسخ شما با موفقیت ارسال شد.');

  } catch (error) {
    console.error('Error in replyToUser:', error);
    await bot.sendMessage(msg.chat.id, 
      'متأسفانه در ارسال پاسخ مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

module.exports = {
  supportHandler,
  replyToUserHandler
}; 