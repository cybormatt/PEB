const { CommandBuilder } = require("../lib/CommandBuilder.js");
const logger = require("../lib/logger.js");
const { PermissionFlagsBits } = require('discord.js');

var client;

module.exports = {
    init() {
        client = this.client;
    },
    data: new CommandBuilder()
        .setGlobal(false)
        .setCommandType(CommandBuilder.MESSAGE_COMMAND)
        .setCommandType(CommandBuilder.BOT_ADMIN_COMMAND)
        .setName("deploy")
        .setDescription("Deploys the application slash commands")
        .setSyntax("deploy <guild|global>")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName("target").setDescription("The type of deployment to target ('global' or 'guild')")),
    async execute(...argv) {
        if (argv.length == 1) {
            handleInteraction(...argv);
        }
        else throw new Error(`Unrecognized signature!`);
    }
}

async function handleInteraction(interaction) {
    var target = interaction.options.getString("target");

    if (!target) target = "guild";


    if (target.toLowerCase() == "guild") {
        var guildId = interaction.guild?.id;

        try {
            await client.cmd_modules.deploy.deployToGuild(guildId);
            interaction.reply("Successfully deployed to guild " + interaction.guild?.name);
        }
        catch (err) {
            logger.error("*** Error in deploying to guild '" + interaction.guild.name + "': " + err);
            interaction.reply("Error depoying to guild '" + interaction.guild.name + "': " + err);
        }
    }
    else if (target.toLowerCase() == "global") {
        client.cmd_modules.deploy.deployGlobal()
            .then(() => {
                interaction.reply("Succesfully deployed global commands.");
            })
            .catch(err => {
                interaction.reply("There was an error in deploying the global commands: " + err);
            });
    }
    else {
        interaction.reply("Invalid option!");
    }
}