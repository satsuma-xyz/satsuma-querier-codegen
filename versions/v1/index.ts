import {CliVersion, ServerArgs, TypesArgs} from "../../shared/types";
import {generateServer} from "./create-server-files";
import {CreateServerConfig} from "./template/types";
import {createNewSchema} from "./template/server";
import * as fs from "fs";
import * as path from "path";
import {printSchema} from "graphql";
import type {CodegenConfig} from "@graphql-codegen/cli";
import {generate} from "@graphql-codegen/cli";
import * as child_process from "child_process";

const GQL_CODEGEN_CONFIG: CodegenConfig = {
    overwrite: true,
    schema: "./schema.graphql",
    generates: {
        ["./schema.ts"]: {
            plugins: ["typescript.js"],
        },
    },
};

const gqlCodegenConfig = (schemaPath: string, outputPath: string) => ({
    overwrite: true,
    schema: schemaPath,
    generates: {
        [outputPath]: {
            plugins: ["typescript.js"],
        },
    },
})

const WARNING_LINES = [
    'WARNING: Do not manually edit this file.',
    '',
    'Modifying this file may cause unintended side effects and may be overwritten',
    'during the build process or when updating the codebase.',
    '',
    'Make changes to this file by running `npx @satsuma/cli types ...`',
];

const FILE_EDIT_WARNING_GQL  = WARNING_LINES.map(line => ` # ${line}`).join("\n")

const FILE_EDIT_WARNING_JS  = `
/***************
${WARNING_LINES.map(line => ` * ${line}`).join("\n")}
 ***************/
`;

const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const writeTableConstants = (tableNames: string[]) => {
    return `export const tables = {
${tableNames.map((tableName) => `        ${camelToSnakeCase(tableName).toUpperCase()}: "${tableName}",`).join("\n")}
}`;
}


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
        const schemaString = printSchema(schema);
        fs.writeFileSync(schemaPath, `${FILE_EDIT_WARNING_GQL}\n\n${schemaString}\n`);

        const typesPath = path.resolve(args.outputPath, "./schema.ts");

        const tableNames: string[] = [];
        for (const db of args.databases) {
            const tables = db.tables || {};
            for (const table in tables) {
                tableNames.push(table);
            }
        }

        fs.writeFileSync(path.resolve(process.cwd(), "typescript.js"), `const {plugin} = require("@graphql-codegen/typescript");\nmodule.exports = plugin;`);
        const gqlCodegen = gqlCodegenConfig(schemaPath, typesPath);
        await generate(gqlCodegen);

        // Write config to config file
        // const configPath = path.resolve(args.outputPath, "codegen.ts");
        // const configContent = `export default ${JSON.stringify(GQL_CODEGEN_CONFIG, null, 4)};\n`;
        // fs.writeFileSync(configPath, configContent);
        // child_process.execSync(`npx graphql-codegen --config ${configPath}`, {cwd: args.outputPath});

        // Clean up the config
        // fs.unlinkSync(configPath);

        // Open the file and add the table constants and the warning
        const typesContent = fs.readFileSync(typesPath, {encoding: "utf-8"});
        fs.writeFileSync(typesPath, `${FILE_EDIT_WARNING_JS}\n\n${writeTableConstants(tableNames)}\n\n${typesContent}`);
    },
};

export default v1;
