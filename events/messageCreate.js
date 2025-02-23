const MessageInteraction = require("../lib/interactions/MessageInteraction.js");
const logger = require("../lib/logger.js");

const CONFIG = require("../config.json");

var client;

module.exports = {
    name: "messageCreate",
    once: false,
    init() {
        client = this.client;
    },
    async execute(msg) {
        logMessage(msg);
        checkMentions(msg);

        var guildId = "";

        if (msg.guild && msg.guild.id && msg.guild.id != "") {
            guildId = msg.guild.id;
        }

        var prefix = CONFIG.Prefix;

        var n = 0;
        while (msg.content[n] != " " && n < msg.content.length) n++;
        var firstWord = msg.content.slice(0, n).toLowerCase();

        for (let commandName in client.commands) {
            var command = client.commands[commandName];
            if (!command.data.isMessageCommand()) continue;

            var activator = prefix + command.data.name;
            var activator2 = "/" + command.data.name;

            if (command.data.options.length == 0 && msg.content.length > firstWord.length) continue;

            if (firstWord == activator.toLowerCase() || (!msg.guild && (firstWord == command.data.name.toLowerCase()))) {
                if (command.disabled) {
                    msg.reply("This command is disabled!")
                        .catch(err => {
                            logger.error("*** Unexpected error in replying to user: " + err.stack);
                        });
                    return;
                }

                var channel;
                var guild;

                if (msg.channel.type == "DM" ||
                    msg.channel.type == "GROUP_DM") {
                    channel = "<DM>";
                    guild = "N/A";
                }
                else {
                    channel = `(${msg.channel.id}) #${msg.channel.name}`;
                    guild = `(${msg.guild.id}) ${msg.guild.name}`;
                }

                var n = msg.content.indexOf(command.data.name) + command.data.name.length + 1;
                const message = "\n*** KEYWORD activated:\n" +
                    "  Date/Time: " + (new Date).toString() + "\n" +
                    `  Keyword: ${activator}\n` +
                    `  Args: ${msg.content.slice(n)}\n` +
                    `  User: (${msg.author.id}) @${msg.author.username}\n` +
                    `  Channel: ${channel}\n` +
                    `  Server: ${guild}\n`;

                logger.info(message);

                var interaction = new MessageInteraction(msg, command);
                interaction.execute()
                    .catch(err => {
                        interaction.reply(
                            `Failed to execute command: ${err.message}\n\n` +
                            `Type **${prefix}${command.data.name} help** ` +
                            `or **/${command.data.name} help** to see help on this command.`);
                    });

                return;
            }
            else if (firstWord == activator2.toLowerCase()) {
                msg.reply(
                    "You attempted to initiate a slash command but did not follow the interactions presented to you.  " +
                    "Please try again and use the interactions that Discord presents to you.  If you are having trouble with " +
                    "the interactive approach, then try the using the non-interactive method by typing '" + activator + "'.")
                    .catch(err => {
                        logger.error("*** Unexpected error in replying to user: " + err.stack);
                    });
                return;
            }
        }
    }
}

function logMessage(msg) {
    var txt = msg.content;

    var channelName;
    var serverName;

    if (msg.channel.type == "DM" ||
        msg.channel.type == "GROUP_DM") {
        channelName = "<DM>";
        serverName = "";
    }
    else {
        channelName = "#" + msg.channel.name;
        serverName = " (" + msg.channel.guild?.name + ")"
    }

    logger.verbose(msg.createdAt.toString() + serverName + " " + channelName + " @" + msg.author.username);

    // Try to capture as much of the embed as we can
    if (msg.embeds.length > 0) {
        if (txt) logger.verbose("CONTENT:\n" + txt + "\n");

        for (var i = 0; i < msg.embeds.length; i++) {
            logger.verbose("EMBED:");

            var embed = msg.embeds[i];

            if (embed.color)
                logger.verbose("  Color: " + embed.color);

            if (embed.title && embed.title != "")
                logger.verbose("  Title: " + embed.title);

            if (embed.url && embed.url != "")
                logger.verbose("  Url: " + embed.url);

            if (embed.author) {
                if (embed.author.name && embed.author.name != "")
                    logger.verbose("  Author Name: " + embed.author.name);

                if (embed.author.icon_url && embed.author.icon_url != "")
                    logger.verbose("  Author Icon: " + embed.author.icon_url);

                if (embed.author.url && embed.author.url != "")
                    logger.verbose("  Author Url: " + embed.author.url);
            }

            if (embed.description && embed.description != "")
                logger.verbose("  Description: " + embed.description + "\n");

            if (embed.thumbnail && embed.thumbnail.url && embed.thumbnail.url != "")
                logger.verbose("  Thumbnail: " + embed.thumbnail.url);

            if (embed.fields.length > 0) {
                logger.verbose("  Fields:");

                for (var j = 0; j < embed.fields.length; j++) {
                    var field = embed.fields[j];

                    if (!field)
                        continue;

                    if (field.name && field.name == "\u200B")
                        continue;

                    if (field.name && field.name != "")
                        logger.verbose("    Name: " + field.name);

                    if (field.value && field.value != "")
                        logger.verbose("    Value: " + field.value);
                }
            }

            if (embed.image && embed.image.url && embed.image.url != "")
                logger.verbose("  Image: " + embed.image.url);

            if (embed.timestamp)
                logger.verbose("  Timestamp: " + embed.timestamp);

            if (embed.footer) {
                if (embed.footer.text && embed.footer.text != "")
                    logger.verbose("  Footer Text: " + embed.footer.text);

                if (embed.footer.icon_url && embed.footer.icon_url != "")
                    logger.verbose("  Footer Icon: " + embed.footer.icon_url);
            }
        }

        if (msg.attachments.size > 0) logger.verbose("");
    }
    else if (txt) {
        logger.verbose(txt);

        if (msg.attachments.size > 0) logger.verbose("");
    }

    if (msg.attachments.size > 0) {
        logger.verbose('ATTACHMENTS:');

        var i = 0;
        const n = msg.attachments.size;
        for (let attachment of msg.attachments.values()) {
            logger.verbose(`  Content Type: ${attachment.contentType}`);
            if (attachment.name) logger.verbose(`  Name: ${attachment.name}`);
            if (attachment.description) logger.verbose(`  Description: ${attachment.description}`);
            if (attachment.proxyURL) logger.verbose(`  ProxyURL: ${attachment.proxyURL}`);
            logger.verbose(`  Url: ${attachment.url}`);

            if ((i + 1) < n) logger.verbose("");
        }
    }

    logger.verbose("");
}

function checkMentions(msg) {
    if (msg.mentions) {
        if (msg.mentions.members) {
            if (msg.author.id != client.user.id && !msg.author.bot &&
                msg.mentions.members.find(mem => mem.id == client.user.id)) {
                client.modules.about(msg);
            }
        }
    }
}