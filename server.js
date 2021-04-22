const express = require("express");
const app = express();
const db = require("./db");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const { COOKIE_SECRET } = require("./secrets.json");
const csurf = require("csurf");
const { hash, compare } = require("./bc");

// db.getTimestamp().then((result) => {
//     console.log("result", result);
// });

// console.log("db.getTimestamp()", db.getTimestamp());

//added global helpers-----------
const hbSet = hb.create({
    helpers: {
        someFn() {
            return "something";
        },
    },
});
//-------------

app.engine("handlebars", hbSet.engine);
app.set("view engine", "handlebars");

//~~~~~~~~~MIDDLEWARE
app.use(
    cookieSession({
        secret: COOKIE_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);
app.use(
    express.urlencoded({
        extended: false,
    })
);
// prevent csurf  and clickjacking attack
app.use(csurf());
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    res.set("x-frame-options", "DENY");
    next();
});
app.use(express.static("public"));

//~~~~ ROUTES
app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/petition", (req, res) => {
    const { signed, userId } = req.session;
    if (userId) {
        if (signed) {
            res.redirect("/thankyou");
        } else {
            db.getCurrentSign(userId).then(({ rows }) => {
                res.render("petition", {
                    rows,
                });
            });
        }
    } else {
        res.redirect("/register");
    }
});

app.post("/petition", (req, res) => {
    const { userId } = req.session;
    const { signeture } = req.body;
    if (signeture !== "") {
        db.addSigneture(userId, signeture)
            .then((results) => {
                req.session.signed = true;
                res.redirect("/thankyou");
            })
            .catch((err) => {
                console.log("error in POST /petition addSign()", err);
            });
    } else {
        res.render("petition", {
            fill_err: true,
        });
    }
});
app.get("/thankyou", (req, res) => {
    const { signed, userId } = req.session;
    if (signed) {
        db.countSigns().then((counts) => {
            const numberOfSigns = counts.rows[0].count;
            db.getSigneture(userId).then((results) => {
                const signeture = results.rows[0].signeture;
                db.getCurrentSign(userId).then(({ rows }) => {
                    res.render("thankyou", {
                        rows,
                        signeture,
                        numberOfSigns,
                    });
                });
            });
        });
    } else {
        res.redirect("/petition");
    }
});

app.get("/signslist", (req, res) => {
    const { userId } = req.session;
    if (userId) {
        db.getSigns()
            .then(({ rows }) => {
                res.render("signslist", {
                    rows,
                });
            })
            .catch((err) => {
                console.log("error in /signslist", err);
            });
    } else {
        res.redirect("/register");
    }
});

app.get("/register", (req, res) => {
    const { userId } = req.session;
    if (userId) {
        res.redirect("petition");
    } else {
        res.render("register", {});
    }
});

app.post("/register", (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    if (
        firstName !== "" &&
        lastName !== "" &&
        email !== "" &&
        password !== ""
    ) {
        hash(password)
            .then((hashedPass) => {
                db.createUser(firstName, lastName, email, hashedPass)
                    .then((results) => {
                        req.session.userId = results.rows[0].id;
                        res.redirect("/petition");
                    })
                    .catch((err) => {
                        console.log("error in POST /register", err);
                        res.render(
                            "<h1>Server error: user could NOT be added to db</h1>"
                        );
                    });
            })
            .catch((err) => {
                console.log("error is POST /register hash()", err);
                res.render(
                    "<h1>Server error: your password could NOT be hashed</h1>"
                );
            });
    } else {
        res.render("register", {
            fill_err: true,
        });
    }
});

app.get("/login", (req, res) => {
    const { userId } = req.session;
    if (userId) {
        res.redirect("petition");
    } else {
        res.render("login", {});
    }
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (email !== "" && password !== "") {
        db.getPassByEmail(email)
            .then((results) => {
                const hashedPass = results.rows[0].password;
                compare(password, hashedPass)
                    .then((match) => {
                        if (match) {
                            req.session.userId = results.rows[0].id;
                            res.redirect("/petition");
                        } else {
                            res.render("login", {
                                credent_err: true,
                            });
                        }
                    })
                    .catch((err) => {
                        console.log("error in POST /login compare():", err);
                        res.render(
                            "<h1>Server error: your password does NOT match</h1>"
                        );
                    });
            })
            .catch((err) => {
                console.log("error in POST /login getPassByEmail():", err);
                res.render("login", {
                    credent_err: true,
                });
            });
    } else {
        res.render("login", {
            fill_err: true,
        });
    }
});

app.listen(8080, () => console.log("petition SERVER at 8080..."));
