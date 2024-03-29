import {CodegenConfig, executeCodegen} from "@graphql-codegen/cli";
import {CreateServerConfig} from "./types";
import {createRemoteExecutableSchema} from "./server";
import {mergeTypeDefs} from '@graphql-tools/merge';
import * as path from "path";
import {print, printSchema} from "graphql/index";
import * as fs from "fs";

const gqlCodegenConfig = (schemaPath: string, outputPath: string): CodegenConfig => ({
    overwrite: true,
    schema: schemaPath,
    pluginLoader: async (name: string) => {
        return await import(name);
    },
    generates: {
        [outputPath]: {
            plugins: ["typescript"],
        },
    },
})
const WARNING_LINES = [
    'WARNING: Do not manually edit this file.',
    '',
    'Modifying this file may cause unintended side effects and may be overwritten',
    'during the build process or when updating the codebase.',
    '',
    'Make changes to this file by running `npx @satsuma/cli codegen ...`',
];
const FILE_EDIT_WARNING_GQL = WARNING_LINES.map(line => ` # ${line}`).join("\n")
const FILE_EDIT_WARNING_JS = `/*********************************************
${WARNING_LINES.map(line => ` * ${line}`).join("\n")}
 *********************************************/
`;
const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const writeDbConstants = (tableNames: string[], schema = 'public') => {
    return `// schema and tables are here for reference only.\n// use context.db.entities.schema and context.db.entities.tables to access these variables\nconst schema = '${schema}';\n\nconst tables = {
${tableNames.map((tableName) => `        ${camelToSnakeCase(tableName).toUpperCase()}: "${tableName}",`).join("\n")}
}`;
}

const existingTypes = `
export type Database = {
    schema: string;
    tables: Record<string, string>;
    tablesRaw: Record<string, {name: string; description?: string}>;
    
    query: (query: string, params?: any[]) => Promise<any[]>;
    find: (query: string, params?: any[]) => Promise<any>;
}

export interface HelpersMap {
  [p: string]: Function | HelpersMap;
}

export type Context = {
    db: {
        entities: Database;
    };
    utils: {
        _: any; // Lodash
        dateFns: any;
        uuid: {
            v5: () => string;
            v4: () => string;
            v3: () => string;
            v2: () => string;
            v1: () => string;
        };
        validator: any;
    };
    helpers: HelpersMap
}
`;

export async function typeGen(config: CreateServerConfig, outputPath: string) {
    const {typeDefs} = await import(config.typeDefsFile);
    const remoteSchema = await createRemoteExecutableSchema(config.graphql[0]);
    const remoteTypeDefs = printSchema(remoteSchema);

    const schema = mergeTypeDefs([typeDefs, remoteTypeDefs]);
    const schemaPath = path.resolve(outputPath, './schema.graphql');
    const schemaString = print(schema);

    fs.writeFileSync(schemaPath, `${FILE_EDIT_WARNING_GQL}\n\n${schemaString}\n`);

    const typesPath = path.resolve(outputPath, "./schema.ts");

    const tableNames: string[] = [];
    for (const db of config.databases) {
        const tables = db.tables || {};
        for (const table in tables) {
            tableNames.push(table);
        }
    }

    // Manually call the codegen tool & write outputs
    const gqlCodegen = gqlCodegenConfig(schemaPath, typesPath);
    const outputs = await executeCodegen(gqlCodegen);
    for (const output of outputs) {
        fs.writeFileSync(output.filename, output.content);
    }

    // Open the file and add the table constants and the warning
    const typesContent = fs.readFileSync(typesPath, {encoding: "utf-8"});
    fs.writeFileSync(typesPath, `${FILE_EDIT_WARNING_JS}\n\n${existingTypes}\n\n${writeDbConstants(tableNames, config.databases[0]?.search_path)}\n\n${typesContent}`);
}