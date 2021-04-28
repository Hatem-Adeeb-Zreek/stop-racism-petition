DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL   PRIMARY KEY,
    first_name       VARCHAR(255) NOT NULL,
    last_name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

DROP TABLE IF EXISTS user_profiles CASCADE;
CREATE TABLE user_profiles (
    id          SERIAL PRIMARY KEY,
    age         INT,
    city        VARCHAR(255),
    url         VARCHAR(255),
    user_id     INT NOT NULL UNIQUE REFERENCES users(id)
);

DROP TABLE IF EXISTS signetures;
CREATE TABLE signetures (
    id SERIAL   PRIMARY KEY,    
    signeture   TEXT NOT NULL,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id),
    created  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

