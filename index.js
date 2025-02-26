const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

/*** Load config file */
const CONFIG = require("./config.json");

/*** Set up client object */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.MessageContent], partials: ["CHANNEL"]
});

client.commands = {}
client.cmd_modules = {}
client.modules = {}
client.modals = {}
client.WEB_URL = `https://${CONFIG.Hostname}`;

/*** Log start time */
const logger = require("./lib/logger.js");
logger.info("\n\n*** Starting bot on " + new Date());

/*** Process command files */
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith(".js"));;

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    command.client = client;
    command.init();

    // Set a new item in the Collection
    // With the key as the command name and the value as the exported module
    client.commands[command.data.name] = command;
}

/*** Process command module files */
const cmdModuleFiles = fs.readdirSync("./cmd_modules").filter(file => file.endsWith(".js"));

for (const file of cmdModuleFiles) {
    const mod = require(`./cmd_modules/${file}`);

    mod.client = client;
    mod.init();

    // Set the module object as a property of client.modules, using the
    // module name as the key
    if (mod.execute) {
        // If the module file contains an execute function, export it
        // instead of the module object
        client.cmd_modules[mod.name] = mod.execute;
    }
    else {
        client.cmd_modules[mod.name] = mod
    }
}


/*** Process core module files */
const moduleFiles = fs.readdirSync("./modules").filter(file => file.endsWith(".js"));

for (const file of moduleFiles) {
    const mod = require(`./modules/${file}`);

    mod.client = client;
    mod.init();

    // Set the module object as a property of client.modules, using the
    // module name as the key
    if (mod.execute) {
        // If the module file contains an execute function, export it
        // instead of the module object
        client.modules[mod.name] = mod.execute;
    }
    else {
        client.modules[mod.name] = mod
    }
}

/*** Process event files (client events only) */
const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);

    event.client = client;
    event.init();

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

/*** Login to Discord */
client.login(CONFIG.Token);

/*** Watch for uncaught exceptions */
process.on("uncaughtException", err => {
    logger.error("*** An uncaught exception occurred:\n" + err.stack);
    process.exit(1);
})