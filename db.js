const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:123456789@localhost:5432/petition"
);

exports.countSigns = () => {
    return db.query(`SELECT COUNT(*) FROM signetures`);
};

exports.getCurrentSign = (userId) => {
    return db.query(`SELECT * FROM users WHERE id=$1`, [userId]);
};

exports.getSigneture = (userId) => {
    return db.query(`SELECT signeture FROM signetures WHERE user_id=$1`, [
        userId,
    ]);
};

exports.addSigneture = (userId, canvasSigneture) => {
    return db.query(
        `
       INSERT INTO signetures (user_id, signeture)
        VALUES ($1, $2)
        `,
        [userId, canvasSigneture]
    );
};

exports.createUser = (firstName, lastName, email, hashedPass) => {
    return db.query(
        `
        INSERT INTO users (first_name, last_name, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [firstName, lastName, email, hashedPass]
    );
};

exports.addProfile = (age, city, url, userId) => {
    return db.query(
        `
        INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        `,
        [age || null, city, url, userId]
    );
};

exports.getUserDataByEmail = (inputEmail) => {
    return db.query(`SELECT * FROM users WHERE email=$1`, [inputEmail]);
};

exports.getSigns = () => {
    return db.query(`
    SELECT signetures.signeture, users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.url    
    FROM signetures
    JOIN users
    ON users.id = signetures.user_id
    JOIN user_profiles
    ON users.id = user_profiles.user_id;
    `);
};

exports.getProfile = (userId) => {
    return db.query(
        `
    SELECT users.first_name, users.last_name, users.email, user_profiles.age, user_profiles.city, user_profiles.url    
    FROM users
    JOIN user_profiles
    ON users.id = user_profiles.user_id
    WHERE user_id=$1`,
        [userId]
    );
};

exports.getSignsByCity = (city) => {
    return db.query(
        `
    SELECT signetures.signeture, users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.url
    FROM signetures
    JOIN users
    ON users.id = signetures.user_id
    LEFT OUTER JOIN user_profiles
    ON users.id = user_profiles.user_id
    WHERE user_profiles.city = $1;    
    `,
        [city]
    );
};

exports.updateUserWithoutPW = (firstName, lastName, email, userId) => {
    return db.query(
        `
    UPDATE users 
    SET first_name = $1, last_name=$2, email=$3
    WHERE id = $4  
    `,
        [firstName, lastName, email, userId]
    );
};

exports.updateUserPassword = (hashedPass, userId) => {
    return db.query(
        `
    UPDATE users 
    SET password = $1
    WHERE id = $2
    `,
        [hashedPass, userId]
    );
};

exports.upsertProfile = (age, city, url, userId) => {
    return db.query(
        `
    INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id)
    DO UPDATE SET age = $1, city = $2, url = $3;
    `,
        [age || null, city, url, userId]
    );
};

exports.deleteSigneture = (userId) => {
    return db.query(
        `
        DELETE
        FROM signetures
        WHERE user_id = $1;        
        `,
        [userId]
    );
};
