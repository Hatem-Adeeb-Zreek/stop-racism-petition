const spicedPg = require("spiced-pg");
const db = spicedPg("postgres:postgres:123456789@localhost:5432/petition");

module.exports.getSigns = () => {
    return db.query(`SELECT * FROM signetures`);
};

module.exports.countSigns = () => {
    return db.query(`SELECT COUNT(*) FROM signetures`);
};

module.exports.getCurrentSign = (cookie) => {
    return db.query(`SELECT * FROM signetures WHERE id=${cookie}`);
};

module.exports.addSign = (firstName, lastName, signeture) => {
    return db.query(
        `
        INSERT INTO signetures (first_name, last_name, signeture)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [firstName, lastName, signeture]
    );
};
