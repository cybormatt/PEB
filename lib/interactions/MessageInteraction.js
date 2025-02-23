/*
This module, when used with CommandOption, CommandOptionResolver and CommandOptionType is designed 
to parse command input from a Discord Message object and simulate a command interaction that can 
be passed into the execute method of a command file.  This allows you to use the same code to handle
slash commands and commands entered via messages.

To use this module, create a new instance of this class, passsing the message object and the command 
file object (from the client.commands collection) into the constructor.  Then run the instance's execute
method, which parses the message's content for arguments and structures them like a CommandInteraction.
*/
const { Message } = require("discord.js");
const logger = require("../../lib/logger.js");
const { InteractionType } = require('discord-api-types/v10');
const { CommandOptionResolver } = require("../CommandBuilder.js");

//const TYPE = "APPLICATION_COMMAND";
const TYPE = InteractionType.MessageComponent;

module.exports = class {
    __msg;
    command;

    __reply;

    get replied() {
        return (this.__reply != undefined);
    }

    channel;
    client;
    createdAt;
    guild;
    id;
    member;
    get type() {
        return TYPE;
    }
    user;

    options;

    execute() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.options.initialize();
            }
            catch (err) {
                logger.error("*** Failed to initialize arg parser: " + err.stack);
                reject(err);
                return;
            }

            try {
                await this.command.execute(this);
            }
            catch (err) {
                logger.error("*** Error in executing command: " + err.stack);
                reject(err);
                return;
            }

            if (this.command.data.deleteUserMessage && (
                this.__msg.channel.type == "GUILD_TEXT" ||
                this.__msg.channel.type == "GUILD_NEWS" ||
                this.__msg.channel.type == "GUILD_STORE")) {
                try {
                    await this.__msg.delete();
                }
                catch (err) {
                    logger.error("*** Error deleting message.  Message: " + err.stack);
                }
            }

            resolve();
        });
    }

    fetchReply() {
        return this.__reply;
    }

    deferReply() { }

    followUp(argv) {
        return new Promise(async (resolve, reject) => {
            this.reply(argv)
                .then(msg => resolve(msg))
                .catch(err => reject(err));
        });
    }

    editReply(argv) {
        return new Promise(async (resolve, reject) => {
            if (this.__reply) {
                this.__reply.edit(argv)
                    .then(msg => {
                        this.__reply = msg;
                        resolve(msg);
                    })
                    .catch(err => {
                        logger.error("*** Error in editing message: " + err.stack);
                        reject(err);
                    });
            }
            else {
                this.reply(argv)
                    .then(msg => resolve(msg))
                    .catch(err => reject(err));
            }
        });
    }

    deleteReply() {
        return new Promise(async (resolve, reject) => {
            if (!this.__reply) {
                reject(new Error("Error: there is no reply to delete!"));
                return;
            }

            this.__reply.delete()
                .then(msg => resolve(msg))
                .catch(err => {
                    logger.error("*** Error in deleteing reply: " + err.stack);
                    reject(err);
                });
        });
    }

    reply(argv) {
        return new Promise(async (resolve, reject) => {
            if (this.command.data.deleteUserMessage) {
                if (argv?.ephemeral) {
                    this.user.createDM()
                        .then(dm => {
                            dm.send(argv)
                                .then(msg => {
                                    this.__reply = msg;
                                    resolve(msg);
                                })
                                .catch(err => {
                                    logger.error("*** Error sending DM: " + err.stack);
                                    reject(err);
                                });
                        })
                        .catch(err => {
                            logger.error("*** Error in creating DM: " + err.stack);
                            reject(err);
                        });
                }
                else {
                    this.channel.send(`<@${this.user.id}> ${argv}`)
                        .then(msg => {
                            this.__reply = msg;
                            resolve(msg);
                        })
                        .catch(err => {
                            logger.error("*** Error sending message in channel: " + err.stack);
                            reject(err);
                        });
                }
            }
            else {
                this.__msg.reply(argv)
                    .then(msg => {
                        this.__reply = msg;
                        resolve(msg);
                    })
                    .catch(err => {
                        logger.error("*** Error replying to user: " + err.stack);
                        reject(err);
                    });
            }
        });
    }

    constructor(message, command) {
        if (!(message instanceof Message)) {
            throw new Error("Type Error: message argument must be of type Message!");
        }

        this.__msg = message;
        this.command = command;

        this.channel = this.__msg.channel;
        this.client = this.__msg.client;
        this.createdAt = new Date();
        this.guild = this.__msg.guild;
        this.id = this.__msg.id;
        this.member = this.__msg.member;
        this.user = this.__msg.author;

        this.options = new CommandOptionResolver(this.command, this.__msg);
    }
}