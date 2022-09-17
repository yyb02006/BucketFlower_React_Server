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
		// console.log(file);
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

const updateStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const user = req.body.author;
		const title = req.body.title;
		const prevTitle = req.body.prevTitle;
		const oldPath = `uploads/${user}/${prevTitle}`;
		const newPath = `uploads/${user}/${title}`;
		// console.log(user, title, prevTitle);
		if (title !== prevTitle) {
			if (fs.existsSync(`uploads/${user}/${prevTitle}`)) {
				const data = fs.rename(oldPath, newPath, () => {
					cb(null, `uploads/${user}/${title}`);
				});
			} else {
				fs.mkdirSync(`uploads/${user}/${title}`);
				cb(null, `uploads/${user}/${title}`);
			}
		} else {
			if (fs.existsSync(`uploads/${user}/${title}`)) {
				cb(null, `uploads/${user}/${title}`);
			} else {
				fs.mkdirSync(`uploads/${user}/${title}`);
				cb(null, `uploads/${user}/${title}`);
			}
		}
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + file.originalname);
	},
});
const update = multer({ storage: updateStorage });

const profileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const user = req.body.userid;
		if (fs.existsSync(`uploads/${user}/profile`)) {
			cb(null, `uploads/${user}/profile`);
		} else {
			fs.mkdirSync(`uploads/${user}/profile`);
			cb(null, `uploads/${user}/profile`);
		}
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + file.originalname);
	},
});
const uploadProfile = multer({ storage: profileStorage });

dotenv.config();

const db = mysql.createConnection({
	host: '127.0.0.1',
	user: 'root',
	password: 'filenoche1',
	database: 'bucketflower',
	port: '3306',
	multipleStatements: true,
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
app.use(express.static('public'));

app.get('/', (req, res) => {});

app.get('/personal', (req, res) => {});

app.post('/check', (req, res) => {
	const selectInfo = `select userid from users WHERE userid='${req.body.id}'`;
	db.query(selectInfo, (err, result) => {
		// console.log(result.length);
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

app.post('/checkname', (req, res) => {
	const selectName = `SELECT usernickname FROM users WHERE usernickname = '${req.body.name}'`;
	db.query(selectName, (err, result) => {
		if (result.length > 0) {
			res.json({ overlap: true });
		} else if (result.length === 0) {
			res.json({ overlap: false });
		} else if (err) {
			res.status(500).json(err);
		} else {
			return;
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
		// console.log(result);
		// console.log('Succeed to insert');
	});
	// console.log(req.body);
});

app.post('/login', (req, res) => {
	const selectUsers = `SELECT * FROM users WHERE userid='${req.body.id}'`;
	db.query(selectUsers, (err, result) => {
		// console.log(result[0]);
		if (result.length > 0 && req.body.password === result[0].userpassword) {
			//CREATE TOKEN
			//Access Token 발급
			const accessToken = jwt.sign(
				{
					id: result[0].userid,
					name: result[0].usernickname,
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
					name: result[0].usernickname,
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
	const token = req.cookies.accessToken;
	try {
		const data = jwt.verify(token, process.env.ACCESS_SECRET);
		// console.log(data);
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
		// console.log('reftoken' + data);

		const accessToken = jwt.sign(
			{
				id: data.id,
				name: data.name,
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
	console.log(req.files);
	db.query(insertList, (err, result) => {
		res.json('success!');
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
	});
	req.files.map((file) =>
		db.query(
			`INSERT INTO images (Title,FileName,Author,ImagePath) VALUES ('${req.body.title}','${file.filename}','${req.body.author}','${file.path}')`,
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
	db.query(selectList, (err, result) => {
		res.status(200).json(result);
		if (err) {
			console.log(err);
			res.status(500).json(err);
		}
	});
});

app.post('/loadimage', (req, res) => {
	const selectImage = `SELECT FileName, id FROM images WHERE Title = '${req.body.title}' AND Author = '${req.body.userId}'`;
	db.query(selectImage, (err, result) => {
		try {
			res.status(200).json(result);
			// console.log(result);
		} catch (error) {
			res.status(500).json(error);
			console.log(error);
		}
	});
});

app.post('/updatepostlist', update.array('img'), (req, res) => {
	const updateList = `UPDATE bucketlist SET Title = '${req.body.title}', Contents = '${req.body.contents}' WHERE Title = '${req.body.prevTitle}' AND Author = '${req.body.author}'`;
	const updateImage = `UPDATE images SET Title = '${req.body.title}' WHERE Title = '${req.body.prevTitle}' AND Author = '${req.body.author}'`;
	const oldPath = `uploads/${req.body.author}/${req.body.prevTitle}`;
	const newPath = `uploads/${req.body.author}/${req.body.title}`;
	db.query(updateList, (err, result) => {
		try {
			res.status(200).json('success');
		} catch (error) {
			// res.status(500).json(error);
			console.log(error);
		}
	});
	db.query(updateImage, (err, result) => {
		try {
		} catch (error) {
			res.status(500).json(error);
			console.log(error);
		}
	});
	if (req.files[0]) {
		req.files.map((file) =>
			db.query(
				`INSERT INTO images (Title,FileName,Author,ImagePath) VALUES ('${req.body.title}','${file.filename}','${req.body.author}','${file.path}')`,
				(err, result) => {
					if (err) {
						console.log(err);
						res.status(500).json(err);
					}
				}
			)
		);
	} else {
		fs.renameSync(oldPath, newPath, (err) => {
			console.log(err);
		});
	}
	if (req.body.toDelete) {
		console.log(Array.isArray(req.body.toDelete));
		if (Array.isArray(req.body.toDelete)) {
			req.body.toDelete.map((Delete) => {
				db.query(
					`DELETE FROM images WHERE FileName = '${Delete}'`,
					(err, result) => {
						if (err) {
							console.log(err);
							res.status(500).json(err);
						} else {
							return;
						}
					}
				);
				fs.unlinkSync(`${newPath}/${Delete}`, (err) => {
					console.log(err);
				});
			});
		} else {
			db.query(
				`DELETE FROM images WHERE FileName = '${req.body.toDelete}'`,
				(err, result) => {
					if (err) {
						console.log(err);
						// res.status(500).json(err);
					} else {
						return;
					}
				}
			);
			fs.unlinkSync(`${newPath}/${req.body.toDelete}`, (err) => {
				console.log(err);
			});
		}
	} else {
		return;
	}
});

app.post('/deletelist', (req, res) => {
	const userid = req.body.id;
	const title = req.body.title;
	const deleteImages = `DELETE FROM images WHERE Title = '${title}' AND Author = '${userid}';`;
	const deleteBukcetList = `DELETE FROM bucketlist WHERE Title = '${title}' AND Author = '${userid}';`;
	db.query(deleteBukcetList + deleteImages, (err, result) => {
		res.status(200).json('success');
		if (err) {
			console.log(err);
			res.status(500).json(err);
		} else {
			return;
		}
	});
	const files = fs.readdirSync(`uploads/${userid}/${title}`);
	if (files.length > 0) {
		files.map((file) =>
			fs.unlinkSync(`uploads/${userid}/${title}/${file}`, (err) => {
				console.log(err);
			})
		);
		fs.rmdirSync(`uploads/${userid}/${title}`);
	} else {
		fs.rmdirSync(`uploads/${userid}/${title}`);
	}
});

app.post('/userprofileimage', uploadProfile.single('img'), (req, res) => {
	//single은 req.file array는 req.files
	const userImage = req.file.filename;
	const userid = req.body.userid;
	const updateProfile = `UPDATE users SET userimage = '${userImage}' WHERE userid = '${userid}'`;
	res.json(userImage);
	db.query(updateProfile, (err, result) => {
		if (err) {
			res.status(500).json(err);
			console.log(err);
		} else {
			return;
		}
	});
	const files = fs.readdirSync(`uploads/${userid}/profile`);
	const toDeleteFiles = files.filter((arr) => arr !== userImage);
	toDeleteFiles.map((file) =>
		fs.unlinkSync(`uploads/${userid}/profile/${file}`, (err) => {
			console.log(err);
		})
	);
});

app.post('/userprofile', (req, res) => {
	const userid = req.body.userid;
	console.log('herhr' + userid);
	const selectUserImage = `SELECT userimage FROM users WHERE userid = '${userid}'`;
	db.query(selectUserImage, (err, result) => {
		res.json(result);
		console.log(result);
		if (err) {
			res.status(500).json(err);
			console.log(err);
		} else {
			return;
		}
	});
});

app.post('/changeusernickname', (req, res) => {
	const userid = req.body.id;
	const newName = req.body.name;
	const updateName = `UPDATE users SET usernickname = '${newName}' WHERE userid = '${userid}'`;
	db.query(updateName, (err, result) => {
		res.json(result);
	});
});

app.post('/users', (req, res) => {
	const userid = req.body.userid;
	const selectUsers = `SELECT usernickname, userimage FROM users WHERE userid = '${userid}'`;
	db.query(selectUsers, (err, result) => {
		res.json(result);
	});
});

app.post('/loadRewards', (req, res) => {
	const selectRewards = `SELECT * FROM rewards`;
	db.query(selectRewards, (err, result) => {
		res.status(200).json(result);
		if (err) {
			res.status(500).json(err);
		}
	});
});

app.post('/setreward', (req, res) => {
	const insertRewards = `INSERT INTO userrewards (userid, filename, category, theme) values('${req.body.userid}','${req.body.rewards}','${req.body.category}','${req.body.theme}')`;
	db.query(insertRewards, (err, result) => {
		res.status(200).json(result);
		if (err) {
			res.status(500).json(err);
		}
	});
});

app.post('/selectreward', (req, res) => {
	const selectRewards = `SELECT * FROM userrewards WHERE userid = '${req.body.userid}'`;
	db.query(selectRewards, (err, result) => {
		res.status(200).json(result);
		if (err) {
			res.status(500).json(err);
		}
	});
});

app.post('/submitdisplayed', (req, res) => {
	res.json('success');
	const displayedArr = req.body.displayed.filter((arr) => arr !== null);
	const selectDisplayed = `SELECT imagekey FROM displayedrewards WHERE userid ='${req.body.userid}'`;
	const insertDisplayed = (id, file, x, y, key) =>
		`INSERT INTO displayedrewards (userid, filename, posx, posy, imagekey) VALUES ('${id}','${file}','${x}','${y}','${key}')`;
	const updateDisplayed = (file, x, y, key) =>
		`UPDATE displayedrewards SET filename = '${file}', posx = '${x}', posy = '${y}' WHERE imagekey = ${key}`;

	if (displayedArr.length > 0) {
		db.query(selectDisplayed, (err, result) => {
			displayedArr.map((arr) => {
				if (result.map((arr) => arr.imagekey).includes(arr.key)) {
					db.query(
						updateDisplayed(arr.filename, arr.posx, arr.posy, arr.key),
						(err, result) => {
							if (err) {
								console.log(err);
							}
						}
					);
				} else {
					db.query(
						insertDisplayed(
							arr.userid,
							arr.filename,
							arr.posx,
							arr.posy,
							arr.key
						),
						(err, result) => {
							if (err) {
								console.log(err);
							}
						}
					);
				}
			});
			if (err) {
				console.log(err);
			}
		});
	}
});

app.listen(8080, () => {
	console.log(`Running on port 8080`);
});
