# node-sdk-example
Example for the [circuit-sdk](https://github.com/circuit/circuit-sdk).
The example shows how to logon to circuit, register for events, lookup a conversation, send a message/reply, attach files to a message and more.


## Requirements ##
* [node 8.x](http://nodejs.org/download/)


## Getting Started ##

### Use your own bot credentials (optional)
* [Register an account](https://circuit.github.io/) on circuitsandbox.net and create two bots. See details on [Developer Portal](https://circuit.github.io/)
* Update config.json accordingly

### Run the app

```bash
    git clone https://github.com/circuit/node-sdk-example.git
    cd node-sdk-example
    npm install
    node index
```

You may login as maeva.barnaby@mailinator.com to https://circuitsandbox.net and verify the sent messages.

> Hint: pipe the logs to bunyan to get a nicer console output: `node index | node_modules/.bin/bunyan`




