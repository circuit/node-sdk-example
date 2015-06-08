/*
    Copyright (c) 2015 Unify Inc.

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
    OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*jshint node:true */
/*global require */
'use strict';

var config = require('./config.json');
var Circuit = require('circuit');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var FileAPI = require('file-api');
var File = FileAPI.File;

var fs = require('fs');

///////////////////////////////////////////////////////////////////////////////////////////////
// use bunyan to log API 
///////////////////////////////////////////////////////////////////////////////////////////////
var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'test',
    stream: process.stderr,
    level: config.apiLogLevel
});
Circuit.setLogger(logger);

///////////////////////////////////////////////////////////////////////////////////////////////
// Test 
///////////////////////////////////////////////////////////////////////////////////////////////
var Test = function () {
    'user strict';
    var self = this;
    self.user = null;               // logged on user for Test
    self.conv = null;               // test conversation 
    self.userEvtListeners = {};     // user event listeners

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // addCircuitEventListeners
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.addCircuitEventListeners = function addCircuitEventListeners() {
        console.info('-- addCircuitEventListeners');
        Circuit.addEventListener('registrationStateChange', self.onRegistrationStateChange);
        self.emit('circuitEventListenersAdded'); 
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // logon
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.logon = function logon() {
        console.info('-- logon');
        Circuit.logon(config.user, config.password, config.domain).then(function logonSuccess (user) {
            self.user=user;
            console.info('-- logon success');
            self.emit('loggedOn');
        }, function logonError (err) {
            var error = new Error('logon failure "%s"', err);
            self.emit('error', error);
        });
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // addUserEventListeners
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.addUserEventListeners = function addUserEventListeners() {
        console.info('-- addUserEventListeners ');
        for (var i in self.userEvtListeners) {
            self.user.addEventListener(i,self.userEvtListeners[i]);
        }
        self.emit('userEventListenersAdded');
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // reconnect
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.reconnect = function reconnect() {
        console.info('-- reconnect ');
            console.info('-- logout ');
            self.user.logout();
            self.user = null;
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // getConversation
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.getConversation = function getConversation() {
        console.info('-- getConversation ', config.testConv);
        self.user.getConversation(config.testConv, function getConversationCallback(err, conv) {
            console.log('-- getConversationCallback ');
            if (err) {
                var error = new Error('COULD NOT GET CONVERSATION "%s"', err);
                self.emit('error', error);
                return;
            }
            self.conv = conv;
            self.emit('gotConversation');
        });
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // sendMessage
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.sendMessage = function sendMessage() {
         console.info('-- sendMessage ');
         self.conv.sendMessage('send message test', function sendMessageCallback(err, item) {
            console.log('-- sendMessageCallback ');
            if (err) {
                var error = new Error('COULD NOT SEND MESSAGE "%s"', err);
                self.emit('error', error);
                return;
            }
            self.emit('messageSent',item);
        });
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // uplaodFiles
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.uplaodFiles = function uploadFiles() {
        console.info('-- uploadFiles ');
        var files = [];
        var path = config.filesPath;

        var fileNames = fs.readdirSync(path);
        fileNames.forEach(function(element){
            var file = new File(path + element);
            files.push(file);           
        });

        var message = {text: 'file upload test', files: files};
        console.info('message :' + JSON.stringify(message, ' ', 2));

         self.conv.sendMessage(message, function uploadFilesCallback(err, item) {
            console.log('-- uploadFilesCallback ');
            if (err) {
                var error = new Error('UPLOADFILES - COULD NOT SEND MESSAGE "%s"', err);
                self.emit('error', error);
                return;
            }
            self.emit('filesUploaded',item);
        });
    };    

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // sendComment
    ///////////////////////////////////////////////////////////////////////////////////////////////
    this.sendComment = function sendComment(parentItemId) {
        console.info('-- sendComment ', parentItemId);
        self.conv.sendComment(parentItemId, 'send comment test', function sendCommentCallback(err, item) {
            console.log('-- sendCommentCallback ');
            if (err) {
                var error = new Error('COULD NOT SEND COMMENT "%s"', err);
                self.emit('error', error);
                return;
            }
            self.emit('commentSent',item);
        });
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // onRegistrationStateChange
    ///////////////////////////////////////////////////////////////////////////////////////////////    this.onRegistrationStateChange = function (evt) {
    this.onRegistrationStateChange = function onRegistrationStateChange(evt) {
        console.info('-- onRegistrationStateChange ', evt.state);
        if (evt.state === 'Disconnected'){
          self.emit('disconnected');  
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // onItemAdded
    ///////////////////////////////////////////////////////////////////////////////////////////////    this.onRegistrationStateChange = function (evt) {
    this.onItemAdded = function  onItemAdded(evt) {
        console.info('-- onItemAdded ', evt.item.text);
        self.emit('itemAdded', evt.item);
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // onItemChanged
    ///////////////////////////////////////////////////////////////////////////////////////////////    this.onRegistrationStateChange = function (evt) {
    this.onItemChanged = function  onItemChanged(evt) {
        console.info('-- onItemChanged ', evt.item.text);
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // onRenewTokenError
    ///////////////////////////////////////////////////////////////////////////////////////////////    this.onRegistrationStateChange = function (evt) {
    this.onRenewTokenError = function  onRenewTokenError() {
        console.info('-- onRenewTokenError ');
        this.reconnect();
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // add user listeners to be registered
    /////////////////////////////////////////////////////////////////////////////////////////////// 
    this.userEvtListeners.itemAdded = this.onItemAdded;
    this.userEvtListeners.itemUpdated = this.onItemChanged;
    this.userEvtListeners.renewTokenError = this.onRenewTokenError;
};

util.inherits(Test, EventEmitter);


///////////////////////////////////////////////////////////////////////////////////////////////
// runTest 
///////////////////////////////////////////////////////////////////////////////////////////////
function runTest() {
    var test = new Test();

    test.on('circuitEventListenersAdded', function () {
        console.info('-- circuitEventListenersAdded');
        this.logon();
    });

    test.on('loggedOn', function () {
        console.info('-- loogedOn');
        this.addUserEventListeners();
    });

    test.on('userEventListenersAdded', function () {
        console.info('-- userEventListenersAdded');
        this.getConversation();
    });     

    test.on('gotConversation', function () {
        console.info('-- gotConversation');
        this.uplaodFiles();

    });    

    test.on('messageSent', function (item) {
        console.info('-- message sent ' + item.itemId);
    });  

    test.on('commentSent', function (item) {
        console.info('-- comment sent ' + item.itemId);
    });

    test.on('filesUploaded', function (item) {
        console.info('-- filesUploaded ' + item.itemId);
        this.sendMessage();

    }); 

    test.on('itemAdded', function (item) {
        console.info('-- itemAdded ' + item.itemId);

        if(item.parent){
            console.info('-- parent ' + item.parent.itemId);
            return;
        }
        this.sendComment(item.itemId);
    });   

    test.on('disconnected', function () {
        console.info('-- disconnected');
        global.setTimeout(this.logon, config.minLogonInterval);
    });

    test.on('error', function (err) {
        console.error('-- test failed ');
        console.error('-- test failed: ' + err.message);
        console.error(err.stack);
        process.exit(1);
    });

    test.addCircuitEventListeners();

}

runTest();
