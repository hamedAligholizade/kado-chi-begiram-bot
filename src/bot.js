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
const {
  supportHandler,
  handleSupportCallback,
  handleUserMessage,
  replyToUserHandler,
  listTicketsHandler
} = require('./commands/support');

// Store user states
const userStates = new Map();

const showMainMenu = async (chatId, bot) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎁 مدیریت هدایا', callback_data: 'menu_gifts' },
          { text: '📅 تاریخ تولد', callback_data: 'menu_birthday' }
        ],
        [
          { text: '👥 لیست دنبال‌شوندگان', callback_data: 'menu_watchlist' },
          { text: '❓ پشتیبانی', callback_data: 'menu_support' }
        ],
        [
          { text: '📋 راهنما', callback_data: 'menu_help' }
        ]
      ]
    }
  };

  await bot.sendMessage(chatId, 
    '👋 به ربات هدیه و تولد خوش آمدید!\n\nلطفا یکی از گزینه‌های زیر را انتخاب کنید:', options);
};

const showGiftsMenu = async (chatId, bot, messageId = null) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '➕ افزودن هدیه', callback_data: 'gift_add' },
          { text: '➖ حذف هدیه', callback_data: 'gift_remove' }
        ],
        [
          { text: '📝 لیست هدایا', callback_data: 'gift_list' },
          { text: '🔍 پیشنهادات هدیه', callback_data: 'gift_suggest' }
        ],
        [
          { text: '🔙 بازگشت به منوی اصلی', callback_data: 'menu_main' }
        ]
      ]
    }
  };

  const text = '🎁 مدیریت هدایا\n\nلطفا یکی از گزینه‌های زیر را انتخاب کنید:';
  
  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: options.reply_markup
    });
  } else {
    await bot.sendMessage(chatId, text, options);
  }
};

const showBirthdayMenu = async (chatId, bot, messageId = null) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📅 تنظیم تاریخ تولد', callback_data: 'birthday_set' },
          { text: '👀 مشاهده تاریخ تولد', callback_data: 'birthday_view' }
        ],
        [
          { text: '🔙 بازگشت به منوی اصلی', callback_data: 'menu_main' }
        ]
      ]
    }
  };

  const text = '📅 مدیریت تاریخ تولد\n\nلطفا یکی از گزینه‌های زیر را انتخاب کنید:';
  
  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: options.reply_markup
    });
  } else {
    await bot.sendMessage(chatId, text, options);
  }
};

const showWatchlistMenu = async (chatId, bot, messageId = null) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '➕ افزودن به لیست', callback_data: 'watchlist_add' },
          { text: '➖ حذف از لیست', callback_data: 'watchlist_remove' }
        ],
        [
          { text: '📋 مشاهده لیست', callback_data: 'watchlist_view' }
        ],
        [
          { text: '🔙 بازگشت به منوی اصلی', callback_data: 'menu_main' }
        ]
      ]
    }
  };

  const text = '👥 مدیریت لیست دنبال‌شوندگان\n\nلطفا یکی از گزینه‌های زیر را انتخاب کنید:';
  
  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: options.reply_markup
    });
  } else {
    await bot.sendMessage(chatId, text, options);
  }
};

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
        await showMainMenu(msg.chat.id, bot);
      } catch (error) {
        console.error('Error saving user:', error);
        await bot.sendMessage(msg.chat.id, 'متأسفانه در ثبت اطلاعات مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
      }
    });

    // Handle menu callbacks
    bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const userId = callbackQuery.from.id;

      try {
        if (action.startsWith('menu_')) {
          const menu = action.replace('menu_', '');
          switch (menu) {
            case 'main':
              await showMainMenu(chatId, bot);
              break;
            case 'gifts':
              await showGiftsMenu(chatId, bot, messageId);
              break;
            case 'birthday':
              await showBirthdayMenu(chatId, bot, messageId);
              break;
            case 'watchlist':
              await showWatchlistMenu(chatId, bot, messageId);
              break;
            case 'support':
              await supportHandler({ chat: { id: chatId } }, bot);
              break;
            case 'help':
              // Show help message with back button
              const helpMessage = `
📋 راهنمای استفاده از ربات:

🎁 مدیریت هدایا:
• افزودن هدیه به لیست علاقه‌مندی‌ها
• حذف هدیه از لیست
• مشاهده لیست هدایا
• دریافت پیشنهادات هدیه برای دوستان

📅 مدیریت تاریخ تولد:
• تنظیم تاریخ تولد
• مشاهده تاریخ تولد

👥 مدیریت لیست دنبال‌شوندگان:
• افزودن دوستان به لیست
• حذف از لیست
• مشاهده لیست دنبال‌شوندگان

❓ پشتیبانی:
• ارسال پیام به پشتیبانی
• مشاهده تیکت‌های قبلی`;

              await bot.editMessageText(helpMessage, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [[
                    { text: '🔙 بازگشت به منوی اصلی', callback_data: 'menu_main' }
                  ]]
                }
              });
              break;
          }
        } else if (action.startsWith('gift_')) {
          // Handle gift-related actions
          const command = action.replace('gift_', '');
          switch (command) {
            case 'add':
              userStates.set(userId, { state: 'waiting_for_gift_add' });
              await bot.sendMessage(chatId, 
                'لطفا نام هدیه و توضیحات آن را به صورت زیر وارد کنید:\nنام هدیه | توضیحات (اختیاری)');
              break;
            case 'remove':
              userStates.set(userId, { state: 'waiting_for_gift_remove' });
              await bot.sendMessage(chatId, 
                'لطفا نام هدیه‌ای که می‌خواهید حذف کنید را وارد کنید:');
              break;
            case 'list':
              await listGiftsHandler({ chat: { id: chatId }, from: { id: userId } }, bot);
              break;
            case 'suggest':
              userStates.set(userId, { state: 'waiting_for_gift_suggest' });
              await bot.sendMessage(chatId, 
                'لطفا نام کاربری دوست خود را وارد کنید (مثال: @username):');
              break;
          }
        } else if (action.startsWith('birthday_')) {
          // Handle birthday-related actions
          const command = action.replace('birthday_', '');
          switch (command) {
            case 'set':
              userStates.set(userId, { state: 'waiting_for_birthday' });
              await bot.sendMessage(chatId, 
                'لطفا تاریخ تولد خود را به فرمت YYYY-MM-DD وارد کنید (مثال: 1370-06-15):');
              break;
            case 'view':
              await getBirthdayHandler({ chat: { id: chatId }, from: { id: userId } }, bot);
              break;
          }
        } else if (action.startsWith('watchlist_')) {
          // Handle watchlist-related actions
          const command = action.replace('watchlist_', '');
          switch (command) {
            case 'add':
              userStates.set(userId, { state: 'waiting_for_watchlist_add' });
              await bot.sendMessage(chatId, 
                'لطفا نام کاربری شخص مورد نظر را وارد کنید (مثال: @username):');
              break;
            case 'remove':
              userStates.set(userId, { state: 'waiting_for_watchlist_remove' });
              await bot.sendMessage(chatId, 
                'لطفا نام کاربری شخص مورد نظر را وارد کنید (مثال: @username):');
              break;
            case 'view':
              await listWatchlistHandler({ chat: { id: chatId }, from: { id: userId } }, bot);
              break;
          }
        } else if (action.startsWith('support_')) {
          await handleSupportCallback(callbackQuery, bot);
        }

        await bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Error handling callback:', error);
        await bot.sendMessage(chatId, 'متأسفانه مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
      }
    });

    // Handle user messages based on state
    bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        const userId = msg.from.id;
        const userState = userStates.get(userId);

        if (!userState) return;

        try {
          switch (userState.state) {
            case 'waiting_for_gift_add':
              await addGiftHandler(msg, bot, [null, msg.text]);
              break;
            case 'waiting_for_gift_remove':
              await removeGiftHandler(msg, bot, [null, msg.text]);
              break;
            case 'waiting_for_gift_suggest':
              await suggestGiftsHandler(msg, bot, [null, msg.text]);
              break;
            case 'waiting_for_birthday':
              await setBirthdayHandler(msg, bot, [null, msg.text]);
              break;
            case 'waiting_for_watchlist_add':
              await addToWatchlistHandler(msg, bot, [null, msg.text]);
              break;
            case 'waiting_for_watchlist_remove':
              await removeFromWatchlistHandler(msg, bot, [null, msg.text]);
              break;
            case 'waiting_for_message':
              await handleUserMessage(msg, bot);
              break;
          }

          // Clear state after handling
          if (userState.state !== 'waiting_for_message') {
            userStates.delete(userId);
          }
        } catch (error) {
          console.error('Error handling message:', error);
          await bot.sendMessage(msg.chat.id, 'متأسفانه مشکلی پیش آمد. لطفا دوباره تلاش کنید.');
        }
      }
    });

    // Support commands
    bot.onText(/\/reply (.+)/, (msg, match) => replyToUserHandler(msg, bot, match));
    bot.onText(/\/tickets/, (msg) => listTicketsHandler(msg, bot));

    // Other commands
    bot.onText(/\/stats/, (msg) => statsHandler(msg, bot));
    bot.onText(/\/broadcast (.+)/, (msg) => broadcastHandler(msg, bot));

    // Set up periodic birthday reminder check (every hour)
    setInterval(() => {
      sendBirthdayReminders(bot).catch(error => {
        console.error('Error in birthday reminder interval:', error);
      });
    }, 60 * 60 * 1000);

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