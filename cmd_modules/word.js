const logger = require("../lib/logger.js");

var client;

module.exports = {
    name: "word",
    init() {
        client = this.client
    }
}