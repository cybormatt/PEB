const logger = require("../lib/logger.js");

var client;

module.exports = {
    name: "stats",
    init() {
        client = this.client
    }
}