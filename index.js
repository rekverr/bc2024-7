require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// POST /register
app.post('/register', async (req, res) => {
  const { device_name, serial_number } = req.body;
  if (!device_name || !serial_number) return res.status(400).json({ error: 'Missing fields' });

  const exists = await pool.query('SELECT 1 FROM devices WHERE serial_number = $1', [serial_number]);
  if (exists.rowCount > 0) return res.status(400).json({ error: 'Device already exists' });

  await pool.query(
    'INSERT INTO devices (name, serial_number, user_id) VALUES ($1, $2, NULL)',
    [device_name, serial_number]
  );
  res.sendStatus(200);
});

// GET /devices
app.get('/devices', async (req, res) => {
  const result = await pool.query('SELECT name as device_name, serial_number FROM devices');
  res.json(result.rows);
});

// POST /take
app.post('/take', async (req, res) => {
  const { user_name, serial_number } = req.body;
  if (!user_name || !serial_number) return res.status(400).json({ error: 'Missing fields' });

  const device = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
  if (device.rowCount === 0) return res.status(404).json({ error: 'Device not found' });
  if (device.rows[0].user_id) return res.status(400).json({ error: 'Device already taken' });

  // Реєструємо користувача, якщо його ще немає
  let user = await pool.query('SELECT id FROM users WHERE name = $1', [user_name]);
  if (user.rowCount === 0) {
    user = await pool.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id', [user_name, `${user_name}@example.com`]);
  }
  const user_id = user.rows[0].id;

  await pool.query('UPDATE devices SET user_id = $1 WHERE serial_number = $2', [user_id, serial_number]);
  res.sendStatus(200);
});

// GET /devices/:serial_number
app.get('/devices/:serial_number', async (req, res) => {
  const { serial_number } = req.params;
  const device = await pool.query(
    `SELECT d.name as device_name, d.serial_number, u.name as user_name
     FROM devices d
     LEFT JOIN users u ON d.user_id = u.id
     WHERE d.serial_number = $1`,
    [serial_number]
  );
  if (device.rowCount === 0) return res.sendStatus(404);

  res.json({
    device_name: device.rows[0].device_name,
    user_name: device.rows[0].user_name || null,
  });
});

// Додатково: повернення пристрою (опціонально)
app.post('/return', async (req, res) => {
  const { serial_number } = req.body;
  if (!serial_number) return res.status(400).json({ error: 'Missing serial_number' });

  const device = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
  if (device.rowCount === 0) return res.status(404).json({ error: 'Device not found' });

  await pool.query('UPDATE devices SET user_id = NULL WHERE serial_number = $1', [serial_number]);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Inventory system started on port ${PORT}`);
});
