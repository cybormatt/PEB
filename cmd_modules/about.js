const logger = require("../lib/logger.js");

var client;

module.exports = {
    name: "about",
    init() {
        client = this.client
    }
}