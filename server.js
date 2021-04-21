const express = require("express");
const app = express();
const db = require("./db");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");

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
        secret: `we need more cowbell!`,
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

//~~~~ ROUTES
app.get("/", (req, res) => {
    res.redirect("/petition");
});

app.get("/petition", (req, res) => {
    const { signatureId } = req.session;
    if (!signatureId) {
        res.render("home");
    } else {
        res.redirect("/thankyou");
    }
});

app.get("/signslist", (req, res) => {
    const { signatureId } = req.session;
    if (signatureId) {
        db.getSigns()
            .then(({ rows }) => {
                res.render("signslist", {
                    rows,
                });
            })
            .catch((err) => {
                console.log("error in /signerslist", err);
            });
    } else {
        res.redirect("/petition");
    }
});

app.post("/petition", (req, res) => {
    const { firstName, lastName, signeture } = req.body;
    if (firstName !== "" && lastName !== "" && signeture !== "") {
        db.addSign(`${firstName}`, `${lastName}`, `${signeture}`)
            .then((results) => {
                req.session.signatureId = results.rows[0].id;
                // console.log("added new signer!");
                res.redirect("/thankyou");
            })
            .catch((err) => {
                console.log("error in POST /petition", err);
            });
    } else {
        res.render("home", {
            unfilled: true,
        });
    }
});
app.get("/thankyou", (req, res) => {
    const { signatureId } = req.session;
    if (signatureId) {
        db.countSigns().then((counts) => {
            const numberOfSigns = counts.rows[0].count;
            db.getCurrentSign(signatureId).then(({ rows }) => {
                res.render("thankyou", {
                    rows,
                    numberOfSigns,
                });
            });
        });
    } else {
        res.redirect("/petition");
    }
});

app.listen(8080, () => console.log("petition SERVER at 8080..."));
