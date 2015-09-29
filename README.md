# node-sdk-example
Example for the [circuit node SDK](https://circuitsandbox.net/sdk/index.html). 
The example shows how to logon to circuit, register for events, lookup a conversation, send a message, attach files to a message, send a comment.

## Beta ##
The circuit SDK and related examples are in Beta. While we are in Beta, we may still make incompatible changes. 

Several changes have been made to the SDK
* APIs return a Promise instead of using a callback
* Support for Presence
* Support for Likes
* Support for Flags
* Support for multiple users
* Reduced dependencies, and footprint
* Improved performance

## Requirements ##
* [node 4.x](http://nodejs.org/download/)
* [circuit module](https://circuitsandbox.net/sdk/)

## Getting Started ##

```bash
    git clone https://github.com/yourcircuit/node-sdk-example.git
    cd node-sdk-example
    cp config.json.template config.json
```

Edit config.json
* Change "user" and "password" for the circuit accounts you'll use to run the example.
    You can request a circuit account at the [Circuit Developer Community Portal](https://www.yourcircuit.com/web/developers).

```bash
"users" : [
        {
            "email"    : "user 1 email",
            "password" : "user 1 password"          
        },
        {
            "email"    : "user 2 email",
            "password" : "user 2 password"          
        }
    ],
``` 
 
 Run the sample application with 
 
```bash
    npm install
    wget https://circuitsandbox.net/circuit.tgz
    npm install circuit.tgz
    node index.js
``` 

 If you do not have wget installed you can use curl to download circuit.tgz
```bash
curl "https://circuitsandbox.net/circuit.tgz" -o "circuit.tgz"
``` 



 
