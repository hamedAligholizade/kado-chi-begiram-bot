const { pool } = require('./init');

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
  const query = `
    WITH upcoming_birthdays AS (
      SELECT 
        w.watcher_id,
        w.watched_id,
        u.username as watched_username,
        u.first_name as watched_firstname,
        b.birth_date,
        EXTRACT(YEAR FROM CURRENT_DATE) as current_year,
        (
          DATE(
            EXTRACT(YEAR FROM CURRENT_DATE) || 
            '-' || 
            EXTRACT(MONTH FROM b.birth_date) || 
            '-' || 
            EXTRACT(DAY FROM b.birth_date)
          ) - CURRENT_DATE
        ) as days_until_birthday
      FROM watchlist w
      JOIN users u ON w.watched_id = u.user_id
      JOIN birthdays b ON w.watched_id = b.user_id
    )
    SELECT 
      ub.*,
      u.user_id as watcher_user_id,
      CASE 
        WHEN days_until_birthday = 14 THEN 'two_week'
        WHEN days_until_birthday = 7 THEN 'one_week'
        WHEN days_until_birthday = 3 THEN 'three_day'
      END as reminder_type
    FROM upcoming_birthdays ub
    JOIN users u ON ub.watcher_id = u.user_id
    WHERE days_until_birthday IN (14, 7, 3)
    AND NOT EXISTS (
      SELECT 1 FROM reminder_logs rl
      WHERE rl.watcher_id = ub.watcher_id
      AND rl.watched_id = ub.watched_id
      AND rl.reminder_type = (
        CASE 
          WHEN days_until_birthday = 14 THEN 'two_week'
          WHEN days_until_birthday = 7 THEN 'one_week'
          WHEN days_until_birthday = 3 THEN 'three_day'
        END
      )
      AND rl.birthday_year = EXTRACT(YEAR FROM CURRENT_DATE)
    )
  `;
  const result = await pool.query(query);
  return result.rows;
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

const queries = {
  saveUser,
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