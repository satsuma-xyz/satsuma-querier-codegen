import {CliVersion, ServerArgs, TypesArgs} from "../../shared/types";
import {generateServer} from "./create-server-files";
import {CreateServerConfig} from "./types";
import {typeGen} from "./typeGen";


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
        await typeGen(config, args.outputPath);
    },
};

export default v1;
