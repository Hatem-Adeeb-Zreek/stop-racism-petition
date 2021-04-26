const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:123456789@localhost:5432/petition"
);
// module.exports.getSigns = () => {
//     return db.query(`SELECT * FROM users`);
// };

module.exports.countSigns = () => {
    return db.query(`SELECT COUNT(*) FROM signetures`);
};

module.exports.getCurrentSign = (userId) => {
    return db.query(`SELECT * FROM users WHERE id=$1`, [userId]);
};

module.exports.getSigneture = (userId) => {
    return db.query(`SELECT signeture FROM signetures WHERE user_id=$1`, [
        userId,
    ]);
};

module.exports.addSigneture = (userId, canvasSigneture) => {
    return db.query(
        `
       INSERT INTO signetures (user_id, signeture)
        VALUES ($1, $2)
        `,
        [userId, canvasSigneture]
    );
};

module.exports.createUser = (firstName, lastName, email, hashedPass) => {
    return db.query(
        `
        INSERT INTO users (first_name, last_name, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [firstName, lastName, email, hashedPass]
    );
};

module.exports.addProfile = (age, city, url, userId) => {
    return db.query(
        `
        INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        `,
        [age || null, city, url, userId]
    );
};

module.exports.getPassByEmail = (inputEmail) => {
    return db.query(`SELECT * FROM users WHERE email=$1`, [inputEmail]);
    // return db.query(`SELECT * FROM users WHERE email=$1`, [inputEmail]);
};

module.exports.getSigns = () => {
    return db.query(`
    SELECT signetures.signeture, users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.url    
    FROM signetures
    JOIN users
    ON users.id = signetures.user_id
    JOIN user_profiles
    ON users.id = user_profiles.user_id;
    `);
};

/*
module.exports.getTimestamp = () => {
    let date = db.query(`SELECT EXTRACT (DAY FROM created) FROM signatures`);
    date += db.query(`SELECT EXTRACT (MONTH FROM created) FROM signatures`);
    date += db.query(`SELECT EXTRACT (YEAR FROM created) FROM signatures`);
    return date;
};
// return db.query(`SELECT EXTRACT (DAY FROM created) FROM signatures`);
*/
