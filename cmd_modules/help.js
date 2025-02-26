const logger = require("../lib/logger.js");

var client;

module.exports = {
    name: "help",
    init() {
        client = this.client
    },
    async execute(interaction) {
        interaction.reply("hello");
    }
}