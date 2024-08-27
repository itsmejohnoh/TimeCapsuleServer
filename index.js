require("./utils.js");

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { object } = require("joi");
const cloudinary = require("cloudinary").v2;
const saltRounds = 12;

const port = process.env.PORT || 3500;

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

/* secret information section */

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

/* END secret section */

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
	// crypto: {
	// 	secret: mongodb_session_secret,
	// },
});

app.use(
	session({
		secret: node_session_secret,
		store: mongoStore, //default is memory store
		saveUninitialized: false,
		resave: true
	})
);

app.post('/submitUser', async (req, res) => {
	const _name = req.body.name;
	const _email = req.body.email;
	const _password = req.body.password;

	const foundUser = await userCollection.find({ email: _email }).toArray();

	req.session.authenticated = true;
	req.session.username = _name;
	req.session.email = _email;
	req.session.cookie.maxAge = expireTime;

	if (foundUser[0] == undefined) {
		userCollection.insertOne({ name: _name, email: _email, password: _password })
			.then((result) => {
				res.send("success")
			}).catch((err) => {
				console.log(err);
			});
	} else {
		res.send(`There is a user registered with the username ${_name}`);
	}
});

app.post('/signIn', async (req, res) => {
	_email = req.body.email;

	console.log(req.body);
	const foundUser = await userCollection.find({email: _email}).project({username: 1, password: 1}).toArray();
	
	var _username = foundUser[0].username;
	var _password = foundUser[0].password;
	req.session.authenticated = true;
	req.session.username = _username;
	req.session.email = _email;
	req.session.maxAge = expireTime;
	
	if (foundUser[0]) {
		res.send(_password);
	} else {
		res.send(`Error with login`)
	}
})

app.post('/logout', (req, res) => {
	req.session.destroy();
	res.send("Session Ended");
});

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
