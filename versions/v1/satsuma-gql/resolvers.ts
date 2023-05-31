import {Context, CustomQueryHelpers} from "./schema";

export const resolvers = {
    Query: {
        customQueryHelpers: async (root: any, args: any, context: Context, info: any): Promise<CustomQueryHelpers> => {
            // Get a list of the fields that are being requested.
            const result: CustomQueryHelpers = {
                schema: context.db.entities.schema,
            };

            // Get the list of tables and their descriptions.
            result.available_entity_tables = await Promise.all(
                Object.entries(context.db.entities.tablesRaw).map(async (table) => {
                    const [tableName, tableMapping] = table as [string, {
                        description?: string;
                        name: string,
                        actualName: string
                    }];

                    let columns: Array<string> = (
                        await context.db.entities.raw(
                            `SELECT * FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
                            [context.db.entities.schema, tableMapping.actualName]
                        )
                    ).rows.map((row: any) => row.column_name);

                    return {
                        name: tableName,
                        description: tableMapping.description,
                        columns
                    }
                }));

            return result;
        },
    }
}