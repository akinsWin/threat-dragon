'use strict';

var path = require('path');

var env = require('../env/Env.js');
var homeController = {};

homeController.index = function (req, res) {
    //angular ajax request need xsrf token as a script accessible cookie
    var cookieOptions = { httpOnly: false };
    
    if(env.default.get().config.NODE_ENV != 'development' && env.default.get().config.NODE_ENV) {
        cookieOptions.secure = true;
    } else {
        require('../config/loggers.config').default.logger.error({security: true}, 'secure anti-XSRF cookie flag was false - should only happen in dev environments');
    }
    
    res.cookie('XSRF-TOKEN', req.csrfToken(), cookieOptions);
    var upDir = '..' + path.sep;
    res.sendFile(path.join(__dirname, upDir, upDir, upDir, 'dist', 'index.html'));
};

homeController.login = function (req, res) {
    res.render('login', { csrfToken: req.csrfToken() });
};

//ensure current user is signed in
homeController.ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn('/login');

//angular template - dynamic for username and anti-csrf token
homeController.logoutform = function (req, res) {
    res.render('logoutform', { csrfToken: req.csrfToken(), username: req.user.profile.username });
};

//logout
homeController.logout = function(req, res) {
    var username = req.user.profile.username;
    var idp = req.user.profile.provider;
    req.logOut();
    //logout does not seem to do much/anything so do it by hand
    res.clearCookie('connect.sid');
    res.clearCookie('XSRF-TOKEN');
    req.session.destroy(function() {
        req.log.info({security: true, userName: username, idp:idp}, 'logged out');
        res.redirect('/'); 
    });
}; 

module.exports = homeController;
