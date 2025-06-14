CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id)
);