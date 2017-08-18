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

//循环的瀑布流，循环问题的数组，一个接着一个提问并回复
//有两种处理方式，如果完成了则直接返回参数至上一级，如果问题还没有完成，则使用replaceDialog重新回到dialog，并处理下一个问题
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog('q&aDialog');
    },
    function (session, results) {
        session.send("Thanks %(name)s... You're %(age)s and located in %(state)s.", results.response);
    }
]);

// Add Q&A dialog
bot.dialog('q&aDialog', [
    function (session, args) {
        // Save previous state (create on first call)
        session.dialogData.index = args ? args.index : 0;
        session.dialogData.form = args ? args.form : {};

        // Prompt user for next field
        builder.Prompts.text(session, questions[session.dialogData.index].prompt);
    },
    function (session, results) {
        // Save users reply
        var field = questions[session.dialogData.index++].field;
        session.dialogData.form[field] = results.response;

        // Check for end of form
        if (session.dialogData.index >= questions.length) {
            // Return completed form
            session.endDialogWithResult({ response: session.dialogData.form });
        } else {
            // Next field
            session.replaceDialog('q&aDialog', session.dialogData);
        }
    }
]);

var questions = [
    { field: 'name', prompt: "What's your name?" },
    { field: 'age', prompt: "How old are you?" },
    { field: 'state', prompt: "What state are you in?" }
];