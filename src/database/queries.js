const { pool } = require('./init');
const moment = require('moment-jalaali');

// User related queries
const saveUser = async (userId, username, firstName, lastName, botName) => {
  const query = `
    INSERT INTO users (user_id, username, first_name, last_name, bot_name)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id) 
    DO UPDATE SET username = $2, first_name = $3, last_name = $4, bot_name = $5
  `;
  await pool.query(query, [userId, username, firstName, lastName, botName]);
};

const getUserById = async (userId) => {
  const query = 'SELECT user_id, username, first_name, last_name FROM users WHERE user_id = $1';
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

// Birthday related queries
const setBirthday = async (userId, birthDate) => {
  const query = `
    INSERT INTO birthdays (user_id, birth_date)
    VALUES ($1, $2)
    ON CONFLICT (user_id)
    DO UPDATE SET birth_date = $2, updated_at = CURRENT_TIMESTAMP
  `;
  await pool.query(query, [userId, birthDate]);
};

const getBirthday = async (userId) => {
  const query = 'SELECT birth_date FROM birthdays WHERE user_id = $1';
  const result = await pool.query(query, [userId]);
  return result.rows[0]?.birth_date;
};

// Watchlist related queries
const addToWatchlist = async (watcherId, watchedUsername) => {
  const userQuery = 'SELECT user_id FROM users WHERE username = $1';
  const userResult = await pool.query(userQuery, [watchedUsername]);
  
  if (!userResult.rows[0]) {
    throw new Error('User not found');
  }

  const watchedId = userResult.rows[0].user_id;
  
  if (watcherId === watchedId) {
    throw new Error('You cannot add yourself to your watchlist');
  }

  const query = `
    INSERT INTO watchlist (watcher_id, watched_id)
    VALUES ($1, $2)
    ON CONFLICT (watcher_id, watched_id) DO NOTHING
  `;
  await pool.query(query, [watcherId, watchedId]);
};

const removeFromWatchlist = async (watcherId, watchedUsername) => {
  const userQuery = 'SELECT user_id FROM users WHERE username = $1';
  const userResult = await pool.query(userQuery, [watchedUsername]);
  
  if (!userResult.rows[0]) {
    throw new Error('User not found');
  }

  const watchedId = userResult.rows[0].user_id;
  const query = 'DELETE FROM watchlist WHERE watcher_id = $1 AND watched_id = $2';
  await pool.query(query, [watcherId, watchedId]);
};

const getWatchlist = async (watcherId) => {
  const query = `
    SELECT u.username, u.first_name, b.birth_date
    FROM watchlist w
    JOIN users u ON w.watched_id = u.user_id
    LEFT JOIN birthdays b ON w.watched_id = b.user_id
    WHERE w.watcher_id = $1
    ORDER BY u.username
  `;
  const result = await pool.query(query, [watcherId]);
  return result.rows;
};

const getBirthdayReminders = async () => {
  // First, get all watchlist entries with birthdays
  const query = `
    SELECT 
      w.watcher_id,
      w.watched_id,
      u.username as watched_username,
      u.first_name as watched_firstname,
      b.birth_date
    FROM watchlist w
    JOIN users u ON w.watched_id = u.user_id
    JOIN birthdays b ON w.watched_id = b.user_id
  `;
  
  const result = await pool.query(query);
  const currentDate = moment();
  const remindersToSend = [];

  // Process each birthday and calculate days until next birthday in Jalali calendar
  for (const row of result.rows) {
    const birthDate = moment(row.birth_date);
    const birthDateJalali = moment(row.birth_date).format('jMM-jDD');
    const [birthMonth, birthDay] = birthDateJalali.split('-').map(Number);
    
    // Get current Jalali date
    const currentYear = parseInt(currentDate.format('jYYYY'));
    const currentMonth = parseInt(currentDate.format('jMM'));
    const currentDay = parseInt(currentDate.format('jDD'));

    // Calculate next birthday in Jalali calendar
    let nextBirthdayYear = currentYear;
    if (birthMonth < currentMonth || (birthMonth === currentMonth && birthDay < currentDay)) {
      nextBirthdayYear++;
    }

    // Convert next birthday to Gregorian for day calculation
    const nextBirthday = moment(`${nextBirthdayYear}-${birthMonth}-${birthDay}`, 'jYYYY-jMM-jDD');
    const daysUntilBirthday = nextBirthday.diff(currentDate, 'days');

    // Check if this birthday needs a reminder
    if ([14, 7, 3].includes(daysUntilBirthday)) {
      const reminderType = 
        daysUntilBirthday === 14 ? 'two_week' :
        daysUntilBirthday === 7 ? 'one_week' : 'three_day';

      // Check if reminder has already been sent this year
      const reminderQuery = `
        SELECT 1 FROM reminder_logs
        WHERE watcher_id = $1
        AND watched_id = $2
        AND reminder_type = $3
        AND birthday_year = $4
      `;
      const reminderResult = await pool.query(reminderQuery, [
        row.watcher_id,
        row.watched_id,
        reminderType,
        nextBirthdayYear
      ]);

      if (!reminderResult.rows.length) {
        remindersToSend.push({
          ...row,
          days_until_birthday: daysUntilBirthday,
          reminder_type: reminderType,
          current_year: nextBirthdayYear,
          watcher_user_id: row.watcher_id
        });
      }
    }
  }

  return remindersToSend;
};

const logReminder = async (watcherId, watchedId, reminderType, birthdayYear) => {
  const query = `
    INSERT INTO reminder_logs (watcher_id, watched_id, reminder_type, birthday_year)
    VALUES ($1, $2, $3, $4)
  `;
  await pool.query(query, [watcherId, watchedId, reminderType, birthdayYear]);
};

// Gift preferences related queries
const addGiftPreference = async (userId, itemName, description = null) => {
  const query = `
    INSERT INTO gift_preferences (user_id, item_name, description)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, item_name)
    DO UPDATE SET description = $3
  `;
  await pool.query(query, [userId, itemName, description]);
};

const removeGiftPreference = async (userId, itemName) => {
  const query = 'DELETE FROM gift_preferences WHERE user_id = $1 AND item_name = $2';
  await pool.query(query, [userId, itemName]);
};

const getUserGiftPreferences = async (userId) => {
  const query = 'SELECT item_name, description FROM gift_preferences WHERE user_id = $1';
  const result = await pool.query(query, [userId]);
  return result.rows;
};

const getUserByUsername = async (username) => {
  const query = 'SELECT user_id, username, first_name, last_name FROM users WHERE username = $1';
  const result = await pool.query(query, [username]);
  return result.rows[0];
};

module.exports = {
  saveUser,
  getUserById,
  setBirthday,
  getBirthday,
  addGiftPreference,
  removeGiftPreference,
  getUserGiftPreferences,
  getUserByUsername,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  getBirthdayReminders,
  logReminder,
  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT bot_name) as total_bots,
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as users_per_day
      FROM users
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },
  async getAllUsers() {
    const query = 'SELECT user_id FROM users';
    const result = await pool.query(query);
    return result.rows;
  }
};