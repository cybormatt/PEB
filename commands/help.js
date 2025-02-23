const {CommandBuilder} = require("../lib/CommandBuilder.js");
const logger = require("../lib/logger.js");
const { PermissionFlagsBits } = require('discord.js');
const { init } = require("./peb.js");

var client;

module.exports = {
    init() {
        client = this.client;
    },
    data: new CommandBuilder()
        .setGlobal(false)
        .setCommandType(CommandBuilder.MESSAGE_COMMAND)
        .setCommandType(CommandBuilder.SLASH_COMMAND)
        .setName("help")
        .setDescription("Shows the help page")
        .setSyntax("help <command>")
        .setSyntax("help")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption(option => 
            option.setName('command')
                .setDescription('The command to get help for')
                .setRequired(false)
    ),
    async execute(interaction) {
        var cmd = interaction.options.getString("command");

        if (cmd) {
            if (client.commands[cmd]) {
                interaction.reply("```" + client.commands[cmd].data.toString() + "```");
            }
            else {
                interaction.reply("Command '" + cmd + "' not found!");
            }
        }
        else {
            var help = "```";
            for (var key in client.commands) {
                help += client.commands[key].data.name + "\n";
            }
            help += "```";
            interaction.reply(help);
        }
    }
};