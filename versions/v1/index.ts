import { CliVersion, ServerArgs, TypesArgs } from "../../shared/types";
import { generateServer } from "./create-server-files";
import { CreateServerConfig } from "./template/types";
import {createNewSchema} from "./template/server";
import * as fs from "fs";
import * as path from "path";
import {printSchema} from "graphql";

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
    fs.writeFileSync(path.resolve(args.outputPath, './schema.graphql'), printSchema(schema));
    // child_process.execSync('graphql-codegen --config versions/v1/types-codegen.config.ts', {shell: '/bin/bash', stdio : 'pipe'});
  },
};

export default v1;
