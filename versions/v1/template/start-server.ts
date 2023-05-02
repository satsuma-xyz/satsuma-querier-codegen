// This file should also be placed along side the users files
// It serves as an entry point for the server

import * as path from "path";
import * as fs from "fs";
import {createServer} from "./server";
import {CreateServerConfig} from "./types";
import {ApolloServer} from "@apollo/server";

const loadConfig = (): CreateServerConfig => {
    // Load the json file config.json
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './server.config.json'), 'utf8')) as CreateServerConfig;
}

export const startServerWithLocalConfig = async (): Promise<ApolloServer> => {
    const config = loadConfig();
    // Load custom code
    const resolverFile = path.resolve("./resolvers.ts");
    let resolvers = {};
    try {resolvers = (await import(resolverFile)).resolvers} catch {}
    const typeDefsFile = path.resolve("./typeDefs.ts");
    let typeDefs = "";
    try {typeDefs = (await import(typeDefsFile)).typeDefs} catch {}
    const helpersFile = path.resolve("./helpers.ts");
    let helpers = {};
    try {helpers = (await import(helpersFile)).helpers} catch {}

    return createServer(config, typeDefs, resolvers, helpers);
};
