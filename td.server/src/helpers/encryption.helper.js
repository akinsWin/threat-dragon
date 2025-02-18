'use strict';

var crypto = require('crypto');

var env = require('../env/Env.js');

var inputEncoding = 'ascii';
var outputEncoding = 'base64';
var keyEncoding = 'ascii';
var algorithm = 'aes256';

function generateIV(cb) {
    crypto.randomBytes(16, function(err, iv) {
        cb(iv);
    });
}

//primary key is used for encryption
function getPrimaryKey() {
    var keys = JSON.parse(env.default.get().config.SESSION_ENCRYPTION_KEYS);
    var primaryKey = keys.find(function(key) { return key.isPrimary; });

    if (!primaryKey) {
        var message = 'missing primary session encryption key';
        require('../config/loggers.config').default.logger.fatal(message);
        throw new Error(message);
    }
    
    return {id: primaryKey.id, value: new Buffer(primaryKey.value, keyEncoding)};
}

//other keys can be used for decryption to support key expiry
function getKeyById(id) {
    var keys = JSON.parse(env.default.get().config.SESSION_ENCRYPTION_KEYS);
    var key = keys.find(function(key) { return key.id == id; });

    if (!key) {
        var message = 'missing session encryption key id:  ' + id;
        require('../config/loggers.config').default.logger.error(message);
        throw new Error(message);
    }
    
    return {id: key.id, value: new Buffer(key.value, keyEncoding)};       
}

function encryptData(plainText, key, iv) {
    var encryptor = crypto.createCipheriv(algorithm, key.value, iv);
    var cipherText = encryptor.update(plainText, inputEncoding, outputEncoding);
    cipherText += encryptor.final(outputEncoding);
    var encryptedData = {keyId: key.id, iv: iv.toString(keyEncoding), data: cipherText};
    return encryptedData;
}

function decryptData(cipherText, key, iv) {
    var decryptor = crypto.createDecipheriv(algorithm, key.value, iv);
    var plainText = decryptor.update(cipherText, outputEncoding, inputEncoding);
    plainText += decryptor.final(inputEncoding);
    return plainText;
}

function encrypt(plainText, cb) {
    var key = getPrimaryKey();
    generateIV(function(iv) {
        cb(encryptData(plainText, key, iv));
    });
}

function decrypt(encryptedData) {
    var iv = new Buffer(encryptedData.iv, keyEncoding);
    var key = getKeyById(encryptedData.keyId);
    return decryptData(encryptedData.data, key, iv);  
}

var helper = {
    encrypt: encrypt,
    decrypt: decrypt
};

module.exports = helper;