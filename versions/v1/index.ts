import {CliVersion, ServerArgs} from "../../shared/types";
import {generateServer} from "./create-server-files";
import {CreateServerConfig} from "./template/types";

const v1: CliVersion = {
    server: async (args: ServerArgs) => {
        const config: CreateServerConfig = {
            databases: args.databases,
            graphql: args.graphql,
            resolverFile: args.resolverFile,
            typeDefsFile: args.typeDefsFile,
            helpersFile: args.helpersFile,
        }
        return generateServer(config, args.inputPath, args.outputPath);
    },
    types: async (args) => {
        // export const saveTypeDefs = () => createNewSchema().then(schema => {
        //     fs.writeFileSync('./schema.graphql', printSchema(schema));
        // });
        // child_process.execSync('graphql-codegen --config versions/v1/types-codegen.config.ts', {shell: '/bin/bash', stdio : 'pipe'});
    },
    upgrade: async (args) => {
        throw new Error('Theres nothing before v1.0.0');
    }
}

export default v1;
