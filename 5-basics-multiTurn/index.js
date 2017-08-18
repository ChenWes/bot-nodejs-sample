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
var companyData = require('./companyData.json');

var bot = new builder.UniversalBot(connector, function (session) {
    // Simply defer to help dialog for un-recognized intents
    session.beginDialog('helpDialog');
});

// Add global recognizer for LUIS model (run for every message)
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=56c73d36-e6de-441f-b2c2-6ba7ea73a1bf&subscription-key=6d0966209c6e4f6b835ce34492f3e6d9&q=';
bot.recognizer(new builder.LuisRecognizer(model));

// Answer help related questions like "what can I say?"
bot.dialog('helpDialog', function (session) {
    // Send help message and end dialog.
    session.endDialog('helpMessage');
}).triggerAction({ matches: 'Help' });

// Answer acquisition related questions like "how many companies has microsoft bought?"
bot.dialog('acquisitionsDialog', function (session, args) {
    // Any entities recognized by LUIS will be passed in via the args.
    var entities = args.intent.entities;

    // Call common answer dialog
    session.beginDialog('answerDialog', {
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'acquisitions',
        template: 'answerAcquisitions'
    });
}).triggerAction({ matches: 'Acquisitions' });

// Answer IPO date related questions like "when did microsoft go public?"
bot.dialog('ipoDateDialog', function (session, args) {
    var entities = args.intent.entities;
    session.beginDialog('answerDialog', {
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'ipoDate',
        template: 'answerIpoDate'
    });
}).triggerAction({ matches: 'IpoDate' });

// Answer headquarters related questions like "where is microsoft located?"
bot.dialog('headquartersDialog', function (session, args) {
    var entities = args.intent.entities;
    session.beginDialog('answerDialog', {
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'headquarters',
        template: 'answerHeadquarters'
    });
}).triggerAction({ matches: 'Headquarters' });

// Answer description related questions like "tell me about microsoft"
bot.dialog('descriptionDialog', function (session, args) {
    var entities = args.intent.entities;
    session.beginDialog('answerDialog', {
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'description',
        template: 'answerDescription'
    });
}).triggerAction({ matches: 'Description' });

// Answer founder related questions like "who started microsoft?"
bot.dialog('foundersDialog', function (session, args) {
    var entities = args.intent.entities;
    session.beginDialog('answerDialog', {
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'founders',
        template: 'answerFounders'
    });
}).triggerAction({ matches: 'Founders' });

// Answer website related questions like "how can I contact microsoft?"
bot.dialog('websiteDialog', function (session, args) {
    var entities = args.intent.entities;
    session.beginDialog('answerDialog', {
        company: builder.EntityRecognizer.findEntity(entities, 'CompanyName'),
        field: 'website',
        template: 'answerWebsite'
    });
}).triggerAction({ matches: 'Website' });

// Common answer dialog. It expects the following args:
// {
//      field: string;
//      template: string;   
//      company?: IEntity;
// }
bot.dialog('answerDialog', [
    function askCompany(session, args, next) {
        // Save args passed to dialogData which remembers them for just this answer.
        session.dialogData.args = args;

        // Validate company passed in
        var company, isValid;
        if (args.company) {
            company = args.company.entity.toLowerCase();
            isValid = companyData.hasOwnProperty(company);
        } else if (session.privateConversationData.company) {
            // Use valid company selected in previous turn
            company = session.privateConversationData.company;
            isValid = true;
        }
       
        // Prompt the user to pick a company if they didn't specify a valid one.
        if (!isValid) {
            // Lets see if the user just asked for a company we don't know about.
            var txt = args.company ? session.gettext('companyUnknown', { company: args.company }) : 'companyMissing';
            
            // Prompt the user to pick a company from the list. This will use the
            // keys of the companyData map for the choices.
            builder.Prompts.choice(session, txt, companyData);
        } else {
            // Great! pass the company to the next step in the waterfall which will answer the question.
            // * This will match the format of the response returned from Prompts.choice().
            next({ response: { entity: company } });
        }
    },
    function answerQuestion(session, results) {
        // Get args we saved away
        var args = session.dialogData.args;

        // Remember company for future turns with the user
        var company = session.privateConversationData.company = results.response.entity;

        // Reply to user with answer
        var answer = { company: company, value: companyData[company][args.field] };
        session.endDialog(args.template, answer);
    }
]).cancelAction('cancelAnswer', "cancelMessage", { matches: /^cancel/i });