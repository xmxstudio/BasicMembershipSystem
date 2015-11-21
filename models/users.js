var mongoose = require('mongoose');
var userSchema = new mongoose.Schema({username : String,password : String,email : String, verified: String},{versionKey: false});
var User = mongoose.model('User', userSchema);
module.exports = User;