const { CommandOption } = require("../lib/CommandBuilder.js");
const logger = require("../lib/logger.js");

var client;

module.exports = {
    name: "discord",
    init() {
        client = this.client;
    },
    async sendDM(user, text) {
        return new Promise((resolve, reject) => {
            user.createDM()
                .then(dm => {
                    dm.send(text);
                    resolve();
                })
                .catch(err => {
                    logger.error("*** Error in created DM: " + err.stack);
                    resolve();
                });
        });
    },
    getGuild(guildId) {
        return new Promise((resolve, reject) => {
            client.guilds.fetch(guildId)
                .then(guild => {
                    resolve(guild);
                })
                .catch(err => {
                    logger.error("*** Error in retrieving guild: " + err.stack)
                    reject(err);
                });
        });
    },
    getMember(guildId, userData) {
        return new Promise(async (resolve, reject) => {
            if (!userData) {
                reject(new Error("User parameter undefined!"));
                return;
            }

            client.guilds.fetch(guildId)
                .then(guild => {
                    guild.members.fetch()
                        .then(members => {
                            var findByName = false;
                            var x;
                            var y;

                            if (y = this.getId(userData)) {
                                x = "id";
                            }
                            else if (this.hasUserTag(userData)) {
                                x = "tag";
                                y = userData.toLowerCase();
                            }
                            else {
                                findByName = true;
                                y = userData.toLowerCase();
                            }

                            for (let member of guild.members.cache.values()) {
                                if (!findByName) {
                                    if (member.user[x].toLowerCase() == y) {
                                        resolve(member);
                                        return;
                                    }
                                }
                                else {
                                    if (member.nickname && member.nickname.toLowerCase() == y) {
                                        resolve(member);
                                        return;
                                    }
                                    else if (member.displayName.toLowerCase() == y) {
                                        resolve(member);
                                        return;
                                    }
                                }
                            }

                            resolve();
                        })
                        .catch(err => {
                            logger.error("*** Error in retrieving member: " + err.stack);
                            reject(err);
                        });
                })
                .catch(err => {
                    logger.error("*** Error in retrieving guild: " + err.stack)
                    reject(err);
                });
        });
    },
    hasUserTag(arg) {
        var str;

        if (arg instanceof CommandOption) str = arg.__value;
        else str = arg;

        return (str.search(/(\s|^)@?([^#@<>]+#[0-9]{4})(\s|$)/) > -1);
    },
    parseUserTags(guild, args) {
        return new Promise(async (resolve, reject) => {
            var ret;

            if (typeof args == "string") ret = args;
            else if (args instanceof CommandOption) ret = args.__value;
            else {
                logger.error("*** Error in parsing user tags: 'args' type not supported!");
                reject(new Error("Error in parsing user tags: 'args' type not supported!"))
            }

            if (match = ret.match(/(\s|^)@?([^#@<>]+#[0-9]{4})(\s|$)/g)) {
                for (let m of match) {
                    m = m.trim();
                    var userTag = ((m[0] == "@") ? m.slice(1) : m).toLowerCase();
                    var member;

                    try {
                        member = await this.getMember(guild, userTag);
                        if (!member) {
                            reject(new Error(`Member with user tag '${userTag}' not found on guild '${guild.name}'!`))
                            return;
                        }
                    }
                    catch (err) {
                        reject(err);
                        return;
                    }

                    ret = ret.replace(userTag, `<@${member.id}>`);
                }
            }

            resolve(ret);
        })
    },
    getId(mentionable) {
        if (mentionable.match(/^[0-9]{18}$/))
            return mentionable;
        if (match = mentionable.match(/<(@|#)(!|&)?([0-9]{18})>/))
            return match[3];
        else return undefined;
    },
    getBan(guildId, userId) {
        return new Promise(async (resolve, reject) => {
            client.guilds.fetch(guildId)
                .then(async guild => {
                    var ban;
                    try {
                        ban = await guild.bans.fetch(userId);
                    }
                    catch (err) {
                        logger.error("*** Error in fetching ban: " + err.stack);
                        reject(err);
                        return;
                    }

                    resolve(ban);
                })
                .catch(err => {
                    logger.error("*** Error in retrieving guild: " + err.stack);
                    reject(err);
                })
        })
    },
    searchEmbeds(msg, searchPattern) {
        if (msg.embeds.length > 0) {
            for (let embed of msg.embeds) {
                if (embed.author && embed.author.name &&
                    embed.author.name.toLowerCase().search(searchPattern) > -1) {
                    return true;
                }

                if (embed.title && embed.title.toLowerCase().search(searchPattern) > -1) {
                    return true;
                }

                if (embed.description && embed.description.toLowerCase().search(searchPattern) > -1) {
                    return true;
                }

                if (embed.fields.length > 0) {
                    for (let field of embed.fields) {
                        if (!field) continue;

                        if (field.name && field.name.toLowerCase().search(searchPattern) > -1) {
                            return true;
                        }

                        if (field.value && field.value.toLowerCase().search(searchPattern) > -1) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }
}