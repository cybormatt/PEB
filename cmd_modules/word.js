const logger = require("../lib/logger.js");
const mysql = require("../lib/mysql.js");

var client;

module.exports = {
    name: "word",
    init() {
        client = this.client
    },
    async execute(interaction) {
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
            if (message.author.id != user1.id) return

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

            interaction.followUp(`Please wait while I get the word from ${subject}...`);

            // Get the word from the subject
            getWord(interaction, psychic, subject);

        }

        client.on("messageCreate", handler);
    }
}

async function getWord(interaction, psychic, subject) {
    const dmChannel = await subject.createDM();
    try {
        await dmChannel.send(`Player ${psychic} in ${interaction.channel} has started a word guessing experiment.  Please type a word.`);
    } catch (error) {
        interaction.followUp("Failed to get the word from the subject.");
        logger.error(error);
    }

    const handler = async (message) => {
        if (message.author.id != subject.id && message.guild) return;

        client.removeListener("messageCreate", handler);

        let content = message.content;

        await interaction.followUp("Subject has made selection.  Starting game...");
        await dmChannel.send(`Please return to ${interaction.channel} to watch ${psychic} make guesses.`);

        startGame(interaction, content, psychic, subject);
    }

    client.on("messageCreate", handler);
}

function startGame(interaction, word, psychic, subject) {
    let attempts = 0;

    const askForGuess = async () => {
        const handler = async (message) => {
            if (message.author.id != psychic.id) return;

            client.removeListener("messageCreate", handler);

            attempts++;
            const guess = message.content;
            const result = evaluateGuess(word, guess);

            if (result.correct) {
                const score = Math.max(0, 100 - (attempts - 1) * 10);
                await interaction.followUp(`🎉 Congratulations ${psychic}, you guessed the word "${word}" correctly in ${attempts} tries! Your score is ${score}.`);

                // Save stats
                saveGameStats(interaction, psychic, subject, word, attempts, score);

            } else {
                await interaction.followUp(`Your guess: ${guess}. ${result.feedback}. Try again!`);
                askForGuess(); // Ask for the next guess
            }

        }

        client.on("messageCreate", handler);
    }

    const evaluateGuess = (word, guess) => {
        let feedback = '';
        let correct = false;

        if (guess.toLowerCase() === word.toLowerCase()) {
            correct = true;
        }
        else {
            feedback = 'Incorrect guess. Here is how close you are: ';
            for (let i = 0; i < word.length; i++) {
                if (guess[i] === word[i]) {
                    feedback += `✅ ${guess[i]}`;
                } else if (word.includes(guess[i])) {
                    feedback += `🔀 ${guess[i]}`;
                } else {
                    if (i >= guess.length) {
                        feedback += `❌ _`;
                    }
                    else {
                        feedback += `❌ ${guess[i]}`;
                    }
                }
            }
        }

        return { feedback, correct };
    }

    askForGuess();
}

async function saveGameStats(interaction, psychic, subject, targetNumber, attempts, finalScore) {
    const sql1 = "SELECT MAX(UNIQUE_ID) as MAX_ID FROM STATS";

    var result;
    try {
        result = await mysql.runQuery(sql1);
    }
    catch (error) {
        logger.error("*** Error getting max unique id: " + error.stack);
        return;
    }

    var unique_id = result[0].MAX_ID + 1;

    const sql2 = `INSERT INTO STATS (UNIQUE_ID, PLAYER_ID, PLAYER_NAME, SUBJECT_ID, ` +
        `SUBJECT_NAME, GUILD_ID, DATE, VALUE, NUM_GUESSES, SCORE) VALUES ` +
        `('${unique_id}', '${psychic.id}', '${psychic.username}', '${subject.id}', ` +
        `'${subject.username}', '${interaction.guild.id}', NOW(), '${targetNumber}', ` +
        `'${attempts}', '${finalScore}')`;

    try {
        await mysql.runQuery(sql2);
    }
    catch (error) {
        logger.error("*** Error saving game stats: " + error.stack);
        return;
    }
}