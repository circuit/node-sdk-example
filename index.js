/**
 *  Copyright 2017 Unify Software and Solutions GmbH & Co.KG.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/*jshint node:true */
/*global require, Promise */

'use strict';

// Load configuration
var config = require('./config.json');

// Logger
var bunyan = require('bunyan');

// SDK logger
var sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.sdkLogLevel
});

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'info'
});

// Node utils
var util = require('util');
var assert = require('assert');

// For file upload tests
var FileAPI = require('file-api');
var File = FileAPI.File;
var fs = require('fs');

// Circuit SDK
logger.info('[APP]: get Circuit instance');
var Circuit = require('circuit-node-sdk');

logger.info('[APP]: Circuit set bunyan logger');
Circuit.setLogger(sdkLogger);

//*********************************************************************
//* Test
//*********************************************************************
var Test = function() {

    var self = this;
    var clients = new Map(); // key:email -> value:client

    //*********************************************************************
    //* logonBots
    //*********************************************************************
    this.logonBots = function() {
        logger.info('[APP]: create client instances');

        return new Promise(function (resolve, reject) {
            var logonTasks = [];

            config.bots.forEach(bot => {
                logger.info('[APP]: createClient');
                // Use Client Credentials grant for the bots
                var client = new Circuit.Client({
                    client_id: bot.client_id,
                    client_secret: bot.client_secret,
                    domain: config.domain
                });
                self.addEventListeners(client);  // register evt listeners
                clients.set(bot.client_id, client); // add client to the map
                logonTasks.push(client.logon());
            });

            Promise.all(logonTasks)
                .then(results => {
                    results.forEach(result => logger.info(`[APP]: Bot {bot.displayName} logged on`));
                    resolve();
                })
                .catch(reject);
        });
    };

    //*********************************************************************
    //* addEventListeners
    //*********************************************************************
    this.addEventListeners = function(client) {
        logger.info('[APP]: addEventListeners');
        Circuit.supportedEvents.forEach(e => client.addEventListener(e, self.logEvent));
    };

    //*********************************************************************
    //* logEvent -- helper
    //*********************************************************************
    this.logEvent = function(evt) {
        logger.info(`[APP]: ${evt.type} event received`);
        logger.debug('[APP]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* testAddItemsToConversation
    //*********************************************************************
    this.testAddItemsToConversation = function() {
        logger.info('[APP]: testAddItemsToConversation');

        // test scenario:
        // user 1 looks up the direct conversation with user 2
        // if the conversation is not found, user 1 creates a direct conversation
        // user 1 sends a message to user 2
        // user 2 responds with a comment

        return new Promise(function (resolve, reject) {
            var thisConversation = null;

            var bot1ClientId = config.bots[0].client_id;
            var bot2ClientId = config.bots[1].client_id;

            var bot1Email = config.bots[0].email;
            var bot2Email = config.bots[1].email;

            var client1 = self.getClient(bot1ClientId);
            var client2 = self.getClient(bot2ClientId);

            logger.info('[APP]: Bot clientId\'s ', bot1ClientId, bot2ClientId);

            // Could also use getDirectConversationWithUser(bot2Email, true)
            client1.getDirectConversationWithUser(bot2Email)
                .then(conversation => {
                    logger.info('[APP]: checkIfConversationExists');
                    if (conversation) {
                        logger.info('[APP]: conversation exists', conversation.convId);
                        return Promise.resolve(conversation);
                    } else {
                        logger.info('[APP]: conversation does not exist, create new conversation');
                        return client1.createDirectConversation(user2Email);
                    }
                })
                .then(conversation => {
                    logger.info('[APP]: client1AddsTextItem');
                    thisConversation = conversation;
                    return client1.addTextItem(conversation.convId, 'Hello from ' + bot1Email);
                })
                .then(item => {
                    logger.info('[APP]: client2RespondsWithComment');
                    var response = {
                        convId: item.convId,
                        parentId: item.itemId,
                        content: 'Hello from ' + bot2Email
                    };
                    return client2.addTextItem(item.convId, response);
                })
                .then(item => {
                    logger.info('[APP]: returnResults');
                    resolve({ client: client1, conv: thisConversation, item: item });
                })
                .catch(reject);
        });
    };


    //*********************************************************************
    //* testLikes
    //*********************************************************************
    this.testLikes = function(data) {
        logger.info('[APP]: testLikes');
        return new Promise(function (resolve, reject) {
            var client = data.client;
            var item = data.item;
            var conv = data.conv;

            // user likes item
            client.likeItem(item.itemId)

            // user unlikes item
            .then(function unlike() {
                return client.unlikeItem(item.itemId);
            })

            // user likes item again
            .then(function like() {
                return client.likeItem(item.itemId);
            })

            .then(function returnResults() {
                resolve({ client: client, conv: conv, item: item });
            })

            .catch(reject);
        });
    };

    //*********************************************************************
    //* testFlags
    //*********************************************************************
    this.testFlags = function(data) {
        logger.info('[APP]: testFlags');
        return new Promise(function (resolve, reject) {
            var client = data.client;
            var item = data.item;
            var conv = data.conv;

            // user sets flag on item
            client.setFlagItem(conv.convId, item.itemId)

             // user clears flag on item
            .then(function clearFlag() {
                return client.clearFlagItem(conv.convId, item.itemId);
            })

           // user sets flag on item again
            .then(function setFlag() {
                return client.setFlagItem(conv.convId, item.itemId);
            })

            .then(function returnParameters() {
                return resolve(data);
            })

            .catch(reject);
        });
    };

    //*********************************************************************
    //* testMarkAsRead
    //*********************************************************************
    this.testMarkAsRead = function(data) {
        logger.info('[APP]: testMarkAsRead');
        return new Promise(function (resolve, reject) {
            var client = data.client;
            var item = data.item;
            var conv = data.conv;

            client.markItemsAsRead(conv.convId, item.modificationTime)

            .then(function returnPrameters() {
                return resolve(data);
            })

            .catch(reject);
        });
    };

    //*********************************************************************
    //* testPresence
    //*********************************************************************
    this.testPresence = function(data) {
        logger.debug('[APP]: testPresence');
        return new Promise(function (resolve, reject) {
            var client = data.client;
            var userIdsList = [self.getUserId(config.bots[1].client_id)];
            logger.debug('[APP]:', self.getEmail(client), 'subscribes to', userIdsList);

            client.subscribePresence(userIdsList)

            .then (function setPresence() {
                var user2 = config.bots[1].client_id;
                var client2 = self.getClient(user2);
                var presenceState = {state: 'AWAY', dndUntil: 0};
                logger.debug('[APP]: setPresence', presenceState, 'for', user2, self.getUserId(user2));
                return client2.setPresence(presenceState);
            })

            .then (function getPresence() {
                logger.debug('[APP]: getPresence');
                return client.getPresence(userIdsList, false);
            })

            .then (function logPresence(presenceList) {
                logger.debug('[APP]: presenceList\n', util.inspect(presenceList, { showHidden: true, depth: null }));
                return Promise.resolve();
            })

            // .then (function unsubscribePresence(){
            //     logger.debug('[APP]:',self.getEmail(client), 'unsubscribes from', userIdsList);
            //     return client.unsubscribePresence(userIdsList);
            // })

            .then(function returnParameters() {
                logger.debug('[APP]: done with presence tests');
                return resolve(data);
            })

            .catch(reject);
        });
    };

    //*********************************************************************
    //* testFileUpload
    //*********************************************************************
    this.testFileUpload = function(data) {
        logger.debug('[APP]: testFileUpload');
        return new Promise(function (resolve, reject) {
            var conv = data.conv;
            var client = data.client;
            var files = self.getFiles(config.filesPath);
            var message = {content: 'test file upload', attachments: files};

            client.addTextItem(conv.convId, message)

            .then (function returnParameters() {
                return resolve(data);
            })

            .catch(reject);
        });
    };

    //*********************************************************************
    //* sentByMe -- helper
    //*********************************************************************
    this.sentByMe = function(client, item) {
        return (client.loggedOnUser.userId === item.creatorId);
    };

    //*********************************************************************
    //* getEmail -- helper
    //*********************************************************************
    this.getEmail = function(client) {
        return (client.loggedOnUser.emailAddress);
    };

    //*********************************************************************
    //* getUserId -- helper
    //*********************************************************************
    this.getUserId = function(client_id) {
        return clients.get(client_id).loggedOnUser.userId;
    };

    //*********************************************************************
    //* getClient -- helper
    //*********************************************************************
    this.getClient = function(client_id) {
        return clients.get(client_id);
    };

    //*********************************************************************
    //* getFiles -- helper
    //*********************************************************************
    this.getFiles = function(path) {
        var files = [];
        var fileNames = fs.readdirSync(path);
        fileNames.forEach(function (element) {
            var file = new File(path + element);
            files.push(file);
        });
        logger.debug('[APP]: getFiles' + files);
        return files;
    };

    //*********************************************************************
    //* terminate -- helper
    //*********************************************************************
    this.terminate = function(err) {
        var error = new Error(err);
        logger.error('[APP]: Test failed ' + error.message);
        logger.error(error.stack);
        process.exit(1);
    };

    //*********************************************************************
    //* done -- helper
    //*********************************************************************
    this.done = function() {
        logger.info('[APP]: Completed Tests');
    };
};

//*********************************************************************
//* runTest
//*********************************************************************
function runTest() {

    var test = new Test();

    assert(config.bots.length >= 2, 'At least two bots need to be configured in config.json');

    test.logonBots()
       .then(test.testAddItemsToConversation)
       .then(test.testLikes)
// temporary skip since there is an issue with the JS SDK for clearFlag       .then (test.testFlags)
       .then(test.testMarkAsRead)
       .then(test.testPresence)
       .then(test.testFileUpload)
//            ... more tests
       .then(test.done)
       .catch(test.terminate);
}

//*********************************************************************
//* main
//*********************************************************************
runTest();






