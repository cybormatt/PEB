const { ActionRowBuilder, ButtonBuilder, Message, BaseChannel, ButtonStyle } = require('discord.js');
const logger = require("../lib/logger");
const utils = require("../lib/utils.js");

var client;

const MAX_FIELDS = 25;

module.exports = {
    name: "embed",
    showFieldReader(transport, embed, fields, options) {
        return new Promise(async (resolve, reject) => {
            try {
                client = transport.client;
                await showFieldReader(transport, embed, fields, options);
                resolve();
            }
            catch (err) {
                logger.error(`*** Error in showing field reader: ${err.stack}`);
                reject(err.message);
            }
        })
    }
}

async function showFieldReader(transport, embed, fields,
    { fieldsPerPage = 15, timeoutMinutes = 60 } = {}) {
    if (fieldsPerPage > MAX_FIELDS) throw new Error("The maximum number of fields per page allowed is 25!");

    if (transport instanceof BaseChannel) {

    }
    var buttonTimeout = timeoutMinutes * 60000;

    if (fields.length <= fieldsPerPage) {
        embed.fields = fields;

        try {
            if (transport instanceof Message) {
                await transport.edit({ embeds: [embed] });
            }
            else if (transport instanceof BaseChannel) {
                await transport.send({ content: " ", embeds: [embed] });
            }
            else {
                if (transport.replied) {
                    await transport.editReply({ embeds: [embed] });
                }
                else {
                    await transport.reply({ content: " ", embeds: [embed] });
                }
            }
        }
        catch (err) {
            logger.error(`*** Error in replying with embed: ${err.stack}`);
            throw err;
        }

        return;
    }

    var sessionId = utils.genId(18);

    var slice = (n) => {
        return ((fields.length < (n * fieldsPerPage)) ?
            fields.slice((n - 1) * fieldsPerPage) :
            fields.slice((n - 1) * fieldsPerPage, n * fieldsPerPage))
    };

    var pages = Math.ceil(fields.length / fieldsPerPage);
    var n = 1;

    const btnPrevious = new ButtonBuilder()
        .setCustomId(`previous_${sessionId}`)
        .setLabel("Previous")
        .setStyle(ButtonStyle.Primary);

    const btnNext = new ButtonBuilder()
        .setCustomId(`next_${sessionId}`)
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
        .addComponents(btnPrevious)
        .addComponents(btnNext);

    embed.fields = slice(n);

    embed.footer = { text: `Page ${n} of ${pages}` };

    try {
        if (transport instanceof Message) {
            await transport.edit({ embeds: [embed], components: [row] });
        }
        else if (transport instanceof BaseChannel) {
            await transport.send({ content: " ", embeds: [embed], components: [row] });
        }
        else {
            if (transport.replied) {
                await transport.editReply({ embeds: [embed], components: [row] });
            }
            else {
                await transport.reply({ content: " ", embeds: [embed], components: [row] });
            }
        }
    }
    catch (err) {
        logger.error("*** Error in replying with embed: " + err.stack);
        throw err;
    }

    var interactionHandler = i => {
        if (!i.isButton()) return;

        if (i.customId == ("next_" + sessionId)) {
            if (n < pages) n++;
        }
        else if (i.customId == ("previous_" + sessionId)) {
            if (n > 1) n--;
        }
        else {
            return;
        }

        embed.fields = slice(n);
        embed.footer.text = `Page ${n} of ${pages}`;

        i.update({ embeds: [embed] })
            .catch(err => logger.error("*** Error in updating interaction: " + err.stack));
    };

    client.on("interactionCreate", interactionHandler);

    setTimeout(() => {
        client.removeListener("interactionCreate", interactionHandler);

    }, buttonTimeout);
}