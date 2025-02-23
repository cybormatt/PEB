const logger = require("../lib/logger.js");

var client;

module.exports = {
    name: "interactionCreate",
    once: false,
    init() {
        client = this.client;
    },
    async execute(interaction) {
        if (!interaction.isCommand()) return;

        const command = client.commands[interaction.commandName];

        if (!command) return;

        try {
            var channel;
            var guild;

            if (interaction.channel.type == "DM") {
                channel = "<DM>";
                guild = "N/A";
            }
            else {
                channel = `(${interaction.channel.id}) #${interaction.channel.name}`;
                guild = `(${interaction.guild.id}) ${interaction.guild.name}`;
            }

            const message = "\n*** Slash command activated:\n" +
                "  Date/Time: " + (new Date).toString() + "\n" +
                `  Command: ${interaction.commandName}\n` +
                `  User: (${interaction.user.id}) @${interaction.user.username}\n` +
                `  Channel: ${channel}\n` +
                `  Server: ${guild}\n`;

            logger.info(message);
            await command.execute(interaction);
        }
        catch (err) {
            logger.error("*** Error in executing slash command: " + err.stack);
            await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true })
                .catch(err => { });
        }
    }
}