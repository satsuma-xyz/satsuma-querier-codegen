// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// This file should be placed alongside the user's files.

import {ApolloServer, ApolloServerOptions} from "@apollo/server";
import {expressMiddleware} from "@apollo/server/express4";
import {startStandaloneServer as startStandaloneServerApollo} from "@apollo/server/standalone";
import {buildHTTPExecutor} from "@graphql-tools/executor-http";
import {makeExecutableSchema, mergeSchemas} from "@graphql-tools/schema";
import {schemaFromExecutor, wrapSchema} from "@graphql-tools/wrap";
const { print } = require('graphql')
import bodyParser from "body-parser";
import * as R from 'ramda';
import * as _ from 'lodash';
import * as rxjs from 'rxjs';
import * as validator from 'validator';
import * as uuid from 'uuid';
import * as moment from 'moment';
import * as dateFns from 'date-fns';
import cors from "cors";
import express from "express";
import * as http from "http";
import * as path from 'path';

import {resolvers as satsumaResolvers} from "./satsuma-gql/resolvers";
import {typeDefs as satsumaTypeDefs} from "./satsuma-gql/typeDefs";

import {createVM, deepCloneVMFunction} from "./deep-clone-vm";
import {createSatsumaKnex} from "./knex";
import {
    CreateServerConfig,
    GraphQLServer,
    HelpersMap,
    ResolversMap,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let resolvers = {};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let typeDefs = "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let helpers = {};

void (async () => {
    try {
        // eslint-disable-next-line import/no-unresolved
        const h = await import("./helpers");
        helpers = h.helpers;
    } catch (e) {
        // Do nothing.
    }
    try {
        // eslint-disable-next-line import/no-unresolved
        const r = await import("./resolvers");
        resolvers = r.resolvers;
    } catch (e) {
        // Do nothing.
    }
    try {
        // eslint-disable-next-line import/no-unresolved
        const t = await import("./typeDefs");
        typeDefs = t.typeDefs;
    } catch (e) {
        // Do nothing.
    }
})();

const globalContext = {
    R,
    _,
    rxjs,
    validator,
    uuid,
    moment,
    dateFns,
};

/**
 * Create a remote executable schema from a remote graphql server.
 * @param gqlServer
 */
export const createRemoteExecutableSchema = async (gqlServer: GraphQLServer) => {
    const link = buildHTTPExecutor({
        endpoint: gqlServer.uri,
    });
    const remoteSchema = await schemaFromExecutor(link);
    return wrapSchema({
        schema: remoteSchema,
        executor: link,
    });
};

const log = (debug: boolean, ...args: any[]) => {
    if (debug) {
        console.log(...args);
    }
}

/**
 * Create a new schema by merging the remote schema with the customer schema.
 */
export const createNewSchema = async (
    importPath: string,
    gqlServers: GraphQLServer[],
    typeDefs?: string = typeDefs,
    resolvers?: ResolversMap = resolvers,
    debug?: boolean = false
) => {
    const safeResolvers = deepCloneVMFunction(resolvers, createVM(importPath, globalContext));
    log(debug, 'safeResolvers', JSON.stringify(safeResolvers));

    const remoteExecutableSchemas = await Promise.all(
        gqlServers.map((gqlServer) => createRemoteExecutableSchema(gqlServer))
    );

    // Merge the two schemas
    return mergeSchemas({
        schemas: [...remoteExecutableSchemas],
        resolvers: _.merge(safeResolvers, satsumaResolvers),
        typeDefs: [typeDefs, satsumaTypeDefs].join("\n"),
    });
};

export const createApolloServer = async (
    config: CreateServerConfig,
    typeDefs?: string = typeDefs,
    resolvers?: ResolversMap = resolvers,
    debug?: boolean = false
): Promise<ApolloServer> => {
    console.log('resolverFile', config.resolverFile);
    const importPath = path.dirname(config.resolverFile);
    console.log('importPath', importPath);
    const schema = await createNewSchema(importPath, config.graphql, typeDefs, resolvers, debug);
    return new ApolloServer({schema, introspection: true});
};

interface ApolloServerContext {
    db: Record<string, Knex<any, unknown[]>>;
    helpers?: HelpersMap;
}

export const createApolloServerContext = async (
    config: CreateServerConfig,
    helpers?: HelpersMap = helpers,
    debug?: boolean = false
): Promise<ApolloServerContext> => {
    const databases: Record<string, Knex<any, unknown[]>> = {};
    for (const db of config.databases) {
        databases[db.name] = await createSatsumaKnex(db);
    }

    const helpersPath = path.dirname(config.helpersFile);
    console.log('helpersPath', helpersPath);
    const helpersSafe = deepCloneVMFunction(helpers, createVM(helpersPath, globalContext));
    log(debug, 'helpersSafe', JSON.stringify(helpersSafe));
    log(debug, 'dbs', JSON.stringify(databases));

    return {
        db: databases,
        helpers: helpersSafe,
    };
};

export interface SatsumaQueryExpressMiddleware extends express.RequestHandler {
    shutdown: () => Promise<void>;
}

const createSatsumaQueryExpressMiddleware = (
    apolloServer: ApolloServer,
    apolloServerContext: ApolloServerContext
): SatsumaQueryExpressMiddleware => {
    const satsumaMiddleware = expressMiddleware(apolloServer, {
        context: async () => apolloServerContext,
    });

    satsumaMiddleware.shutdown = async () => {
        await Promise.all(
            Object.values(apolloServerContext.db).map(
                async (db) => await db.destroy()
            )
        );

        void apolloServer.stop();
    };

    return satsumaMiddleware;
};

export const createExpressMiddleware = async (
    config: CreateServerConfig,
    typeDefs?: string = typeDefs,
    resolvers?: ResolversMap = resolvers,
    helpers?: HelpersMap = helpers
): Promise<SatsumaQueryExpressMiddleware> => {
    const apolloServer = await createApolloServer(config, typeDefs, resolvers);
    const apolloServerContext = await createApolloServerContext(config, helpers);

    await apolloServer.start();

    return createSatsumaQueryExpressMiddleware(apolloServer, apolloServerContext);
};

export const startStandaloneServer = async (
    config: CreateServerConfig,
    typeDefs?: string = typeDefs,
    resolvers?: ResolversMap = resolvers,
    helpers?: HelpersMap = helpers
): Promise<string> => {
    const apolloServer = await createApolloServer(config, typeDefs, resolvers);
    const apolloServerContext = await createApolloServerContext(config, helpers);

    return await startStandaloneServerApollo(apolloServer, {
        context: async () => apolloServerContext,
    }).url;
};

export const createStandaloneServer = async (
    config: CreateServerConfig,
    typeDefs?: string = typeDefs,
    resolvers?: ResolversMap = resolvers,
    helpers?: HelpersMap = helpers,
    debug?: boolean = false
): Promise<Express> => {
    const server = await createApolloServer(config, typeDefs, resolvers, debug);
    const context = await createApolloServerContext(config, helpers, debug);

    const app: express.Express = express();
    const httpServer: http.Server = http.createServer(app);

    await server.start();

    app.use(
        cors(),
        bodyParser.json({limit: '50mb'}),
        expressMiddleware(server, {context: async () => context}),
    );

    httpServer.timeout = 30000;

    return {
        httpServer,
        app,
    };
};
