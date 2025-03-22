const logger = require("../lib/logger.js");
const mysql = require("../lib/mysql.js");

var client;
let INTERACTIONS = []; // handler for the messageCreate event in the startGame function

module.exports = {
    name: "word",
    checkStatus(interaction) {
        for (let i = 0; i < INTERACTIONS.length; i++) {
            if (INTERACTIONS[i].channelId == interaction.channel.id) {
                return true;
            }
        }
        return false;
    },
    init() {
        client = this.client
        client.on("messageCreate", callback);
    },
    async start(interaction) {
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

        for (i = 0; i < INTERACTIONS.length; i++) {
            if (INTERACTIONS[i].channelId == interaction.channel.id) {
                interaction.reply("There is already an experiment in progress in this channel.");
                return;
            }
        }

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
            getWord(interaction, psychic, subject)
                .catch(err => {
                    interaction.followUp("Failed to get the word from the subject.");
                    logger.info("Error in getting word from subject: " + err.stack);
                });

        }

        client.on("messageCreate", handler);
    },
    async stop(interaction) {
        for (let i = 0; i < INTERACTIONS.length; i++) {
            if (interaction.channel.id == INTERACTIONS[i].channelId) {
                stopGame(interaction.channel);
                interaction.reply("Experiment stopped.")
                    .catch(err => logger.info("Error in stopping word game: " + err.stack));
                return;
            }
            interaction.reply("There is no experiment in progress in this channel.")
                .catch(err => logger.info("Error in stopping word game: " + err.stack));
        }
    }
}

async function getWord(interaction, psychic, subject) {
    const dmChannel = await subject.createDM();
    try {
        await dmChannel.send(`Player ${psychic} in ${interaction.channel} has started a word guessing experiment.  Please type a word. **TIP: If you're new to this, start with a short word.**`);
    } catch (error) {
        interaction.followUp("Failed to get the word from the subject.");
        logger.error(error);
    }

    const handler = async (message) => {
        if (message.author.id != subject.id || message.guild) return;

        client.removeListener("messageCreate", handler);

        let content = message.content;

        await interaction.followUp("Subject has made selection.  Starting game...");
        await dmChannel.send(`Please return to ${interaction.channel} to watch ${psychic} make guesses.`);

        startGame(interaction, content, psychic, subject);
    }

    client.on("messageCreate", handler);
}

async function callback(message) {
    if (!message.guild) return;

    for (let i = 0; i < INTERACTIONS.length; i++) {
        if (INTERACTIONS[i].channelId == message.channel.id) {
            const interaction = INTERACTIONS[i].interaction;
            const word = INTERACTIONS[i].word;
            const psychic = INTERACTIONS[i].psychic;
            const subject = INTERACTIONS[i].subject;
            const numGuesses = INTERACTIONS[i].numGuesses;
            let attempts = INTERACTIONS[i].attempts;

            if (message.author.id != INTERACTIONS[i].psychic.id || message.channel.id != INTERACTIONS[i].channelId) return

            const guess = message.content;
            const result = evaluateGuess(word, guess);

            attempts++;
            INTERACTIONS[i].attempts = attempts;

            const score = calculateScore(word, attempts);
            if (score == 0 || attempts >= numGuesses) {
                stopGame(message.channel);
                saveGameStats(interaction, psychic, subject, word, attempts, 0);

                await interaction.followUp(`You have reached the maximum number of attempts. The word was ${word}. Your score is 0.`);

                return;
            }

            if (result.correct) {
                stopGame(message.channel);

                await interaction.followUp(`🎉 Congratulations ${psychic}, you guessed the word "${word}" correctly in ${attempts} tries! Your score is ${score}.`);

                // Save stats
                saveGameStats(interaction, psychic, subject, word, attempts, score);

            } else {
                await interaction.followUp(`Your guess (attempt ${attempts} out of ${numGuesses}): ${guess}. ${result.feedback}. Try again!`);
                interaction.followUp(`Please make a guess, ${psychic}.`); // Ask for the next guess
            }
        }
    }
}

function startGame(interaction, word, psychic, subject) {
    let attempts = 0;

    var gameInteraction = {
        id: interaction.id,
        interaction: interaction,
        psychic: psychic,
        subject: subject,
        channelId: interaction.channel.id,
        word: word,
        attempts: attempts,
        numGuesses: calcNumGuesses(word)
    };

    INTERACTIONS.push(gameInteraction);

    interaction.followUp(`Please make a guess, ${psychic}.`);
}

function evaluateGuess(word, guess) {
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

function getKconst(target) {
    const n = target.length;

    let k;
    switch (n) {
        case 1:
            k = 0;
            break;
        case 2:
            k = 0.3;
            break;
        case 3:
            k = 0.5;
            break;
        case 4:
            k = 0.75;
            break;
        default:
            k = 1;
            break;
    }

    return k;
}

function calcNumGuesses(target) {
    const k = getKconst(target);

    return Math.ceil(10 * Math.pow(10, k) + 1) - 1;
}

function calculateScore(target, attempts) {
    const k = getKconst(target);

    const scoreBase = (attempts - 1) * 10 / Math.pow(10, k);

    return Math.max(100 - scoreBase, 0); // Adjust score based on length and attempts
}

function stopGame(channel) {
    for (let i = 0; i < INTERACTIONS.length; i++) {
        if (INTERACTIONS[i].channelId == channel.id) {
            let _interactions = [];

            for (let i = 0; i < INTERACTIONS.length; i++) {
                if (INTERACTIONS[i].channelId != channel.id) {
                    _interactions.push(INTERACTIONS[i]);
                }
            }

            INTERACTIONS = _interactions;

            return;
        }
    }
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