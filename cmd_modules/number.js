const logger = require("../lib/logger.js");

var client;

module.exports = {
    name: "number",
    init() {
        client = this.client;
    },
    async initiateGame(interaction) {
        var user2 = interaction.options.getUser("user2");

        if (!user2) {
            interaction.reply("You need to specify the other user who will join the experiment");
            return;
        }

        if (user2.id == interaction.user.id) {
            interaction.reply("You can't play with yourself!");
            return;
        }

        var user1 = interaction.user;

        interaction.reply("Are you the 'psychic' or the 'subject'? Please type 'p' or 's'.");

        const handler = async (message) => {
            client.removeListener("messageCreate", handler);

            let role = message.content.toLowerCase();

            var subject;
            var psychic;
            if (role == 'p') {
                subject = user2;
                psychic = user1;
            }
            else if (role == 's') {
                subject = user1;
                psychic = user2;
            }
            else {
                interaction.followUp("Invalid role. Please type 'p' or 's'.");
                return;
            }
            
            // Get the number from the subject
            getNumber(interaction, psychic, subject);

        }

        client.on("messageCreate", handler);
    }
}

async function getNumber(interaction, psychic, subject) { 
    try {
        const dmChannel = await subject.createDM();
        await dmChannel.send(`Player ${psychic} in ${interaction.channel} has started a number guessing experiment.  Please type a number.`);

        const handler = async (message) => {

        }

        const filter = response => response.author.id === subject.id;
        const collected = await dmChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });

        const number = collected.first().content;
        interaction.followUp(`The subject has chosen the number: ${number}`);
    } catch (error) {
        interaction.followUp("Failed to get the number from the subject.");
        logger.error(error);
    }
}