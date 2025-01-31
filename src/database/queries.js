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

const getUpcomingBirthdays = async (daysAhead = 7) => {
  const query = `
    SELECT u.user_id, u.username, u.first_name, u.last_name, b.birth_date
    FROM birthdays b
    JOIN users u ON b.user_id = u.user_id
    WHERE (
      EXTRACT(MONTH FROM b.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND
      EXTRACT(DAY FROM b.birth_date) BETWEEN EXTRACT(DAY FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM CURRENT_DATE + interval '${daysAhead} days')
    )
    OR (
      EXTRACT(MONTH FROM b.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE + interval '${daysAhead} days')
      AND
      EXTRACT(DAY FROM b.birth_date) <= EXTRACT(DAY FROM CURRENT_DATE + interval '${daysAhead} days')
    )
    ORDER BY
      EXTRACT(MONTH FROM b.birth_date),
      EXTRACT(DAY FROM b.birth_date)
  `;
  const result = await pool.query(query);
  return result.rows;
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
  getUpcomingBirthdays,
  addGiftPreference,
  removeGiftPreference,
  getUserGiftPreferences,
  getUserByUsername,

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

module.exports = queries; 