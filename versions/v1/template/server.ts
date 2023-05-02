// @ts-nocheck
// This file should be placed alongside the user's files.

import {makeExecutableSchema, mergeSchemas} from '@graphql-tools/schema';
import {schemaFromExecutor, wrapSchema} from '@graphql-tools/wrap';
import {buildHTTPExecutor} from '@graphql-tools/executor-http'
import {ApolloServer} from '@apollo/server';
import {deepCloneVMFunction} from "./deep-clone-vm";
import {CreateServerConfig, GraphQLServer, HelpersMap, ResolversMap} from "./types";
import {createSatsumaKnex} from "./knex";

let resolvers = {};
let typeDefs = "";
let helpers = {};

void (async () => {
    try {
        const h = await import("./helpers");
        helpers = h.helpers;
    } catch (e) {
    }
    try {
        const r = await import("./resolvers");
        resolvers = r.resolvers;
    } catch (e) {
    }
    try {
        const t = await import("./typeDefs");
        typeDefs = t.typeDefs;
    } catch (e) {
    }
})();

const globalContext = {
    console,
}

/**
 * Create a remote executable schema from a remote graphql server.
 * @param gqlServer
 */
const createRemoteExecutableSchema = async (gqlServer: GraphQLServer) => {
    const link = buildHTTPExecutor({
        endpoint: gqlServer.uri
    })
    const remoteSchema = await schemaFromExecutor(link);
    return wrapSchema({
        schema: remoteSchema,
        link
    });
};

/**
 * Create a new schema by merging the remote schema with the customer schema.
 */
export const createNewSchema = async (gqlServers: GraphQLServer[], typeDefs?: string = typeDefs, resolvers?: ResolversMap = resolvers) => {
    const safeResolvers = deepCloneVMFunction(resolvers, globalContext);

    const customerSchema = makeExecutableSchema({
        typeDefs,
        resolvers: safeResolvers
    });

    const remoteExecutableSchemas = await Promise.all(gqlServers.map((gqlServer) => createRemoteExecutableSchema(gqlServer)));

    // Merge the two schemas
    return mergeSchemas({
        schemas: [
            ...remoteExecutableSchemas,
            customerSchema
        ]
    });
};

export const createServer = async (config: CreateServerConfig, typeDefs?: string = typeDefs, resolvers?: ResolversMap = resolvers, helpers?: HelpersMap = helpers): Promise<ApolloServer> => {
    const schema = await createNewSchema(config.graphql, typeDefs, resolvers);
    const helpersSafe = deepCloneVMFunction(helpers, globalContext);

    const databases: Record<string, any> = {};
    for (const db of config.databases) {
        databases[db.name] = await createSatsumaKnex(db);
    }

    return new ApolloServer({
        schema,
        context: {
            db: databases,
            helpers: helpersSafe,
        }
    });
};
