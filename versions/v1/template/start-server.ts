// This file should also be placed along side the users files
// It serves as an entry point for the server

import * as path from "path";
import * as fs from "fs";
import {createServer} from "./server";
import {CreateServerConfig} from "./types";
import {ApolloServer} from "apollo-server";

const loadConfig = (): CreateServerConfig => {
    // Load the json file config.json
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './server.json'), 'utf8')) as CreateServerConfig;
}

export const startServerWithLocalConfig = async (): Promise<ApolloServer> => {
    const config = loadConfig();
    return createServer(config);
};