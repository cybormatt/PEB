const logger = require("../lib/logger.js");
const { CommandBuilder } = require("../lib/CommandBuilder.js")
const { PermissionFlagsBits } = require('discord.js');

var client;

module.exports = {
    init() {
        client = this.client;
    },
    data: new CommandBuilder()
        .setGlobal(true)
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
            .setDescription("Start a number guessing experiment in the current channel"))
        .addSubcommand(sc => sc.setName("word")
            .addUserOption(sc => sc.setName("user2").setDescription("The other user who will join the experiment"))
            .setDescription("Start a word guessing experiment in the current channel"))
        .addSubcommand(sc => sc.setName("stats")
            .addStringOption(sc => sc.setName("startdate").setDescription("The start date for the stats").setRequired(false))
            .addStringOption(sc => sc.setName("enddate").setDescription("The end date for the stats").setRequired(false))
            .setDescription("Show your stats for the PEB game"))
        .addSubcommand(sc => sc.setName("stopnum").setDescription("Stop the current number experiment in the current channel"))
        .addSubcommand(sc => sc.setName("stopword").setDescription("Stop the current word experiment in the current channel")),
    async execute(interaction) {
        var sc = interaction.options.getSubcommand();

        if (sc == "help") client.cmd_modules.help(interaction);
        else if (sc == "about") client.cmd_modules.about(interaction);
        else if (sc == "number") {
            if (client.cmd_modules.word.checkStatus(interaction)) {
                interaction.reply("There is already an experiment in progress in this channel.");
                return;
            }

            client.cmd_modules.number.start(interaction);
        }
        else if (sc == "stats") await client.cmd_modules.stats(interaction);
        else if (sc == "word") {
            if (client.cmd_modules.number.checkStatus(interaction)) {
                interaction.reply("There is already an experiment in progress in this channel.");
                return;
            }

            client.cmd_modules.word.start(interaction);
        }
        else if (sc == "stopnum") {
            if (client.cmd_modules.number.checkStatus(interaction))
                client.cmd_modules.number.stop(interaction)
                    .catch(err => logger.info("Error in stopping number game: " + err.stack));
            else
                interaction.reply("There is no number experiment in progress in this channel.")
                    .catch(err => logger.info("Error in stopping number game: " + err.stack));
        }
        else if (sc == "stopword") {
            if (client.cmd_modules.word.checkStatus(interaction))
                client.cmd_modules.word.stop(interaction);
            else
                interaction.reply("There is no word experiment in progress in this channel.")
                    .catch(err => logger.info("Error in stopping word game: " + err.stack));
        }
        else interaction.reply("Unrecognized feature!");
    }
}