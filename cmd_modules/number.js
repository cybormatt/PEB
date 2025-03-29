const { ActionRowBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, ModalBuilder } = require('discord.js'); const logger = require("../lib/logger.js");
const mysql = require("../lib/mysql.js");

var client;
let INTERACTIONS = []; // handler for the messageCreate event in the startGame function

module.exports = {
    name: "number",
    checkStatus(interaction) {
        for (let i = 0; i < INTERACTIONS.length; i++) {
            if (INTERACTIONS[i].channelId == interaction.channel.id) {
                return true;
            }
        }
        return false;
    },
    init() {
        client = this.client;
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

            interaction.followUp(`Please wait while I get the number from ${subject}...`);

            // Create a button for the subject to click
            const button = new ButtonBuilder()
                .setCustomId('getNumber')
                .setLabel('Get Number')
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(button);

            // Send the button to the subject
            interaction.followUp({
                content: `Please click the button to get the number, ${subject}.  **TIP:  If you're new to this, start with a small number.**`,
                components: [row]
            });

            var handler2 = async (buttonInteraction) => {
                if (!buttonInteraction.isButton()) return;

                if (buttonInteraction.user.id != subject.id) {
                    buttonInteraction.reply({ content: "This button is not for you!", ephemeral: true });
                    return;
                }

                if (buttonInteraction.customId !== 'getNumber') return;

                // Remove the listener
                client.removeListener("interactionCreate", handler2);

                // Get the number from the subject
                getNumber(buttonInteraction, psychic, subject, interaction)
                    .catch(err => {
                        interaction.followUp("Failed to get the number from the subject.");
                        logger.info("Error in getting number from subject: " + err.stack);
                    });
            }

            client.on("interactionCreate", handler2);
        }

        client.on("messageCreate", handler);
    },
    async stop(interaction) {
        for (let i = 0; i < INTERACTIONS.length; i++) {
            if (interaction.channel.id == INTERACTIONS[i].channelId) {
                stopGame(interaction.channel);
                interaction.reply("Experiment stopped.")
                    .catch(err => logger.info("Error in stopping number game: " + err.stack));
                return;
            }
            interaction.reply("There is no experiment in progress in this channel.")
                .catch(err => logger.info("Error in stopping number game: " + err.stack));
        }
    }
}

async function getNumber(buttonInteraction, psychic, subject, interaction) {
    // Create a modal
    const modal = new ModalBuilder()
        .setCustomId('numberModal')
        .setTitle('Please enter a number');

    // Create a text input component
    const numberInput = new TextInputBuilder()
        .setCustomId('numberInput')
        .setLabel("Enter a whole number")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Type a whole number")
        .setRequired(true);

    // Create an action row and add the text input to it
    const firstActionRow = new ActionRowBuilder().addComponents(numberInput);

    // Add the action row to the modal
    modal.addComponents(firstActionRow);

    // Create a handler for the submission of the modal
    const handler = async (modalInteraction) => {
        if (!modalInteraction.isModalSubmit()) return;

        if (modalInteraction.customId !== 'numberModal') return;

        // Remove the listener
        client.removeListener("interactionCreate", handler);

        // Get the number from the modal
        const number = modalInteraction.fields.getTextInputValue('numberInput');

        if (isNaN(number)) {
            buttonInteraction.followUp("The input is not a valid number. Please try again.");
            return;
        }

        await interaction.followUp("Subject has made selection.  Starting game...");
        await modalInteraction.reply({ content: "Number received. Starting game...", ephemeral: true });

        startGame(interaction, number, psychic, subject);
    }

    // Add the handler for the modal submission
    client.on("interactionCreate", handler);

    // Show the modal to the subject
    buttonInteraction.showModal(modal);
}

async function callback(message) {
    if (!message.guild) return;

    for (let i = 0; i < INTERACTIONS.length; i++) {
        if (INTERACTIONS[i].channelId == message.channel.id) {
            const interaction = INTERACTIONS[i].interaction;
            const targetNumber = INTERACTIONS[i].targetNumber;
            const psychic = INTERACTIONS[i].psychic;
            const subject = INTERACTIONS[i].subject;
            const numGuesses = INTERACTIONS[i].numGuesses;
            let attempts = INTERACTIONS[i].attempts;

            if (message.author.id != INTERACTIONS[i].psychic.id || message.channel.id != INTERACTIONS[i].channelId) return

            if (isNaN(message.content)) {
                interaction.followUp("The input is not a valid number. Please try again.");
                interaction.followUp(`Please make a guess, ${psychic}.`); // Ask for the next guess;
                return;
            }

            const guess = message.content;
            const result = evaluateGuess(targetNumber, guess);

            attempts += 1;
            INTERACTIONS[i].attempts = attempts;

            const score = calculateScore(targetNumber, attempts);
            if (score == 0 || attempts >= numGuesses) {
                stopGame(message.channel);
                saveGameStats(interaction, psychic, subject, targetNumber, attempts, 0);

                await interaction.followUp(`You have reached the maximum number of attempts. The number was ${targetNumber}. Your score is 0.`);

                return;
            }

            if (result.correct) {
                stopGame(message.channel);

                await interaction.followUp(`Congratulations ${psychic}! You guessed the correct number ** ${targetNumber}** in ${attempts} tries.Your score: ${score} `);

                // Save stats
                saveGameStats(interaction, psychic, subject, targetNumber, attempts, score);
            }
            else {
                await interaction.followUp(`Your guess (attempt ${attempts} out of ${numGuesses}): ${guess}. ${result.message}. Try again!`);

                interaction.followUp(`Please make a guess, ${psychic}.`); // Ask for the next guess
            }

            break;
        }
    }
}

function startGame(interaction, number, psychic, subject) {
    const targetNumber = number.toString();
    let attempts = 0;

    var gameInteraction = {
        id: interaction.id,
        interaction: interaction,
        psychic: psychic,
        subject: subject,
        channelId: interaction.channel.id,
        targetNumber: targetNumber,
        attempts: attempts,
        numGuesses: calcNumGuesses(targetNumber)
    };

    INTERACTIONS.push(gameInteraction);

    interaction.followUp(`Please make a guess, ${psychic}.`);
}

function evaluateGuess(target, guess) {
    let message = '';
    let correct = false;

    if (guess === target) {
        correct = true;
    } else {
        message = 'Incorrect guess. Here is how close you are: ';
        for (let i = 0; i < target.length; i++) {
            if (i >= guess.length) {
                continue; // Skip if guess is shorter than target
            }

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
        logger.error("*** Error getting max unique id from stats table ***");
        return;
    }

    var unique_id = result[0].MAX_ID + 1;

    const sql2 = `INSERT INTO STATS(UNIQUE_ID, PLAYER_ID, PLAYER_NAME, SUBJECT_ID, ` +
        `SUBJECT_NAME, GUILD_ID, DATE, VALUE, NUM_GUESSES, SCORE) VALUES` +
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