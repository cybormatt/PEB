const logger = require("../lib/logger.js");
const CONFIG = require("../config.json");

var client;
const pre = CONFIG.Prefix;

module.exports = {
    name: "help",
    init() {
        client = this.client
    },
    async execute(interaction) {
        const embed = {
            title: "Psychic Experiment Bot",
            description: "Psychic Experiment Bot is a tool to help two people set up a psychic experiment.  Here's how the game play works:\n\n" +
                "1. The first person starts the game and supplies the second person as an option.\n" +
                "2. The first person selects whether they are the psychic or the subject.\n" +
                "3. The second person supplies a number or word.\n" +
                "4. The psychic guesses the number or word.\n" +
                "5. The bot logs the results and the game is complete.\n\n" +
                "Here are a list of commands:\n\n" +
                `**📰 About**  \`${pre}peb about\`– About page\n\n` +
                `**🍡 Number** \`${pre}peb number @user2\`– Play by number.  User 2 is the other player.\n\n` +
                `**💰 Word** \`${pre}peb word @user2\`– Play by word.  User 2 is the other player.\n\n` +
                `**📈 Statistics**  \`${pre}peb stats\`\n`,
            color: 0x2ecc71
        };

        interaction.reply({ embeds: [embed] });
    }
}