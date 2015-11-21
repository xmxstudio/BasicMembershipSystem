var express = require('express');
var router = express.Router();
//load our non node_module mongoose model from the models folder
// all mongoose data access should be through models stored in this folder
var users = require('../models/users');
//load crypto to create a validation hash out of the users email+ epoch
var crypto = require('crypto');
var mailman = require('nodemailer');


var user  
router.get('/', function(req, res, next) {
	user  = req.session.user;    
	res.render('index',{user: user});
});


router.get('/login',function(req,res){
	var err;
	res.render('login', {errormessage: err});
});


router.post('/login',function(req,res){
	/* PROCESS THE LOGIN 
	First we get username and password from the posted form data.
	then we attempt to get the document from mongodb using our users model
	*/
	var username = req.body.username;
	var password = req.body.password;
	//im not using any sort of password hashing here just plaintext to demonstrate the basics.
	users.findOne({username: username, password: password},function(err,doc){
		if(err){
			//clearly it's not a valid login so lets return an errormessage
			res.render('login', {errormessage: err});
		}else{
			//they've supplied a valid username and password that returned a document so lets
			//add a session cookie or something
			//so our docs array [0] contains the user account information.
			var user =  doc;
			if(user == null){
				res.render('login', {errormessage: 'Invalid login credentials.'});
			}else{
				if(user.verified != '1'){
					res.render('login', {errormessage: 'You have not validated your email address.'});
					//you can redirect them to a re-send verification code page.
				}else{
					//everythings good
					req.session.user = user.username; 
					res.render('account', {user: user});
				}
			}
		}
	});
});




//this route to get /verify  will supply the user with the form to enter a code
router.get('/verify',function(req,res){
	res.render('verify');
});
//this route to get /verify/:validationcode will auto attempt to validate given the code as part of the uri
router.get('/verify/:validationcode',function(req,res){
	verifyCode(req.params.validationcode, res);
});
//this route handles postback from the form rendered on the router.get/Verify ... yay!
router.post('/verify',function(req,res){
	verifyCode(req.body.validationcode, res);
});



router.get('/account',function(req,res){
	//redirect the peron out of here if they're not logged in (aka have a session.user variable that was set in the login function)
	if(!req.session.user){
		res.render('login',{errormessage: 'you must be logged in to access that page'});
		return;
	}
	//get the username from the session variable
	var user = req.session.user;
	users.findOne({username: user}, function(err,doc){
		if(err){
			res.send('an error has occured: ' + err);
		}else{
			res.render('account', {user: doc});
		}
	});
});


router.get('/logout',function(req,res){
	req.session.user = null;
	res.redirect(302,'/');
});





/***************** REGISTRATION **********************/
router.get('/register',function(req,res){
	res.render('register');
});

router.post('/register',function(req,res){
	var username = req.body.username;
	var password = req.body.password;
	var email = req.body.email;

	//register a new user. make sure the email and username are both available first
	users.findOne({$or: [{ username: username },{ email: email}]} ,function(err,doc){
		if(err){
			res.render('register',{errormessage: 'Error: ' + err});
		}else{
			if(doc != null){
				res.render('register',{errormessage: 'That username or email address is already in use.',message: null});
			}else{
				saveUser(username, password,email, res);
			}
		}
	});
});



router.get('/forgotpassword',function(req,res){
	res.render('forgotpassword');
});
router.post('/forgotpassword',function(req,res){
	var email = req.body.email;
	users.findOne({email: email},function(err,doc){
		if(err){
			res.render('forgotpassword', {errormessage: err});
		}else{
			if(doc == null){
				res.render('forgotpassword', {errormessage: 'Email address not found'});
			}else{
				sendMail(doc.email ,"password recovery","your password is: " + doc.password);
				res.render('forgotpassword', {message: 'check your email for password reset instructions'});
			}
		}
	});
});



module.exports = router;


function verifyCode(vcode, res){	
	users.find({verified: vcode},function(err,docs){
		if(err){
			res.render('verify', {errormessage:  err});
		}else{
			if(docs.length){
				docs[0].verified = '1';
				docs[0].save(function(err,doc){
					res.render('verify', {verified: true});
				});
			}else{
				res.render('verify', {errormessage:  'that was an invalid code.'});
			}
		}
	});
}
function saveUser(username, password, email, res){
	var c = crypto.createHash('sha256');
	c.update(username + password + new Date().toString());
	var vcode = c.digest('hex');
	var newuser = new users();
	newuser.username  = username;
	newuser.password  = password;
	newuser.email  = email;
	newuser.verified = vcode;
	newuser.save(function(err){
		if(err){
			res.render('register',{errormessage: 'Error: ' + err});
		}else{
			var msg = "please visit www.site.com/verify/" + vcode  + "<br/><br/>Username: " + username + "<br/>Password:  " + password.substr(0,1) + "...." + password.substr(password.length - 1) ;
			sendMail(email, "Verify your account",  msg)
			res.render('verify',{message: 'Check your email and click the link int he email or copy and paste the validation code here'});
		}
	});
}

function sendMail(email, subject, body){
	var cred = require('credentials');
	var transporter = mailman.createTransport({
		service: 'Gmail',
		auth:{
			user: cred.email.user,
			pass: cred.email.pass
		}
	});
		var mailOptions={
		from: 'FreshTacoDelivery <FreshTacoDelivery@gmail.com>',
		to: email,
		subject: subject,
		html: body
	}
	console.log(mailOptions);
	transporter.sendMail(mailOptions, function(err,info){
		return true;
	});
}

