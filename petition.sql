DROP TABLE IF EXISTS signetures;

CREATE TABLE signetures(
    id SERIAL   PRIMARY KEY,    
    signeture   TEXT NOT NULL,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id),
    created  TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

DROP TABLE IF EXISTS users;
CREATE TABLE users(
    id SERIAL   PRIMARY KEY,
    first_name       VARCHAR(200) NOT NULL,
    last_name        VARCHAR(200) NOT NULL,
    email       VARCHAR(200) NOT NULL UNIQUE,
    password    VARCHAR(200) NOT NULL,
    created    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

