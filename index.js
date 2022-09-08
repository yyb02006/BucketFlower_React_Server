const express = require('express');
const dotenv = require('dotenv');
const app = express();
const path = require('path');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const { cp } = require('fs/promises');
const exp = require('constants');
const { send } = require('process');
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const user = req.body.author;
		const title = req.body.title;
		console.log(file);
		if (fs.existsSync(`uploads/${user}/${title}`)) {
			cb(null, `uploads/${user}/${title}`);
		} else {
			fs.mkdirSync(`uploads/${user}/${title}`);
			cb(null, `uploads/${user}/${title}`);
		}
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + file.originalname);
	},
});
const upload = multer({ storage: storage });
// const uploadThumbnail = multer({ storage: Thumbnail });

dotenv.config();

const db = mysql.createConnection({
	host: '127.0.0.1',
	user: 'root',
	password: 'filenoche1',
	database: 'bucketflower',
	port: '3307',
});

// app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
	cors({
		origin: 'http://localhost:3000',
		credentials: true,
	})
);
app.use(cookieParser());
app.use(express.static('uploads'));

app.get('/', (req, res) => {});

app.get('/personal', (req, res) => {});

app.post('/check', (req, res) => {
	const selectInfo = `select userid from users WHERE userid='${req.body.id}'`;
	db.query(selectInfo, (err, result) => {
		console.log(result.length);
		if (result.length > 0) {
			res.json({ overlap: 0 });
		} else if (result.length === 0) {
			res.json({ overlap: 1 });
		}
		if (err) {
			console.log(err);
		}
	});
});

app.post('/signup', (req, res) => {
	const insertInfo = `INSERT INTO users (userid,userpassword) VALUES ('${req.body.id}','${req.body.password}')`;
	db.query(insertInfo, (err, result) => {
		res.json('success!');
		if (err) {
			console.log(err);
		}
		console.log(result);
		console.log('Succeed to insert');
	});
	console.log(req.body);
});

app.post('/login', (req, res) => {
	const selectUsers = `SELECT * FROM users WHERE userid='${req.body.id}'`;
	db.query(selectUsers, (err, result) => {
		console.log(result[0]);
		if (result.length > 0 && req.body.password === result[0].userpassword) {
			//CREATE TOKEN
			//Access Token 발급
			const accessToken = jwt.sign(
				{
					id: result[0].userid,
				},
				process.env.ACCESS_SECRET,
				{
					expiresIn: '1m',
					issuer: 'BucketFlower',
				}
			);
			//Refresh Token 발급
			const refreshToken = jwt.sign(
				{
					id: result[0].userid,
				},
				process.env.REFRESH_SECRET,
				{
					expiresIn: '24h',
					issuer: 'BucketFlower',
				}
			);

			//Token 전송
			// res.send({ isUser: 1 });
			res.cookie('accessToken', accessToken, {
				secure: false,
				httpOnly: true,
			});

			res.cookie('refreshToken', refreshToken, {
				secure: false,
				httpOnly: true,
			});
			res.json({ isUser: 1 });
		} else {
			res.json({ isUser: 0 });
			// res.status(500).json('login failed');
			console.log('faild');
		}
		if (err) {
			console.log(err);
		}
	});
});

app.get('/authtoken', (req, res) => {
	console.log('111');
	const token = req.cookies.accessToken;
	try {
		const data = jwt.verify(token, process.env.ACCESS_SECRET);
		console.log(data);
		res.json(data);
	} catch (error) {
		console.log(error);
		res.json('Expired');
	}
});

app.get('/refreshtoken', (req, res) => {
	try {
		//tqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtqtq
		const token = req.cookies.refreshToken;
		const data = jwt.verify(token, process.env.REFRESH_SECRET);
		console.log('reftoken' + data);

		const accessToken = jwt.sign(
			{
				id: data.id,
			},
			process.env.ACCESS_SECRET,
			{
				expiresIn: '1m',
				issuer: 'BucketFlower',
			}
		);

		res.cookie('accessToken', accessToken, {
			secure: false,
			httpOnly: true,
		});

		res.status(200).json('accesstoken recreated');
	} catch (error) {
		console.log(error);
		res.json(error);
	}
});

app.get('/logout', (req, res) => {
	try {
		res.clearCookie('accessToken');
		res.clearCookie('refreshToken');
		res.status(200).json('logout');
	} catch (error) {
		res.status(500).json(error);
	}
});

app.post('/userThumbnail', upload.array('img'), (req, res) => {
	// const userImage = `INSERT INTO images (Title,FileName,Author,path) VALUES ('${req.body.id}','${req.body.password}')`;
	const insertList = `INSERT INTO bucketlist (Title,Contents,Author) VALUES ('${req.body.title}','${req.body.contents}','${req.body.author}')`;
	db.query(insertList, (err, result) => {
		res.json('success!');
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
	});
	req.files.map((file) =>
		db.query(
			`INSERT INTO images (Title,FileName,Author,path) VALUES ('${req.body.title}','${file.filename}','${req.body.author}','${file.path}')`,
			(err, result) => {
				if (err) {
					console.log(err);
					res.status(500).json(err);
				}
			}
		)
	);
});

app.post('/userList', (req, res) => {
	const selectList = `SELECT * FROM bucketlist WHERE author = '${req.body.id}'`;
	console.log('!!!!!!!!!!!!!' + req.body.id);
	db.query(selectList, (err, result) => {
		res.status(200).json(result);
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
	});
});

app.listen(8080, () => {
	console.log(`Running on port 8080`);
});
