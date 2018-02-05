const path = require("path");
const Koa = require("koa");
const convert = require("koa-convert");
const serve = require("koa-static-server");

const app = new Koa();

app.use(serve({ rootDir: path.join(__dirname, "static") }));

module.exports = app;
