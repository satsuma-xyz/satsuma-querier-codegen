import {CodegenConfig, executeCodegen} from "@graphql-codegen/cli";
import {CreateServerConfig} from "./types";
import {createNewSchema} from "./server";
import path from "path";
import {printSchema} from "graphql/index";
import fs from "fs";

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
    return `export const schema = '${schema}';\n\nexport const tables = {
${tableNames.map((tableName) => `        ${camelToSnakeCase(tableName).toUpperCase()}: "${tableName}",`).join("\n")}
}`;
}

const existingTypes = `
export type Database = {
    dbUri: string;
    schema: string;
    tables: Array<string>;
    tablesRaw: Record<string, {name: string; description?: string}>;
    // Todo: This is actually a knex object, but we don't want to import knex here, so we just used any
} & any;

export interface HelpersMap {
  [p: string]: Function | HelpersMap;
}

export type Context = {
    db: {
        entities: Database;
    },
    helpers: HelpersMap
}

`

export async function typeGen(config: CreateServerConfig, outputPath: string) {
    const {typeDefs} = await import(config.typeDefsFile);
    const {resolvers} = await import(config.resolverFile);
    const schema = await createNewSchema(config.graphql, typeDefs, resolvers);
    const schemaPath = path.resolve(outputPath, './schema.graphql');
    const schemaString = printSchema(schema);
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