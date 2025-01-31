const { Pool } = require('pg');
const config = require('../config/config');

const pool = new Pool(config.database);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initDatabase = async () => {
  let retries = 5;
  while (retries) {
    try {
      const client = await pool.connect();
      try {
        // Create users table
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            user_id BIGINT PRIMARY KEY,
            username VARCHAR(255),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            bot_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create birthdays table
        await client.query(`
          CREATE TABLE IF NOT EXISTS birthdays (
            user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
            birth_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create gift preferences table
        await client.query(`
          CREATE TABLE IF NOT EXISTS gift_preferences (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(user_id),
            item_name VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, item_name)
          );
        `);

        // Create watchlist table
        await client.query(`
          CREATE TABLE IF NOT EXISTS watchlist (
            id SERIAL PRIMARY KEY,
            watcher_id BIGINT REFERENCES users(user_id),
            watched_id BIGINT REFERENCES users(user_id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(watcher_id, watched_id)
          );
        `);

        // Create reminder_logs table to prevent duplicate reminders
        await client.query(`
          CREATE TABLE IF NOT EXISTS reminder_logs (
            id SERIAL PRIMARY KEY,
            watcher_id BIGINT REFERENCES users(user_id),
            watched_id BIGINT REFERENCES users(user_id),
            reminder_type VARCHAR(20), -- 'two_week', 'one_week', 'three_day'
            birthday_year INT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(watcher_id, watched_id, reminder_type, birthday_year)
          );
        `);

        console.log('Database initialized successfully');
        break;
      } finally {
        client.release();
      }
    } catch (err) {
      console.log(`Failed to connect to database, retries left: ${retries}`);
      retries -= 1;
      await wait(5000); // Wait 5 seconds before retrying
      if (!retries) {
        console.error('Could not connect to database after multiple retries', err);
        throw err;
      }
    }
  }
};

module.exports = { pool, initDatabase }; 