const express = require("express");
const app = (exports.app = express());
const db = require("./db");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const { hash, compare } = require("./bc");

const hbSet = hb.create({
    helpers: {
        someFn() {
            return "something";
        },
    },
});

app.engine("handlebars", hbSet.engine);
app.set("view engine", "handlebars");

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

app.use(csurf());
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    res.set("x-frame-options", "DENY");
    next();
});
app.use(express.static("public"));

const fieldsCheck = (age, url) => {
    let field;
    if (isNaN(age) || age < 0) {
        field = "Please enter a valid age or leave the field empty";
        return field;
    } else if (url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            if (url.startsWith("www")) {
                field = `please add "http://" or "https://" to your website`;
                return field;
            } else if (url.startsWith("javascript:")) {
                field = "Invalid Input!!!";
                return field;
            } else {
                field = `make sure your website begins with "http://" or "https://"`;
                return field;
            }
        }
    }
};

const capitalizeCity = (city) => {
    function capitalize(city) {
        let capWord = city.toLowerCase();
        return (capWord = capWord.charAt(0).toUpperCase() + capWord.slice(1));
    }
    let capCity = city.split(" ").map(capitalize).join(" ");
    return capCity;
};

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
        db.getUserDataByEmail(email)
            .then((results) => {
                if (results.rows.length == 0) {
                    hash(password)
                        .then((hashedPass) => {
                            db.createUser(
                                firstName,
                                lastName,
                                email,
                                hashedPass
                            )
                                .then((results) => {
                                    req.session.userId = results.rows[0].id;
                                    console.log("add new user");
                                    res.redirect("/profile");
                                })
                                .catch((err) => {
                                    console.log("error in POST /register", err);
                                    res.send("<h1>user NOT added to db</h1>");
                                });
                        })
                        .catch((err) => {
                            console.log("error is POST /register", err);
                            res.send("<h1>your password NOT be hashed</h1>");
                        });
                } else {
                    console.log("email already used");
                    res.render("register", {
                        message: "email is already in use",
                        btn: "try again",
                        href: "javascript://",
                    });
                }
            })
            .catch((err) => {
                console.log("error is POST /register", err);
                res.send("<h1>your email NOT be verified</h1>");
            });
    } else {
        res.render("register", {
            message: "are you sure that, your form is complete!",
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
                                    console.log("error in POST /login", err);
                                });
                            res.redirect("/profile");
                        } else {
                            res.render("login", {
                                message: "you have failed to log in",
                                btn: "try again",
                                href: "javascript://",
                            });
                        }
                    })
                    .catch((err) => {
                        console.log("error in POST /login", err);
                        res.send("<h1>your password does NOT match</h1>");
                    });
            })
            .catch((err) => {
                console.log("error in POST /login", err);
                res.render("login", {
                    message: "you have failed to log in",
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
                console.log("error in GET /petition", err);
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
            .then(() => {
                req.session.signed = true;
                res.redirect("/thankyou");
            })
            .catch((err) => {
                console.log("error in POST /petition", err);
            });
    } else {
        res.render("petition", {
            message:
                "Looks like you still haven't signed the petition. You need to use the mouse to make your signeture...",
            btn: "try again",
            href: "/petition",
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
    const { signed, userId } = req.session;
    if (userId) {
        if (signed) {
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
                    if (rows.length == 0) {
                        res.render("profile", {});
                    } else {
                        req.session.profiled = true;
                        res.redirect("/petition");
                    }
                })
                .catch((err) => {
                    console.log("error in GET /profile", err);
                });
        }
    } else {
        res.redirect("/register");
    }
});

app.post("/profile", (req, res) => {
    const { age, city, url } = req.body;
    const { userId } = req.session;
    const validation = fieldsCheck(age, url);
    if (validation) {
        res.render("profile", {
            message: validation,
            btn: "try again",
            href: "javascript://",
        });
    } else {
        let capCity = capitalizeCity(city);
        db.addProfile(age, capCity, url, userId)
            .then(() => {
                req.session.profiled = true;
                res.redirect("/petition");
            })
            .catch((err) => {
                console.log("error in POST /profile", err);
                res.send("<h1>profile could NOT be added to db</h1>");
            });
    }
});

app.get("/profile/update", (req, res) => {
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

app.post("/profile/update", (req, res) => {
    const { firstName, lastName, email, password, age, city, url } = req.body;
    const { userId, userEmail } = req.session;
    if (firstName !== "" && lastName !== "" && email !== "") {
        const validation = fieldsCheck(age, url);
        if (validation) {
            res.render("profile", {
                message: validation,
                btn: "try again",
                href: "/profile/update",
            });
        } else {
            db.getUserDataByEmail(email)
                .then(({ rows }) => {
                    if (rows.length === 0 || rows[0].email === userEmail) {
                        db.updateUserWithoutPW(
                            firstName,
                            lastName,
                            email,
                            userId
                        )
                            .then(() => {
                                if (password) {
                                    hash(password)
                                        .then((hashedPass) => {
                                            db.updateUserPassword(
                                                hashedPass,
                                                userId
                                            )
                                                .then(() => {})
                                                .catch((err) => {
                                                    console.log(
                                                        "error in POST /update",
                                                        err
                                                    );
                                                    res.send(
                                                        "<h1>user could NOT update password in db</h1>"
                                                    );
                                                });
                                        })
                                        .catch((err) => {
                                            console.log(
                                                "error is POST /update",
                                                err
                                            );
                                            res.send(
                                                "<h1>your password could NOT be hashed</h1>"
                                            );
                                        });
                                }
                                let capCity = capitalizeCity(city);
                                db.upsertProfile(age, capCity, url, userId)
                                    .then(() => {})
                                    .catch((err) => {
                                        console.log(
                                            "error in POST /update",
                                            err
                                        );
                                        res.send(
                                            "<h1>user could NOT update other fields in db</h1>"
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
                                console.log("error in POST /update", err);
                                res.send(
                                    "<h1>user profile could NOT be updates in db</h1>"
                                );
                            });
                    } else {
                        res.render("msg", {
                            message: "this email is already in use",
                            btn: "try again",
                            href: "/profile/update",
                        });
                    }
                })
                .catch((err) => {
                    console.log("error is POST /update", err);
                    res.send("<h1>your email NOT be verified</h1>");
                });
        }
    } else {
        res.render("msg", {
            message: "you can't leave mandatory fields empty!",
            btn: "try again",
            href: "/profile/update",
        });
    }
});

app.get("/signslist/:city", (req, res) => {
    const { signed, userId } = req.session;
    const { city } = req.params;
    if (userId) {
        if (signed) {
            db.getSignsByCity(city)
                .then(({ rows }) => {
                    res.render(
                        "cities",

                        {
                            rows,
                            city,
                        }
                    );
                })
                .catch((err) => {
                    console.log("error is GET /signslist/city", err);
                    res.send("<h1>couldn't generate city list</h1>");
                });
        } else {
            res.redirect("/petition");
        }
    } else {
        res.redirect("/register");
    }
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});
app.get("/delete/signeture", (req, res) => {
    //
    const { userId } = req.session;
    if (userId) {
        db.deleteSigneture(userId)
            .then(() => {
                console.log("delete signeture!");
                req.session.signed = null;
                res.render("msg", {
                    message: "your signeture was deleted",
                    btn: "continue",
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
