const queries = require('../database/queries');
const config = require('../config/config');

// Store user states
const userStates = new Map();

const supportHandler = async (msg, bot) => {
  try {
    const chatId = msg.chat.id;
    
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❓ سوال درباره ربات', callback_data: 'support_bot' }],
          [{ text: '🎁 سوال درباره هدایا', callback_data: 'support_gifts' }],
          [{ text: '📅 سوال درباره تاریخ تولد', callback_data: 'support_birthday' }],
          [{ text: '👥 سوال درباره لیست دنبال‌شوندگان', callback_data: 'support_watchlist' }],
          [{ text: '🔄 مشکلات فنی', callback_data: 'support_technical' }],
          [{ text: '💬 سایر موارد', callback_data: 'support_other' }]
        ]
      }
    };

    await bot.sendMessage(chatId, 
      'لطفا موضوع پیام خود را انتخاب کنید:', options);

  } catch (error) {
    console.error('Error in support:', error);
    await bot.sendMessage(msg.chat.id, 
      'متأسفانه مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const handleSupportCallback = async (callbackQuery, bot) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const category = callbackQuery.data.replace('support_', '');

    // Set user state to waiting for message
    userStates.set(userId, { 
      state: 'waiting_for_message',
      category: category 
    });

    const categoryTitles = {
      bot: 'ربات',
      gifts: 'هدایا',
      birthday: 'تاریخ تولد',
      watchlist: 'لیست دنبال‌شوندگان',
      technical: 'مشکلات فنی',
      other: 'سایر موارد'
    };

    // Edit the original message to remove keyboard
    await bot.editMessageText(
      `لطفا پیام خود درباره ${categoryTitles[category]} را بنویسید:`,
      {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'support_back' }]]
        }
      }
    );

  } catch (error) {
    console.error('Error in handleSupportCallback:', error);
    await bot.sendMessage(callbackQuery.message.chat.id, 
      'متأسفانه مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const handleUserMessage = async (msg, bot) => {
  try {
    const userId = msg.from.id;
    const userState = userStates.get(userId);

    if (!userState || userState.state !== 'waiting_for_message') {
      return;
    }

    const message = msg.text;
    const user = await queries.getUserById(userId);
    const userInfo = user.username ? `@${user.username}` : `${user.first_name || 'کاربر'} (${userId})`;

    // Create support ticket
    const ticket = await queries.createSupportTicket(userId, message);

    // Send message to admin with category
    const categoryTitles = {
      bot: 'ربات',
      gifts: 'هدایا',
      birthday: 'تاریخ تولد',
      watchlist: 'لیست دنبال‌شوندگان',
      technical: 'مشکلات فنی',
      other: 'سایر موارد'
    };

    const adminMessage = `
📨 پیام پشتیبانی جدید
شماره تیکت: ${ticket.ticket_number}
کاربر: ${userInfo}
موضوع: ${categoryTitles[userState.category]}

پیام:
${message}

برای پاسخ از دستور زیر استفاده کنید:
/reply ${ticket.ticket_number} پاسخ شما`;

    await bot.sendMessage(config.adminUserId, adminMessage);

    // Send confirmation to user
    await bot.sendMessage(msg.chat.id, 
      `✅ پیام شما با موفقیت ارسال شد.
شماره پیگیری: ${ticket.ticket_number}
در اسرع وقت بررسی خواهد شد.

برای مشاهده وضعیت پیام‌های خود از دستور /tickets استفاده کنید.`);

    // Clear user state
    userStates.delete(userId);

  } catch (error) {
    console.error('Error in handleUserMessage:', error);
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

    const [ticketNumber, ...messageArray] = match[1].split(' ');
    const message = messageArray.join(' ');

    if (!ticketNumber || !message) {
      return bot.sendMessage(msg.chat.id, 
        'فرمت نادرست. مثال:\n/reply TKT-XXXXX پیام پاسخ');
    }

    // Update ticket and get user ID
    const ticket = await queries.updateSupportTicket(ticketNumber, message);
    if (!ticket) {
      return bot.sendMessage(msg.chat.id, 'تیکت مورد نظر یافت نشد.');
    }

    // Send reply to user
    await bot.sendMessage(ticket.user_id, 
      `📬 پاسخ به تیکت ${ticketNumber}:\n\n${message}`);

    // Confirm to admin
    await bot.sendMessage(msg.chat.id, 
      `✅ پاسخ شما برای تیکت ${ticketNumber} با موفقیت ارسال شد.`);

  } catch (error) {
    console.error('Error in replyToUser:', error);
    await bot.sendMessage(msg.chat.id, 
      'متأسفانه در ارسال پاسخ مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

const listTicketsHandler = async (msg, bot) => {
  try {
    const userId = msg.from.id;
    const tickets = await queries.getUserTickets(userId);

    if (!tickets.length) {
      return bot.sendMessage(msg.chat.id, 
        'شما هنوز هیچ پیامی به پشتیبانی ارسال نکرده‌اید.');
    }

    const statusEmoji = {
      pending: '⏳',
      answered: '✅',
      closed: '🔒'
    };

    const statusText = {
      pending: 'در انتظار پاسخ',
      answered: 'پاسخ داده شده',
      closed: 'بسته شده'
    };

    const message = tickets.map(t => {
      const date = new Date(t.created_at).toLocaleDateString('fa-IR');
      let ticketInfo = `${statusEmoji[t.status]} تیکت ${t.ticket_number} - ${date}\n`;
      ticketInfo += `وضعیت: ${statusText[t.status]}\n`;
      ticketInfo += `پیام: ${t.message}\n`;
      if (t.admin_response) {
        ticketInfo += `پاسخ: ${t.admin_response}\n`;
      }
      return ticketInfo;
    }).join('\n───────────────\n');

    await bot.sendMessage(msg.chat.id, 
      '📋 لیست پیام‌های شما:\n\n' + message);

  } catch (error) {
    console.error('Error in listTickets:', error);
    await bot.sendMessage(msg.chat.id, 
      'متأسفانه در نمایش لیست پیام‌ها مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
  }
};

module.exports = {
  supportHandler,
  handleSupportCallback,
  handleUserMessage,
  replyToUserHandler,
  listTicketsHandler
}; 