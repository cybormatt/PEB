/* 
This module logs data to the log file, and error file if applicable.   The 
base name of the files, along with the log level and maximum file size are 
specified in the config.json file.  The location of the files should be located 
in the 'logs' sub-directory relative to the index.js file.  If the 'logs' 
directory does not exist, it will be created.

This module automatically archives the log files when they reach the specified
maximum length.  Also, output to the log file is mirrored to the console with the
presence of the '--show-output' or '-o' parameter.
*/
const fs = require('fs');
const cp = require('child_process');

const config = require("../config.json");

if (!fs.existsSync(__dirname + "/../logs")) {
    fs.mkdirSync(__dirname + "/../logs");
}

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
    silly: 5
}

const LOG_LEVEL = LOG_LEVELS[config.Logging.LogLevel];

const LOG_FILE = __dirname + "/../logs/" + config.Logging.LogFile;
const ERR_FILE = __dirname + "/../logs/" + config.Logging.ErrorFile;
const MAX_SIZE = config.Logging.MaxSize;

var showOutput = false;
if (arg = process.argv.find(a => a == "--show-output" || a == "-o")) {
    showOutput = true;
}

function checkLogFile(file) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "");

    var stats = fs.statSync(file);

    if (stats.size >= MAX_SIZE) {
        var newFileName = file + "." + formatDate();
        fs.renameSync(file, newFileName);
        cp.execSync("gzip " + newFileName);
    }

    if (stats.size >= MAX_SIZE || stats.size == 0) {
        fs.writeFileSync(file, "*** New log file created on " + (new Date()).toString() + "\n");
    }
}

function formatDate() {
    var tStamp = new Date();

    var year = tStamp.getFullYear().toString();

    var month = (tStamp.getMonth() + 1).toString();
    if (month.length == 1) {
        month = "0" + month;
    }

    var day = tStamp.getDate().toString();
    if (day.length == 1) {
        day = "0" + day;
    }

    return year + month + day;
}

function writeOutput(logLevel, file, msg) {
    if (logLevel > LOG_LEVEL) return;

    checkLogFile(file);
    fs.appendFileSync(file, msg + "\n");

    if (showOutput) {
        console.log(msg);
    }
}

checkLogFile(LOG_FILE);
checkLogFile(ERR_FILE);

module.exports = {
    LOG_LEVELS: LOG_LEVELS,
    error(msg) {
        writeOutput(LOG_LEVELS.error, LOG_FILE, msg);
        writeOutput(LOG_LEVELS.error, ERR_FILE, "\n" + new Date().toString() + "\n" + msg);
    },
    warn(msg) {
        writeOutput(LOG_LEVELS.warn, LOG_FILE, msg);
    },
    info(msg) {
        writeOutput(LOG_LEVELS.info, LOG_FILE, msg);
    },
    verbose(msg) {
        writeOutput(LOG_LEVELS.verbose, LOG_FILE, msg);
    },
    debug(msg) {
        writeOutput(LOG_LEVELS.debug, LOG_FILE, msg);
    },
    silly(msg) {
        writeOutput(LOG_LEVELS.silly, LOG_FILE, msg);
    },
    log(logLevel, msg) {
        if (typeof logLevel == "string") {
            logLevel = LOG_LEVELS[logLevel.toLowerCase()];

            if (!logLevel) throw new Error("Unrecognized log level '" + logLevel + "'!");
        }

        if (logLevel == LOG_LEVELS.error) this.error(msg);
        else writeOutput(logLevel, LOG_FILE, msg);
    }
}