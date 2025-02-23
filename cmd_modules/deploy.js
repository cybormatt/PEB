const fs = require("fs");
const logger = require("../../lib/logger.js");
const mysql = require('../../lib/mysql.js');
const { REST, Routes } = require("discord.js");
const { ClientId, Token } = require("../../config.json");

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

function readCommandFiles(filterCommands) {
    const commandFolders = fs.readdirSync('./commands')

    const commands = { guild: [], global: [] };

    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync("./commands/" + folder).filter(file => file.endsWith(".js"));

        for (const file of commandFiles) {
            const command = require(`../../commands/${folder}/${file}`);

            if (!command.data.isMessageCommand() && !command.data.isSlashCommand()) continue;

            if (command.data.isGlobal) {
                commands.global.push(command.data.toJSON());
            }
            else {
                if (filterCommands) {
                    if (command.data.defaultPermission || filterCommands.some(c => c == command.data.name)) {
                        commands.guild.push(command.data.toJSON());
                    }
                }
                else {
                    commands.guild.push(command.data.toJSON());
                }
            }
        }
    }

    return commands;
}

function deployToGuild(guildId, userToken) {
    return new Promise((resolve, reject) => {
        const guild = client.guilds.cache.get(guildId);
        const filterCommands = [];
        const permissions = [];

        const sql = "SELECT COMMAND, SECURITY FROM GUILD_COMMANDS " +
            `WHERE GUILD_ID='${guildId}'`;

        const con = mysql.getConnection();

        con.connect(err => {
            if (err) {
                logger.error("*** Error: " + err.stack);
                return;
            }

            con.query(sql, async (err, result) => {
                if (err) {
                    con.end();
                    logger.error("*** Error: " + err.stack);
                    return;
                }

                try {
                    for (let r of result) {
                        filterCommands.push(r["COMMAND"]);
                        const security = JSON.parse(r["SECURITY"]);

                        for (let s of security) {
                            var perm = permissions.find(p => p.command == r["COMMAND"]);

                            if (!perm) {
                                perm = {
                                    command: r["COMMAND"],
                                    permissions: []
                                };

                                permissions.push(perm);
                            }

                            var intType;
                            if (s.type == "ROLE") intType = 1;
                            else if (s.type == "USER") intType = 2;
                            else intType = 3;

                            perm.permissions.push({
                                id: s.id,
                                type: intType,
                                permission: true
                            });
                        }
                    }

                    const commands = readCommandFiles(filterCommands);

                    await rest.put(
                        Routes.applicationGuildCommands(ClientId, guildId),
                        { body: commands.guild }
                    );

                    if (filterCommands.length > 0) {
                        logger.info("*** Successfully registered application commands for guild " + guildId + ".");

                        guild.commands.fetch()
                            .then(c => {
                                for (let k of guild.commands.cache.values()) {
                                    if (filterCommands.some(cmd => cmd == k.name)) {
                                        var perm = permissions.find(p => p.command == k.name);

                                        logger.info("*** Debug: setting permissions");

                                        if (userToken) {
                                            k.permissions.set({ token: userToken, permissions: perm.permissions })
                                                .catch(err => logger.error("*** Error1: " + err));
                                        }
                                        else {
                                            k.permissions.set({ permissions: perm.permissions })
                                                .catch(err => logger.error("*** Error2: " + err));
                                        }
                                    }
                                }

                                logger.info("*** Permissions set for application commands on guild " + guildId + ".");

                                resolve("OK");
                            })
                            .catch(err => logger.error("*** Error in fetching guild commands for guild " + guildId + ".  Stack: " + err.stack));
                    }
                    else {
                        logger.info("*** No commands were found for guild " + guildId + ".");
                        resolve("OK");
                    }
                }
                catch (err) {
                    logger.error("*** Error in deploying commands: " + err.stack);
                    reject("Error: " + err.message);
                }
                finally {
                    con.end();
                }
            });
        });
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
            reject("Error: " + err.message);
        }
    });
}