const logger = require("../lib/logger.js");
const mysql = require("../lib/mysql.js");
const { EmbedBuilder } = require('discord.js');

var client;

module.exports = {
    name: "stats",
    init() {
        client = this.client;
    },
    async execute(interaction) {
        var startdate = interaction.options.getString("startdate");
        var enddate = interaction.options.getString("enddate");

        getStats(interaction, interaction.user, startdate, enddate);
    }
}

async function getStats(interaction, user, startdate, enddate) {
    var sql1 = "SELECT COUNT(PLAYER_ID) AS TOTAL_GAMES, " +
        "AVG(NUM_GUESSES) AS AVG_GUESSES, " +
        "AVG(SCORE) AS AVG_SCORE " +
        "FROM STATS " +
        `WHERE PLAYER_ID = '${user.id}' AND GUILD_ID = '${interaction.guild.id}' ` +
        (startdate ? `AND DATE >= '${startdate}' ` : "") +
        (enddate ? `AND DATE <= '${enddate}' ` : "") +
        "GROUP BY PLAYER_ID";

    var totalGames;
    var avgGuesses;
    var avgScore;

    try {
        var result = await mysql.runQuery(sql1);
        if (result.length == 0) {
            interaction.reply("No stats found for the specified period.");
            return;
        }

        totalGames = result[0].TOTAL_GAMES;
        avgGuesses = result[0].AVG_GUESSES;
        avgScore = result[0].AVG_SCORE;
    }
    catch (error) {
        logger.error("*** Error getting stats: " + error.stack);
        return;
    }

    var sql2 = "SELECT DATE, SCORE FROM STATS " +
        `WHERE PLAYER_ID = '${user.id}' AND GUILD_ID = '${interaction.guild.id}' ` +
        (startdate ? `AND DATE >= '${startdate}' ` : "") +
        (enddate ? `AND DATE <= '${enddate}' ` : "") +
        "ORDER BY DATE DESC";

    try {
        var result = await mysql.runQuery(sql2);
        if (result.length == 0) {
            interaction.reply("No stats found for the specified period.");
            return;
        }

        var stats = {};
        stats.scores = [];
        stats.dates = [];

        result.forEach(row => {
            stats.scores.push(row.SCORE);
            stats.dates.push(row.DATE);
        });

        const { mode, frequency } = calculateModeAndFrequency(stats.scores);
        const stdDev = calculateStandardDeviation(stats.scores);
        const stdErr = calculateStandardError(stats.scores);

        const embed = new EmbedBuilder()
            .setTitle("Player Stats")
            .setColor(0x00AE86)
            .addFields(
                { name: "Total Games", value: totalGames.toString(), inline: true },
                { name: "Average Guesses", value: avgGuesses.toString(), inline: true },
                { name: "Average Score", value: avgScore.toString(), inline: true },
                { name: "Mode Score", value: mode.join(", ").toString(), inline: true },
                { name: "Mode Frequency", value: JSON.stringify(frequency), inline: true },
                { name: "Standard Deviation", value: stdDev.toString(), inline: true },
                { name: "Standard Error", value: stdErr.toString(), inline: true }
            );

        interaction.reply({ embeds: [embed] })
            .catch(error => logger.error("*** Error sending stats: " + error.stack));
    }
    catch (error) {
        logger.error("*** Error getting stats: " + error.stack);
        return;
    }
}

function calculateStandardDeviation(scores) {
    const n = scores.length;
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    return Math.sqrt(variance);
}

function calculateStandardError(scores) {
    const stdDev = calculateStandardDeviation(scores);
    const n = scores.length;
    return stdDev / Math.sqrt(n);
}

function calculateModeAndFrequency(scores) {
    const frequency = {};
    let maxFreq = 0;
    let mode = [];

    scores.forEach(score => {
        frequency[score] = (frequency[score] || 0) + 1;
        if (frequency[score] > maxFreq) {
            maxFreq = frequency[score];
            mode = [score];
        } else if (frequency[score] === maxFreq) {
            mode.push(score);
        }
    });

    return { mode, frequency };
}