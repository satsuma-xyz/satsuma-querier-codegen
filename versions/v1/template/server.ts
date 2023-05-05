// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// This file should be placed alongside the user's files.

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { startStandaloneServer as startStandaloneServerApollo } from "@apollo/server/standalone";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { makeExecutableSchema, mergeSchemas } from "@graphql-tools/schema";
import { schemaFromExecutor, wrapSchema } from "@graphql-tools/wrap";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as http from "http";

import { createVM, deepCloneVMFunction } from "./deep-clone-vm";
import { createSatsumaKnex } from "./knex";
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
  console,
};

/**
 * Create a remote executable schema from a remote graphql server.
 * @param gqlServer
 */
const createRemoteExecutableSchema = async (gqlServer: GraphQLServer) => {
  const link = buildHTTPExecutor({
    endpoint: gqlServer.uri,
  });
  const remoteSchema = await schemaFromExecutor(link);
  return wrapSchema({
    schema: remoteSchema,
    executor: link,
  });
};

/**
 * Create a new schema by merging the remote schema with the customer schema.
 */
export const createNewSchema = async (
  gqlServers: GraphQLServer[],
  typeDefs?: string = typeDefs,
  resolvers?: ResolversMap = resolvers
) => {
  const safeResolvers = deepCloneVMFunction(resolvers, createVM(globalContext));

  const customerSchema = makeExecutableSchema({
    typeDefs,
    resolvers: safeResolvers,
  });

  const remoteExecutableSchemas = await Promise.all(
    gqlServers.map((gqlServer) => createRemoteExecutableSchema(gqlServer))
  );

  // Merge the two schemas
  return mergeSchemas({
    schemas: [...remoteExecutableSchemas, customerSchema],
  });
};

export const createApolloServer = async (
  config: CreateServerConfig,
  typeDefs?: string = typeDefs,
  resolvers?: ResolversMap = resolvers
): Promise<ApolloServer> => {
  const schema = await createNewSchema(config.graphql, typeDefs, resolvers);
  return new ApolloServer({ schema, introspection: true });
};

interface ApolloServerContext {
  db: Record<string, Knex<any, unknown[]>>;
  helpers?: HelpersMap;
}

export const createApolloServerContext = async (
  config: CreateServerConfig,
  helpers?: HelpersMap = helpers
): Promise<ApolloServerContext> => {
  const databases: Record<string, Knex<any, unknown[]>> = {};
  for (const db of config.databases) {
    databases[db.name] = await createSatsumaKnex(db);
  }

  const helpersSafe = deepCloneVMFunction(helpers, createVM(globalContext));

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

    void apolloServer.stop()
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
  helpers?: HelpersMap = helpers
): Promise<Express> => {
  const server = await createApolloServer(config, typeDefs, resolvers);
  const context = await createApolloServerContext(config, helpers);

  const app: express.Express = express();
  const httpServer: http.Server = http.createServer(app);

  await server.start();

  app.use(
    cors(),
    bodyParser.json({ limit: "50mb" }),
    expressMiddleware(server, { context })
  );

  return {
    httpServer,
    app,
  };
};
