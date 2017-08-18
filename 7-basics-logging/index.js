// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
// var Promise = require('bluebird');
// var request = require('request-promise').defaults({ encoding: null });

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3979, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages
server.post('/api/messages', connector.listen());

//------------------------------------------------------------------------------------------------
//除了输入的文本是log on 或log off，其他时候一直会回复该文本
var bot = new builder.UniversalBot(connector, function (session) {
    if (session.userData.isLogging) {
        session.send("you text will log...");
    } else {
        session.send("you text will no log...");
    }
});

// Install logging middleware
//日志中间件，
bot.use({
    //事件名称必须是botbuilder中间件才起作用
    botbuilder: function (session, next) {
        if (/^log on/i.test(session.message.text)) {
            //打开日志
            session.userData.isLogging = true;
            session.send('Logging is now turned on');
            //没有next所以，bot不会回复
        } else if (/^log off/i.test(session.message.text)) {
            //关闭日志
            session.userData.isLogging = false;
            session.send('Logging is now turned off');
            //没有next所以，bot不会回复
        } else {
            //是否需要打印日志
            if (session.userData.isLogging) {
                console.log('Message Received In Log: ', session.message.text);
            }
            next();
        }
    }
});
