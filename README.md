# node-sdk-example
Example for the [circuit-node-sdk](https://github.com/circuit/circuit-node-sdk). 
The example shows how to logon to circuit, register for events, lookup a conversation, send a message, attach files to a message, send a comment.


## Requirements ##
* [node 4.x](http://nodejs.org/download/)


## Getting Started ##

```bash
    git clone https://github.com/circuit/node-sdk-example.git
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
    node index
``` 



 
