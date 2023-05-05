import { CliVersion, ServerArgs, TypesArgs } from "../../shared/types";
import { generateServer } from "./create-server-files";
import { CreateServerConfig } from "./template/types";
import {createNewSchema} from "./template/server";
import * as fs from "fs";
import * as path from "path";
import {printSchema} from "graphql";
import type { CodegenConfig } from "@graphql-codegen/cli";
import {generate} from "@graphql-codegen/cli";

const gqlCodegenConfig = (schemaPath: string, outputPath: string): CodegenConfig => ({
  overwrite: true,
  schema: schemaPath,
  generates: {
    [outputPath]: {
      plugins: ["typescript"],
    },
  },
})


const v1: CliVersion = {
  server: async (args: ServerArgs) => {
    const config: CreateServerConfig = {
      databases: args.databases,
      graphql: args.graphql,
      resolverFile: args.resolverFile,
      typeDefsFile: args.typeDefsFile,
      helpersFile: args.helpersFile,
    };
    return generateServer(
      config,
      args.metadata,
      args.inputPath,
      args.outputPath
    );
  },
  types: async (args: TypesArgs) => {
    const config: CreateServerConfig = {
      databases: args.databases,
      graphql: args.graphql,
      resolverFile: args.resolverFile,
      typeDefsFile: args.typeDefsFile,
      helpersFile: args.helpersFile,
    };
    const {typeDefs} = await import(config.typeDefsFile);
    const {resolvers} = await import(config.resolverFile);
    const schema = await createNewSchema(args.graphql, typeDefs, resolvers);
    const schemaPath = path.resolve(args.outputPath, './schema.graphql');
    const typesPath = path.resolve(args.outputPath, "./schema.ts")
    fs.writeFileSync(schemaPath, printSchema(schema));
    await generate(gqlCodegenConfig(schemaPath, typesPath));
  },
};

export default v1;
