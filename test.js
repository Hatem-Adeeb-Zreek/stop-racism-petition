const supertest = require("supertest");
const { app } = require("./server.js");
const cookieSession = require("cookie-session");

test("user logout: GET /petition redirects to /register", () => {
    cookieSession.mockSessionOnce();
    return supertest(app)
        .get("/petition")
        .then((res) => {
            expect(res.headers.location).toBe("/register");
            expect(res.statusCode).toBe(302);
        });
});

test("user login: GET /register redirects to /petition", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
    });
    return supertest(app)
        .get("/register")
        .then((res) => {
            expect(res.headers.location).toBe("/petition");
            expect(res.statusCode).toBe(302);
        });
});

test("user login: GET /petition redirects to /thankyou", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
    });
    return supertest(app)
        .get("/login")
        .then((res) => {
            expect(res.headers.location).toBe("/petition");
            expect(res.statusCode).toBe(302);
        });
});

// test("user login, signed: GET /petition redirects to /thankyou", () => {
//     cookieSession.mockSessionOnce({
//         userId: 1,
//         signed: true,
//     });
//     return supertest(app)
//         .get("/petition")
//         .then((res) => {
//             expect(res.headers.location).toBe("/thankyou");
//             expect(res.statusCode).toBe(302);
//         });
// });

test("user login, not signed: GET /thankyou redirects to /petition", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
    });
    return supertest(app)
        .get("/thankyou")
        .then((res) => {
            expect(res.headers.location).toBe("/petition");
            expect(res.statusCode).toBe(302);
        });
});

test("user login, not signed: GET /signslist redirects to /petition", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
    });
    return supertest(app)
        .get("/signslist")
        .then((res) => {
            expect(res.headers.location).toBe("/petition");
            expect(res.statusCode).toBe(302);
        });
});
