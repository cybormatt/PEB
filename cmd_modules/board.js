const logger = require("../lib/logger.js");
const mysql = require("../lib/mysql.js");
const embed_r = require("../lib/embed.js");
const utils = require("../lib/utils.js");

var client;

module.exports = {
    name: "board",
    init() {
        client = this.client;
    },
    async execute(interaction) {
        showLeaderBoard(interaction);
    }
}

async function getGuildStats(interaction) {
    var sql = "SELECT PLAYER_ID," +
        "COUNT(NUM_GUESSES) AS TOTAL_ROWS," +
        "AVG(NUM_GUESSES) AS AVG_GUESSES," +
        "AVG(SCORE) AS AVG_SCORE " +
        "FROM STATS " +
        `WHERE GUILD_ID = '${interaction.guild.id}' ` +
        "GROUP BY GUILD_ID, PLAYER_ID ";

    try {
        var result = await mysql.runQuery(sql);

        if (result.length == 0) {
            interaction.reply("No stats found for this server.");
            return;
        }

        let guildStats = [];

        for (let i = 0; i < result.length; i++) {
            logger.info(`*** ${result[i].PLAYER_ID} ${result[i].TOTAL_ROWS} ${result[i].AVG_GUESSES} ${result[i].AVG_SCORE}`);

            guildStats.push({
                playerId: result[i].PLAYER_ID,
                totalGames: result[i].TOTAL_ROWS,
                avgGuesses: result[i].AVG_GUESSES,
                avgScore: result[i].AVG_SCORE,
                rank: result[i].AVG_SCORE * (10 * Math.log(result[i].TOTAL_ROWS + 1))
            });
        }

        logger.info("*** Guild stats: " + JSON.stringify(guildStats));
        return guildStats;
    }
    catch (error) {
        logger.error("*** Error getting guild stats: " + error.stack);
        return;
    }
}

async function showLeaderBoard(interaction) {
    var guildStats = await getGuildStats(interaction);

    logger.info("*** Guild stats1: " + JSON.stringify(guildStats));

    if (!guildStats) return;

    logger.info("*** Guild stats2: " + JSON.stringify(guildStats));

    var fieldData = [];
    var users = [];

    for (let stat of guildStats) {
        users.push(stat.playerId);

        fieldData.push({
            userId: stat.playerId,
            percentage: utils.roundDecimal(stat.avgScore, 2).toString(),
            totalGames: stat.totalGames,
            rank: utils.roundDecimal(stat.rank, 2),
        })
    }

    const embed = {
        color: 0x2ecc71,
        title: "User Leader Board",
        description: "The rank is determined by the formula ***p \\* (10 \\* ln(n) + 1)***, where ***p*** is the ***average percentage*** " +
            "and ***n*** is the ***total games played***.  This allows for the average percentage to gain more significance with the number " +
            "of games played while also decreasing significance as that number goes up.  In short, the more you play, the higher " +
            "your rank will be.\n\n" +
            "__**Top Members by Rank**__",
        author: {
            name: "Psychic Experiment Bot",
        },
        thumbnail: {
            url: client.WEB_URL + "/images/peb.webp"
        },
        timestamp: new Date()
    }

    var fields = [];
    var i = 1;

    fieldData.sort((a, b) => b.rank - a.rank);

    var members;
    try {
        members = await interaction.guild.members.fetch({ user: users });
    }
    catch (err) {
        logger.error("*** Error fetching members: " + err.stack);
        interaction.reply("Error in fetching members: " + err.message);
        return;
    }

    for (let userStat of fieldData) {
        var member = members.get(userStat.userId);

        if (!member) {
            logger.error("*** Member not found: " + userStat.userId);
            continue;
        }

        var name = member.nickname ? member.nickname : member.displayName;

        fields.push({
            name: `#${i++}) ${name}, Rank=${utils.roundDecimal(userStat.rank, 2)}`,
            value: `Avg Score: ${userStat.percentage}% over ${userStat.totalGames} games`
        });
    }

    embed_r.showFieldReader(interaction, embed, fields, { fieldsPerPage: 10 })
        .catch(err => channel.send(`<@${interaction.user.id}> An error occured setting up the top percentage leader board: ${err}`));
}