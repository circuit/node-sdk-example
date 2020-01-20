/**
 *  Copyright 2020 Unify Software and Solutions GmbH & Co.KG.
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

const config = require('./config.json');
const bunyan = require('bunyan');
const util = require('util');
const assert = require('assert');
const url = require('url');
const fs = require('fs');
const Circuit = require('circuit-sdk');

(async () => {
    let client1, client2; // client instances
    const bot1Email = config.bots[0].email;
    const bot2Email = config.bots[1].email;
    const user1Email = config.users[0];
    const user2Email = config.users[1];


    // Create SDK logger
    const sdkLogger = bunyan.createLogger({
        name: 'sdk',
        stream: process.stdout,
        level: config.sdkLogLevel
    });

    // Create application logger
    const logger = bunyan.createLogger({
        name: 'app',
        stream: process.stdout,
        level: 'info'
    });

    logger.info('[APP]: Circuit set bunyan logger');
    Circuit.setLogger(sdkLogger);

    // Create proxy agent to be used by SDKs WebSocket and HTTP requests if needed
    if (process.env.http_proxy) {
        const HttpsProxyAgent = require('https-proxy-agent');
        Circuit.NodeSDK.proxyAgent = new HttpsProxyAgent(url.parse(process.env.http_proxy));
        logger.info(`Using proxy ${process.env.http_proxy}`)
    }

    // Helper function
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function logonBots() {
        logger.info('[APP]: Create SDK client instances');
        const clients = [];

        const logonPromises = config.bots.map(bot => {
            // Use Client Credentials grant for bots
            const client = new Circuit.Client({
                client_id: bot.client_id,
                client_secret: bot.client_secret,
                domain: config.domain,
                scope: config.scope
            });
            clients.push(client);
            addEventListeners(client);  // register SDK event listeners
            return client.logon();
        });

        // Wait until all bots are logged on
        const bots = await Promise.all(logonPromises);
        bots.forEach(bot => logger.info(`[APP]: Bot ${bot.displayName} logged on`));
        return clients;
    };

    function addEventListeners(client) {
        logger.info(`[APP]: addEventListeners for bot`);
        // Just log the events
        Circuit.supportedEvents.forEach(e => client.addEventListener(e, evt => {
            logger.info(`[APP]: ${evt.type} event received`);
            logger.debug('[APP]:', util.inspect(evt, { showHidden: true, depth: null }));
        }));
    };

    /** 
     * Scenario:    
     *  Bot 1 looks up the direct conversation with bot 2 (create conversation if not existing)
     *  Bot 1 sends a message to bot 2
     *  Bot 1 updates message sent to bot 2
     *  Bot 2 responds with a comment
     */
    async function sendMessageDirect() {
        logger.info('[APP]: sendMessageDirect');

        const conversation = await client1.getDirectConversationWithUser(bot2Email, true);
        logger.info(`[APP]: Direct conversation: ${conversation.convId}`);
        
        let item = await client1.addTextItem(conversation.convId, `Hello from ${bot1Email}`);
        logger.info(`[APP]: Bot1 sent message. ItemId: ${item.itemId}`);
        
        item = await client1.updateTextItem({
            itemId: item.itemId,
            subject: 'Greetings',
            content: `Hello from <b>${bot1Email}</b>!`
        });
        logger.info(`[APP]: Bot1 updated message. ItemId: ${item.itemId}`);

        item = await client2.addTextItem(item.convId, {
            convId: item.convId,
            parentId: item.itemId,
            content: `Hello from ${bot2Email}`
        });
        logger.info(`[APP]: Bot2 replied to message. ItemId: ${item.itemId}`);
    };

    /** 
     * Scenario:    
     *  Bot 1 creates new group conversation with bot 2
     *  Bot 1 adds two other users to conversation with first looking up their userId by email
     *  Bot 1 post a message with mentioning user
     *  Bot 1 removes bot 2 from conversation
     */
    async function sendMessageGroup() {
        logger.info('[APP]: sendMessageDirect');
        const bot2UserId = client2.loggedOnUser.userId;

        const conversation = await client1.createGroupConversation([bot2UserId], 'node-sdk-example group');
        logger.info(`[APP]: Group conversation created: ${conversation.convId}`);
        
        const users = await client1.getUsersByEmail([user1Email, user2Email]);
        const userIds = users.map(u => u.userId);
        await client1.addParticipant(conversation.convId, userIds);
        logger.info(`[APP]: Users added to conversation: ${userIds}`);
        
        let item = await client1.addTextItem(conversation.convId,
            `<span class="mention" abbr="${users[0].userId}">@${users[0].firstName}</span>, check this link <a href="http://github.com/circuit">Circuit on github</a>`);
        logger.info(`[APP]: Bot1 sent message. ItemId: ${item.itemId}`);

        await client1.removeParticipant(conversation.convId, [userIds[1]]);
        logger.info('[APP]: User 2 removed from conversation');

        return { conversation, item };
    };

    /** 
     * Scenario:    
     *  Bot 1 reads local files and uploads them to conversation
     */
    async function postFiles(conversation) {
        const path = config.filesPath;
        const files = [];
        const fileNames = fs.readdirSync(path);
        fileNames.forEach(name => {
            const file = new Circuit.File(path + name);
            files.push(file);
        });

        const item = await client1.addTextItem(conversation.convId, {
            content: 'test file upload',
            attachments: files
        });
        logger.info(`[APP]: Bot1 posted ${item.attachments.length} files to item ${item.itemId}`);
    }

    /** 
     * Scenario:    
     *  Bot 1 gets full presence of bot2
     *  Bot 1 subscribes to presence changes of bot2
     *  Bot 2 changes presence to AWAY
     *  Bot 2 receives presence change event (note this is a second event listener registered in
     *  addition to the ones registered in addEventListeners function)
     *  Bot 2 removes presence subscription
     */
    async function presenceTest(conversation) {
        const bot2UserId = client2.loggedOnUser.userId;

        const presence = await client1.getPresence([bot2UserId], true);
        logger.info('[APP]: Bot2 presence is:', util.inspect(presence[0], { showHidden: true, depth: null }));

        const handleEvt = async evt => 
            client1.addTextItem(conversation.convId, util.inspect(evt, { showHidden: true, depth: null }));
        client1.addEventListener('userPresenceChanged', handleEvt);

        await client1.subscribePresence([bot2UserId]);
        logger.info('[APP]: Bot1 subscribed to presence changes of bot2');

        await client2.setPresence({
            state: Circuit.Enums.PresenceState.DND,
            dndUntil: Date.now() + 5000
        });
        logger.info('[APP]: Bot2 presence set to DND for 5 sec');

        // Wait a second before unsubscribing so backend has time to send events,
        // then change presence back to AVAILABLE
        await sleep(1000);
        await client1.unsubscribePresence([bot2UserId]);
        client1.removeEventListener('userPresenceChanged', handleEvt);
        logger.info('[APP]: Bot1 unsubscribed to presence changes of bot2');

        await client2.setPresence({ state: Circuit.Enums.PresenceState.AVAILABLE });
        logger.info('[APP]: Bot2 presence changed to AVAILABLE');

    }

    /**
     * Start
     */
    try {
        [client1, client2] = await logonBots();

        // Send direct messages
        await sendMessageDirect();

        // Create group conversation, add participants and post message
        const { conversation, item } = await sendMessageGroup();

        // Mark items before NOW on conversation as read for bot 1
        await client1.markItemsAsRead(conversation.convId);

        // Like & flag
        await client1.likeItem(item.itemId);
        await client1.flagItem(conversation.convId, item.itemId);

        // Post files
        await postFiles(conversation);

        // Get/set presence, subscribe/unsubscribe to presence events and handle presence events
        await presenceTest(conversation);

    } catch (err) {
        logger.error(`[APP]: Error ${err.message}`, err.stack);
    }
})();



