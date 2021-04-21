DROP TABLE IF EXISTS signetures;

CREATE TABLE signetures(
    id SERIAL PRIMARY KEY,
    first_name VARCHAR NOT NULL CHECK (first_name != ''),
    last_name VARCHAR NOT NULL CHECK (last_name  != ''),
    signeture VARCHAR NOT NULL CHECK (signeture  != ''),
    created         TIMESTAMP DEFAULT NOW()

);

