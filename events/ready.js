const logger = require("../lib/logger.js");
const CONFIG = require("../config.json");

var client;
module.exports = {
    name: "ready",
    once: true,
    init() {
        client = this.client;
    },
    execute(_client) {
        var d = new Date(Date.now());
        logger.info(`*** ${d.toISOString()} Logged in as ${client.user.tag}!`);

        logger.info("*** Setting bot activity status...");
    }
}