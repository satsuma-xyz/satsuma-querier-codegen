// This file should also be placed along side the users files
// It serves as an entry point for the server

import * as path from "path";
import * as fs from "fs";
import {createServer} from "./server";
import {CreateServerConfig} from "./types";

const loadConfig = (): CreateServerConfig => {
    // Load the json file config.json
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, './server.json'), 'utf8')) as CreateServerConfig;
}


(() => {
    (async () => {
        const config = loadConfig();
        const server = await createServer(config);

        return new Promise(async (resolve,) => {
            const {url} = await server.listen();
            console.log(`🍊Satsuma server listening at ${url}`);

            const shutdownServer = () => {
                console.log('Shutting down server...');
                server.stop();
            };

            process.on('SIGINT', () => {
                shutdownServer();
            });

            process.on('SIGTERM', () => {
                shutdownServer();
            });
        });
    })().then(() => {
        process.exit(0);
    }).catch((e) => {
        console.error(e);
        process.exit(1);
    })
})();