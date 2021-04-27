const express = require("express");
const app = (exports.app = express());
const db = require("./db");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
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
        secret:
            process.env.COOKIE_SECRET ||
            require("./secrets.json").COOKIE_SECRET,
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
        db.getUserDataByEmail(email)
            .then((results) => {
                if (results.rows.length == 0) {
                    //email not existing
                    hash(password)
                        .then((hashedPass) => {
                            // console.log("hashedPw", hashedPass);
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
                        message: "this email is already in use",
                        btn: "try again",
                        href: "javascript://",
                    });
                }
            }) //end of getUserDataByEmail()
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
            message: "make sure your form is complete!",
            btn: "try again",
            href: "javascript://",
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
    if (email !== "" && password !== "") {
        db.getUserDataByEmail(email)
            .then((results) => {
                const hashedPass = results.rows[0].password;
                compare(password, hashedPass)
                    .then((match) => {
                        if (match) {
                            req.session.userId = results.rows[0].id;
                            db.getSigneture(req.session.userId)
                                .then((results) => {
                                    if (results.rows.length != 0) {
                                        req.session.signed = true;
                                    }
                                })
                                .catch((err) => {
                                    console.log(
                                        "error in POST /login getSigneture()",
                                        err
                                    );
                                });
                            res.redirect("/profile");
                        } else {
                            res.render("login", {
                                message: "Uh oh! you have failed to log in...",
                                btn: "try again",
                                href: "javascript://",
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
                console.log("error in POST /login getUserDataByEmail():", err);
                res.render("login", {
                    message: "Uh oh! you have failed to log in...",
                    btn: "try again",
                    href: "javascript://",
                });
            });
    } else {
        res.render("login", {
            message: "these two fields are mandatory!",
            btn: "try again",
            href: "javascript://",
        });
    }
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
    if (signeture != "") {
        db.addSigneture(userId, signeture)
            .then((results) => {
                //set cookie
                req.session.signed = true;
                // console.log("user has finally signed!");
                res.redirect("/thankyou");
            })
            .catch((err) => {
                console.log("error in POST /petition addSigneture()", err);
            });
    } else {
        res.render("petition", {
            message:
                "Oops! Looks like you still haven't signed my petition. You need to use the mouse to make your signature...",
            btn: "try again",
            href: "javascript://",
        });
    }
});

app.get("/thankyou", (req, res) => {
    // console.log("req session at thankyou", req.session);
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
    const { signed, userId } = req.session;
    if (userId) {
        if (signed) {
            db.getSigns()
                .then(({ rows }) => {
                    // console.log("rows", rows);
                    res.render("signslist", {
                        rows,
                    });
                })

                .catch((err) => {
                    console.log("error in /signslist", err);
                });
        } else {
            res.redirect("/petition");
        }
    } else {
        res.redirect("/register");
    }
});

app.get("/profile", (req, res) => {
    const { userId, profiled } = req.session;
    if (userId) {
        if (profiled) {
            res.redirect("/petition");
        } else {
            db.getProfile(userId)
                .then(({ rows }) => {
                    // console.log("rows", rows);
                    if (rows.length == 0) {
                        res.render("profile", {});
                    } else {
                        // console.log("user has a profile!");
                        req.session.profiled = true;
                        res.redirect("/petition");
                    }
                })
                .catch((err) => {
                    console.log("error in GET /profile getProfile()", err);
                });
        }
    } else {
        res.redirect("/register");
    }
});

app.post("/profile", (req, res) => {
    const { age, city, url } = req.body;
    const { userId } = req.session;
    // console.log(age, city, url);
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

app.get("/profile-update", (req, res) => {
    const { userId, profiled } = req.session;
    if (userId) {
        if (profiled) {
            db.getProfile(userId).then(({ rows }) => {
                req.session.userEmail = rows[0].email;
                res.render("update", {
                    rows,
                });
            });
        } else {
            res.redirect("/profile");
        }
    } else {
        res.redirect("/register");
    }
});

app.post("/profile-update", (req, res) => {
    const { firstName, lastName, email, password, age, city, url } = req.body;
    const { userId, userEmail } = req.session;
    if (firstName !== "" && lastName !== "" && email !== "") {
        //existing email validation

        db.getUserDataByEmail(email)
            .then(({ rows }) => {
                if (rows.length === 0 || rows[0].email === userEmail) {
                    console.log("email is good to use!");
                    db.updateUserWithoutPW(firstName, lastName, email, userId)
                        .then((results) => {
                            if (password) {
                                hash(password)
                                    .then((hashedPass) => {
                                        // console.log("hashedPw", hashedPass);
                                        db.updateUserPassword(
                                            hashedPass,
                                            userId
                                        )
                                            .then(() => {
                                                // console.log(
                                                //     "user has changed password!"
                                                // );
                                            }) //end of updateUserPassword()
                                            .catch((err) => {
                                                console.log(
                                                    "error in POST /profile-update updateUserPassword()",
                                                    err
                                                );
                                                res.send(
                                                    "<h1>Server error: user could NOT update password in db</h1>"
                                                );
                                            });
                                    }) //end of hash()
                                    .catch((err) => {
                                        console.log(
                                            "error is POST /profile-update hash()",
                                            err
                                        );
                                        res.send(
                                            "<h1>Server error: your password could NOT be hashed</h1>"
                                        );
                                    });
                            } //end of if password
                            ////// update rest of profile fields //////
                            db.upsertProfile(age, city, url, userId)
                                .then(() => {
                                    //
                                    // console.log(
                                    //     "successful update other fields"
                                    // );
                                })
                                .catch((err) => {
                                    console.log(
                                        "error in POST /profile-update upsertUser()",
                                        err
                                    );
                                    res.send(
                                        "<h1>Server error: user could NOT update other fields in db</h1>"
                                    );
                                });
                            res.render("msg", {
                                message:
                                    "your profile was successfully updated",
                                btn: "continue",
                                href: "/petition",
                            });
                        })
                        .catch((err) => {
                            console.log(
                                "error in POST /profile-update updateUserWithoutPW()",
                                err
                            );
                            res.send(
                                "<h1>Server error: user profile could NOT be updates in db</h1>"
                            );
                        });
                } else {
                    //of if block (email is free)
                    // console.log("email has been already used");
                    res.render("update", {
                        message: "this email is already in use",
                        btn: "try again",
                        href: "/profile-update",
                    });
                }
            }) //end of getUserDataByEmail()
            .catch((err) => {
                console.log("error is POST /profile-update checkEmail", err);
                res.send(
                    "<h1>Server error: your email could NOT be verified</h1>"
                );
            });
    } else {
        //of if block (firstname, lastname, email, password)
        // console.log("missing fields");
        res.render("update", {
            message: "you cannot leave mandatory fields empty!",
            btn: "try again",
            href: "/profile-update",
        });
    } //close else for empty fields
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});
app.get("/delete-signeture", (req, res) => {
    //
    const { userId } = req.session;
    if (userId) {
        db.deleteSigneture(userId)
            .then(() => {
                console.log("signeture deleted!");
                req.session.signed = null;
                // res.redirect("/petition");
                res.render("msg", {
                    message: "your signeture was deleted",
                    btn: "continue",
                    // href: "javascript://",
                    href: "/petition",
                });
            })
            .catch((err) => {
                console.log("error in deleteSigneture()", err);
            });
    } else {
        res.redirect("/register");
    }
});

if (require.main == module) {
    app.listen(process.env.PORT || 8080, () =>
        console.log("petition SERVER at 8080...")
    );
}
