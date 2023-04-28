// @ts-nocheck
// This file should be placed alongside the user's files.

import { makeExecutableSchema, mergeSchemas } from '@graphql-tools/schema';
import { schemaFromExecutor, wrapSchema } from '@graphql-tools/wrap';
import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { ApolloServer } from 'apollo-server';
import knex from 'knex';
import pg from 'pg';
import { deepCloneVMFunction } from "./deep-clone-vm";
import { CreateServerConfig, Database, GraphQLServer } from "./types";
import { resolvers } from "./resolvers";
import { typeDefs } from "./typeDefs";

let helpers = {};

void (async () => {
    try {
        const h = await import("./helpers");
        helpers = h.helpers;
    } catch (e) {
    }
})();

const globalContext = {
    console,
    knex,
}

/**
 * Set up a knex object for db querying
 * @param db
 */
const createKnex = (db: Database) => {
    pg.defaults.ssl = false;
    return knex({
        client: db.type,
        connection: db.uri
    });
};

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
export const createNewSchema = async (gqlServers: GraphQLServer[]) => {
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

export const createServer = async (config: CreateServerConfig) => {
    const schema = await createNewSchema(config.graphql);
    const helpersSafe = deepCloneVMFunction(helpers, globalContext);

    const databases: Record<string, any> = {};
    for (const db of config.databases) {
        databases[db.name] = createKnex(db);
    }

    return new ApolloServer({
        schema,
        context: {
            db: databases,
            helpers: helpersSafe,
        }
    });
};