const fs = require("fs");
const logger = require("../lib/logger.js");
const { REST, Routes } = require("discord.js");
const { ClientId, Token } = require("../config.json");

const rest = new REST().setToken(Token);

var client;

module.exports = {
    name: "deploy",
    init() {
        client = this.client;
    },
    deployToGuild: deployToGuild,
    deployGlobal: deployGlobal
}

function readCommandFiles() {
    const commands = { guild: [], global: [] };

    const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(`../commands/${file}`);

        if (!command.isSlashCommand()) continue;
        if (command.disabled) continue;

        if (command.data.isGlobal) {
            commands.global.push(command.data.toJSON());
        }
        else {
            if (command.name == "deploy")
                continue;
            else
                commands.guild.push(command.data.toJSON());
        }
    }

    return commands;
}

function deployToGuild(guildId) {
    return new Promise(async (resolve, reject) => {
        const guild = client.guilds.cache.get(guildId);
        const commands = readCommandFiles();

        await rest.put(
            Routes.applicationGuildCommands(ClientId, guildId),
            { body: commands.guild }
        );

        logger.info("*** Successfully registered application commands for guild " + guildId + ".");
        resolve("OK");
    });
}

async function deployGlobal() {
    return new Promise(async (resolve, reject) => {
        try {
            const commands = readCommandFiles();

            await rest.put(
                // For global commands, use:
                Routes.applicationCommands(ClientId),
                { body: commands.global }
            );

            logger.info("*** Successfully registered global commands.");
            resolve("OK");
        }
        catch (err) {
            logger.error("*** Error in deploying global commands: " + err.stack);
            reject("Error in deploying global commands: " + err.message);
        }
    });
}