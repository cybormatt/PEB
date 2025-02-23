const CONFIG = require("./config.json");

const COLORS = {
    black: 0x000000,
    white: 0xffffff,
    red: 0xff0000,
    pink: 0xffc0cb,
    orange: 0xff7700,
    yellow: 0xffff00,
    springgreen: 0x77ff00,
    green: 0x00ff00,
    turquoise: 0x00ff77,
    cyan: 0x00ffff,
    ocean: 0x0077ff,
    blue: 0x0000ff,
    violet: 0x7700ff,
    magenta: 0xff00ff,
    raspberry: 0xff0077
};

const EMBED_COLOR = 0x0099ff;

const AUTHOR_TAG_NAME = "the.forgotten1#4603";

module.exports = class {
    static get COLORS() { return COLORS; }
    static get EMBED_COLOR() { return EMBED_COLOR; }
    static get AUTHOR_TAG_NAME() { return AUTHOR_TAG_NAME; }
}