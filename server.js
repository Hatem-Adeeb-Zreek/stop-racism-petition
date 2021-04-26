const express = require("express");
const app = express();
const db = require("./db");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const { COOKIE_SECRET } = require("./secrets.json");
const csurf = require("csurf");
const { hash, compare } = require("./bc");

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
        secret: process.env.COOKIE_SECRET || COOKIE_SECRET,
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
    const { userId } = req.session;
    if (userId) {
        db.getSigneture(userId)
            .then((results) => {
                if (results.rows.length != 0) {
                    req.session.signed = true;
                    res.redirect("/thankyou");
                } else {
                    db.getCurrentSign(userId).then(({ rows }) => {
                        res.render("petition", {
                            rows,
                        });
                    });
                }
            })
            .catch((err) => {
                console.log("error in GET /petition getSigneture()", err);
            });
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
            err:
                "Oops! Looks like you still haven't signed my petition. You need to use the mouse to make your signature...",
            btn: "try again",
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
                console.log("rows", rows);
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
        res.redirect("/petition");
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
        //existing email validation
        db.getPassByEmail(email)
            .then((results) => {
                if (results.rows.length == 0) {
                    //email not existing
                    hash(password)
                        .then((hashedPass) => {
                            console.log("hashedPw", hashedPass);
                            db.createUser(
                                firstName,
                                lastName,
                                email,
                                hashedPass
                            )
                                .then((results) => {
                                    //set cookie
                                    req.session.userId = results.rows[0].id;
                                    console.log("a new user was added!");
                                    res.redirect("/profile");
                                }) //end of createUser()
                                .catch((err) => {
                                    console.log(
                                        "error in POST /register createUser()",
                                        err
                                    );
                                    res.send(
                                        "<h1>Server error: user could NOT be added to db</h1>"
                                    );
                                });
                        }) //end of hash()
                        .catch((err) => {
                            console.log("error is POST /register hash()", err);
                            res.send(
                                "<h1>Server error: your password could NOT be hashed</h1>"
                            );
                        });
                } else {
                    //of if block (email)
                    console.log("email has been already used");
                    res.render("register", {
                        err: "email has been already used",
                    });
                }
            }) //end of getPassByEmail()
            .catch((err) => {
                console.log("error is POST /register checkEmail", err);
                res.send(
                    "<h1>Server error: your email could NOT be verified</h1>"
                );
            });
        //end of hash block
    } else {
        //of if block (firstName, lastName, email, password)
        res.render("register", {
            err: "make sure your form is complete!",
            btn: "try again",
        });
    }
});

app.get("/login", (req, res) => {
    const { userId } = req.session;
    if (userId) {
        res.redirect("/petition");
    } else {
        res.render("login", {});
    }
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    console.log("user input email: ", email, "user input password: ", password);
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
                                err: "Uh oh! you have failed to log in...",
                                btn: "try again",
                            });
                        }
                    })
                    .catch((err) => {
                        console.log("error in POST /login compare():", err);
                        res.send(
                            "<h1>Server error: your password does NOT match</h1>"
                        );
                    });
            })
            .catch((err) => {
                console.log("error in POST /login getPassByEmail():", err);
                res.render("login", {
                    err: "Uh oh! you have failed to log in...",
                    btn: "try again",
                });
            });
    } else {
        res.render("login", {
            err: "make sure your form is complete!",
            btn: "try again",
        });
    }
});

app.get("/profile", (req, res) => {
    const { userId, profiled } = req.session;
    if (userId) {
        if (profiled) {
            res.redirect("/petition");
        } else {
            res.render("profile", {});
        }
    } else {
        res.redirect("/register");
    }
});

app.post("/profile", (req, res) => {
    const { age, city, url } = req.body;
    const { userId } = req.session;
    console.log(age, city, url);
    db.addProfile(age, city, url, userId)
        .then((results) => {
            console.log("a new profile was added!");
            req.session.profiled = true;
            res.redirect("/petition");
        })
        .catch((err) => {
            console.log("error in POST /profile", err);
            res.send("<h1>Server error: profile could NOT be added to db</h1>");
        });
});

app.listen(process.env.PORT || 8080, () =>
    console.log("petition SERVER at 8080...")
);
