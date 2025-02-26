const CreateError = require('http-errors');
const Express = require('express');
const Session = require('express-session');
const Path = require('path');
const CookieParser = require('cookie-parser');
const Cors = require('cors');
const BodyParser = require('body-parser');
const Application = require('./controllers/application');
const WebSocketService = require('./controllers/websockets');
const Config = require('config');
const Passport = require('passport');
const LocalStrategy = require('passport-local');
const FileUpload = require('express-fileupload');

const app = Express();

const indexRouter = require('./routes/index');
const allowedOrigins = process.env.CLIENT_ORIGINS
    ? process.env.CLIENT_ORIGINS.split(',')
    : Config.get('clientOrigins');

app.use(Cors({
    credentials: true,
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true); // ✅ Allow this origin
        } else {
            callback(new Error('Not allowed by CORS')); // ❌ Block if not in the whitelist
        }
    }
}));

// view engine setup
app.set('views', Path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//body parsers
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.text({ limit: '50mb' }));
app.use(CookieParser());

//static routes
app.use(Express.static(Path.join(__dirname, 'public')));

//favicon
//app.use(Favicon(Path.join(__dirname, '/public/favicon.ico')));

let session = Session({
    secret: 'theres no business like snow business!',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 //(30 * 24 * 60 * 60 * 1000) 30 days
    },
    saveUninitialized: true, //this saves uninitiallized sessions making it so that simply visiting the site resets expiration
    resave: true, //Forces the session to be saved back to the session store, even if the session was never modified during the request.
    rolling: true //Force a session identifier cookie to be set on every response.
});

/*
helpful resources for building credentials:
https://medium.com/@prashantramnyc/node-js-with-passport-authentication-simplified-76ca65ee91e5
https://stackoverflow.com/questions/27637609/understanding-passport-serialize-deserialize
https://stackoverflow.com/questions/16434893/node-express-passport-req-user-undefined
https://stackoverflow.com/questions/19743396/cors-cannot-use-wildcard-in-access-control-allow-origin-when-credentials-flag-i
*/

// super basic auth
const authUser = (username, password, done) => {
    password = password.toLowerCase();
    const users = Config.get('users');
    const user = users.find((item) => { return item.phrase === password });

    if (user) {
        return done (null, user);
    }
    return done ('User not found', false);
}

app.use(session);
app.use(Passport.initialize()); // init passport on every route call.
app.use(Passport.session()); // allow passport to use "express-session"
Passport.use(new LocalStrategy(authUser));

Passport.serializeUser((user, done) => { 
    done(null, user.id)
    // Passport will pass the authenticated_user to serializeUser as "user" 
    // This is the USER object from the done() in auth function
    // Now attach using done (null, user.id) tie this user to the req.session.passport.user = {id: user.id}, 
    // so that it is tied to the session object
});


Passport.deserializeUser((id, done) => {

    const users = Config.get('users');
    const user = users.find((item) => { return item.id === id });

    done (null, user);      

    // This is the id that is saved in req.session.passport.{ user: "id"} during the serialization
    // use the id to find the user in the DB and get the user object with user details
    // pass the USER object in the done() of the de-serializer
    // this USER object is attached to the "req.user", and can be used anywhere in the App.
});

/*
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
*/

app.use(FileUpload());

//routes
app.use('/', indexRouter);

//end point only accessable in dev
if (app.get('env') === 'development') {
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(CreateError(404));
});

// error handler
app.use(function (err, req, res, next) {

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.json(err);
});

const server = app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
});

WebSocketService.ApplicationStart(server);

Application.ApplicationStart(() => {
    //on complete
});

module.exports = server;
