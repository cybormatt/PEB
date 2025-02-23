const logger = require("../lib/logger.js");
const { CommandBuilder } = require("../lib/CommandBuilder.js")
const { PermissionFlagsBits } = require('discord.js');

var client;

module.exports = {
    init() {
        client = this.client;
    },
    data: new CommandBuilder()
        .setGlobal(false)
        .setCommandType(CommandBuilder.MESSAGE_COMMAND)
        .setCommandType(CommandBuilder.SLASH_COMMAND)
        .setName("peb")
        .setDescription("The Psycic Experiment Bot (PEB) command")
        .setSyntax("peb <sub_command>")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addSubcommand(sc => sc.setName("help").setDescription("Shows the PEB command help"))
        .addSubcommand(sc => sc.setName("about").setDescription("Shows the PEB about page"))
        .addSubcommand(sc => sc.setName("number")
            .addUserOption(sc => sc.setName("user2").setDescription("The other user who will join the experiment"))
            .setDescription("Start a number guessing experiment"))
        .addSubcommand(sc => sc.setName("word")
            .addUserOption(sc => sc.setName("user2").setDescription("The other user who will join the experiment"))
            .setDescription("Start a word guessing experiment"))
        .addSubcommand(sc => sc.setName("stats")
            .addStringOption(sc => sc.setName("startdate").setDescription("The start date for the stats").setRequired(false))
            .addStringOption(sc => sc.setName("enddate").setDescription("The end date for the stats").setRequired(false))
            .setDescription("Show your stats for the PEB game")),
    async execute(interaction) {
        var sc = interaction.options.getSubcommand();

        if (sc == "help") client.cmd_modules.help(interaction);
        else if (sc == "about") client.cmd_modules.about(interaction);
        else if (sc == "number") client.cmd_modules.number.initiateGame(interaction);
        else if (sc == "stats") await client.cmd_modules.stats.getStats(interaction);
        else if (sc == "word") client.cmd_modules.word.initiateGame(interaction);
            
        else interaction.reply("Unrecognized feature!");
    }
}