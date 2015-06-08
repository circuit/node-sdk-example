# node-sdk-example
Example for the [circuit node SDK](https://circuitsandbox.net/sdk/index.html). 
The example shows how to logon to circuit, register for events, lookup a conversation, send a message, attach files to a message, send a comment.

## Beta ##
The circuit SDK and related examples are in Beta. While we are in Beta, we may still make incompatible changes. 

## Requirements ##
* [node 0.12.x or higher](http://nodejs.org/download/)
* circuit module

## Getting Started ##

```bash
    git clone https://github.com/yourcircuit/node-sdk-example.git
    cd node-sdk-example
    cp config.json.template config.json
```

Edit config.json
* Change "user" and "password" to the circuit account you'll use for the example.
    you can request a circuit account at the [Circuit Developer Community Portal](https://www.yourcircuit.com/web/developers).
* Change "testConv" to the ID of a conversation you created using the circuit client. The conversation ID is included in the conversation URL you see in the browser e.g. ff2736ad-eeca-4557-b9c1-e799416d4556 for https://circuitsandbox.net/#/conversation/ff2736ad-eeca-4557-b9c1-e799416d4556.

```bash
    "user"               : "your circuit user ID",
    "password"           : "your circuit password",
    "testConv"           : "your test conversation ID",
    
``` 
 
 Run the sample application with 
 
```bash
    npm install
    wget https://circuitsandbox.net/circuit.tgz
    npm install circuit.tgz
    node index.js
``` 


 


 
