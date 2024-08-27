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
	crypto: {
		secret: mongodb_session_secret,
	},
});

app.use(
	session({
		secret: node_session_secret,
		store: mongoStore, //default is memory store
		saveUninitialized: false,
		resave: true,
	})
);

app.post('/submitUser', async (req, res) => {
	const _name = req.body.name;
	const _email = req.body.email;
	const _password = req.body.password;

	const foundUser = await userCollection.find({ email: _email }).toArray();
	if (foundUser[0] == undefined) {
		userCollection.insertOne({ name: _name, email: _email, password: _password })
			.then((result) => {
				session.authenticated = true;
				session.username = _name;
				session.email = _email;
				session.cookie.maxAge = expireTime;
				
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
	if (foundUser[0]) {
		var _username = foundUser[0].username;
		var _password = foundUser[0].password;
		session.authenticated = true;
		session.username = _username;
		session.email = _email;
		session.maxAge = expireTime;
		res.send(_password);
	} else {
		res.send(`Error with login`)
	}
})

app.post('/logout', (req, res) => {
	console.log(_email);
	req.session.destroy();
	res.send("Session Ended");
});

// app.post('/submitUser', async (req, res) => {
// 	var name = req.body.name;
// 	var email = req.body.email;
// 	var password = req.body.password;

//     userCollection.findOne({email:email}).exec((err, foundUser) => {
//         if(!foundUser){
//             const schema = Joi.object(
//                 {
//                     name: Joi.string().alphanum().max(20).required(),
//                     email: Joi.string().email().required(),
//                     password: Joi.string().max(20).required()
//                 });

//             const validationResult = schema.validate({ name, email, password });

//             // if (validationResult.error != null) {
//             //     console.log(validationResult.error);
//             //     // res.redirect(invalid);
//             //     res.status(400).json({message: "Validation Failed"});
//             // }

//             // var hashedPassword = bcrypt.hash(password, saltRounds).then((password)=>{
//             //     userCollection.insertOne({ name: name, email: email, password: hashedPassword, user_type: "user"});
//             // })

//             console.log("Inserted user");

//             req.session.authenticated = true;
//             req.session.name = name;
//             req.session.user_type = user_type;
//             res.send()
//             // res.redirect("/members");
//         }
//     })

// });

// app.use(session({
// 	secret: node_session_secret,
// 	store: mongoStore, //default is memory store 
// 	saveUninitialized: false,
// 	resave: true
// }
// ));

// function isValidSession(req) {
// 	if (req.session.authenticated) {
// 		return true;
// 	}
// 	return false;
// }

// app.get('/nosql-injection', async (req,res) => {
// 	var name = req.query.user;

// 	if (!name) {
// 		res.send(`<h3>no user provided</h3>`);
// 		return;
// 	}
// 	console.log("user: "+name);

// 	const schema = Joi.string().max(20).required();
// 	const validationResult = schema.validate(name);

// 	//If we didn't use Joi to validate and check for a valid URL parameter below
// 	// we could run our userCollection.find and it would be possible to attack.
// 	// A URL parameter of user[$ne]=name would get executed as a MongoDB command
// 	// and may result in revealing information about all users or a successful
// 	// login without knowing the correct password.
// 	if (validationResult.error != null) {  
// 	   console.log(validationResult.error);
// 	   res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
// 	   return;
// 	}	

// 	const result = await userCollection.find({name: name}).project({name: 1, email: 1, password: 1, _id: 1}).toArray();

// 	console.log(result);

//     res.send(`<h1>Hello ${name}</h1>`);
// });

// Configuration
// cloudinary.config({
// 	cloud_name: process.env.CLOUDINARY_NAME,
// 	api_key: process.env.CLOUDINARY_KEY,
// 	api_secret: process.env.CLOUDINARY_SECRET, 
// });

// // Upload an image
// async function uploadImage () {
// 	const result = await cloudinary.uploader.upload('/Users/john/Documents/Personal Project/picture1.jpg') //Insert the path to the image and it will upload that image to cloudinary
// 	console.log('success');
// 	const url = cloudinary.url(result.public_id)
// 	console.log(url);
// };
// uploadImage();

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
