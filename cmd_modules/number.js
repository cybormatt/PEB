const logger = require("../lib/logger.js");
const mysql = require("../lib/mysql.js");

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
        await dmChannel.send(`Player ${psychic} in ${interaction.channel} has started a number guessing experiment.  Please type a whole number.`);
    } catch (error) {
        interaction.followUp("Failed to get the number from the subject.");
        logger.error(error);
    }

    const handler = async (message) => {
        client.removeListener("messageCreate", handler);

        let content = message.content;

        if (isNaN(content)) {
            interaction.followUp("The input is not a valid number. Please try again.");
            return;
        }

        const number = parseInt(content);

        await interaction.followUp("Subject has made selection.  Starting game...").ActionRowBuilder
        await dmChannel.send(`Please return to ${interaction.channel} to watch ${psychic} make guesses.`);

        startGame(interaction, number, psychic, subject);
    }

    client.on("messageCreate", handler);
}

function startGame(interaction, number, psychic, subject) {
    const targetNumber = number.toString();
    let attempts = 0;
    let maxScore = 100; // Starting score, reduced based on attempts

    const askForGuess = async () => {
        const handler = async (message) => {
            if (message.author.id != subject.id) return
            client.removeListener("messageCreate", handler);

            attempts += 1;
            const guess = message.content;
            const result = evaluateGuess(targetNumber, guess);

            if (result.correct) {
                const finalScore = calculateScore(attempts, maxScore);
                await interaction.followUp(`Congratulations ${subject}! You guessed the correct number **${targetNumber}** in ${attempts} tries. Your score: ${finalScore}`);

                // Save stats
                saveGameStats(interaction, psychic, subject, targetNumber, attempts, finalScore);
            }
            else {
                await interaction.followUp(`Your guess: ${guess}. ${result.message}. Try again!`);
                askForGuess(); // Ask for the next guess
            }
        }

        client.on("messageCreate", handler);
    }

    const evaluateGuess = (target, guess) => {
        let message = '';
        let correct = false;

        if (guess === target) {
            correct = true;
        } else {
            message = 'Incorrect guess. Here is how close you are: ';
            for (let i = 0; i < target.length; i++) {
                if (target[i] === guess[i]) {
                    message += `Digit ${i + 1} is correct. `;
                } else if (target.includes(guess[i])) {
                    message += `Digit ${i + 1} is in the wrong position. `;
                } else {
                    message += `Digit ${i + 1} is wrong. `;
                }
            }
        }
        return { correct, message };
    };

    const calculateScore = (attempts, maxScore) => {
        return Math.max(maxScore - attempts * 10, 0); // Subtract points based on attempts
    };

    askForGuess(); // Start the guessing loop
}

async function saveGameStats(interaction, psychic, subject, targetNumber, attempts, finalScore) {
    const sql1 = "SELECT MAX(UNIQUE_ID) as MAX_ID FROM STATS";

    var result;
    try {
        result = await mysql.runQuery(sql1);
    }
    catch (error) {
        logger.error("*** Error getting max unique id from stats table ***");
        return;
    }

    var unique_id = result[0].MAX_ID + 1;
    logger.info(`Unique ID: ${unique_id}`);
}