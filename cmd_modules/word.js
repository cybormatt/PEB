const logger = require("../lib/logger.js");

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
        if (message.author.id != subject.id && !message.guild) return;

        client.removeListener("messageCreate", handler);

        let content = message.content;

        await interaction.followUp("Subject has made selection.  Starting game...");
        await dmChannel.send(`Please return to ${interaction.channel} to watch ${psychic} make guesses.`);

        startGame(interaction, content, psychic, subject);
    }

    client.on("messageCreate", handler);
}

function startGame(interaction, word2, psychic2, subject2) {
    const psychic = interaction.user; // User1 is the one who triggered the interaction
    const subject = interaction.options.getUser('user2'); // User2 is fetched from the command options
    const word = interaction.options.getString('word').toLowerCase(); // The word provided by user1
    const wordLength = word.length;
    let attempts = 0;
    let guessedCorrectly = false;

    // Prompt user2 to start guessing
    await interaction.reply({
        content: `${subject}, the game has started! You need to guess the word that ${psychic.username} has supplied. The word is ${wordLength} letters long. Type your guess below!`,
        ephemeral: true,
    });

    // Create a message collector for user2's guesses
    const filter = response => response.author.id === subject.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

    collector.on('collect', async message => {
        const guess = message.content.toLowerCase();
        attempts++;

        if (guess === word) {
            guessedCorrectly = true;
            collector.stop(); // Stop the collector once the correct guess is made

            const score = Math.max(0, 100 - (attempts - 1) * 10); // Higher score with fewer attempts
            await interaction.followUp({
                content: `🎉 Congratulations ${subject}, you guessed the word "${word}" correctly in ${attempts} tries! Your score is ${score}.`,
            });
        } else {
            // Compare each letter in user1's word with user2's guess and provide feedback
            let feedback = '';
            for (let i = 0; i < word.length; i++) {
                if (guess[i] === word[i]) {
                    feedback += `✅ ${guess[i]}`; // Correct letter at the correct position
                } else if (word.includes(guess[i])) {
                    feedback += `🔀 ${guess[i]}`; // Correct letter, wrong position
                } else {
                    feedback += `❌ ${guess[i]}`; // Incorrect letter
                }
            }

            await interaction.followUp({
                content: `${subject}, your guess "${guess}" is not correct. Here's how close you were:\n${feedback}\nTry again!`,
                ephemeral: true,
            });
        }
    });

    collector.on('end', collected => {
        if (!guessedCorrectly) {
            interaction.followUp({
                content: `Game over! The correct word was "${word}".`,
                ephemeral: true,
            });
        }
    });
}
