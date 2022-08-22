import express from "express";
import logger from "morgan";

import routes from "./routes";

const app = express();
const cors = require("cors");
const bodyParser = require('body-parser')

const whitelist = ['http://localhost:5000', 'http://localhost:5080']; //white list consumers
const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true, //Credentials are cookies, authorization headers or TLS client certificates.
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'device-remember-token', 'Access-Control-Allow-Origin', 'Origin', 'Accept']
};

app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(cors(corsOptions))
app.use(logger("dev", { skip: () => app.get("env") === "test" }));
app.use(routes);

export default app;