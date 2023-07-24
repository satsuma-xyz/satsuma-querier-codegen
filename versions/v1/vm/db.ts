import {SatsumaVM} from "./types";
import {Database} from "../types";
import ivm from "isolated-vm";
import pgpInit from 'pg-promise';

const pgp = pgpInit();

export const addDBsToVM = async (vm: SatsumaVM, dbs: Database[]) => {
    await vm.context.eval(`additionalContext.db = {};`);

    for (const db of dbs) {
        if (!db.uri) continue;

        // Set the async callback function in the jail object
        const params = new URL(db.uri);

        // Extract the details
        const client = pgp({
            host: params.hostname,
            port: Number(params.port),
            database: params.pathname.split('/')[1],
            user: params.username,
            password: params.password
        });

        const schema = db.search_path || "public"
        const tableMappings = db.tables || {};

        const CTEs = Object.entries(tableMappings)
            .map(([table, mapping]) => `"${table}" AS (SELECT * FROM "${schema}"."${mapping.actualName}" ${mapping.whereClause ? `WHERE ${mapping.whereClause}` : ""})`);

        vm.jail.setSync(`__executeQuery__${db.name}__query`, new ivm.Reference((query: any, args: any) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const queryWithCTEs = CTEs.length === 0 ? query : `WITH ${CTEs.join(',\n')}\n${query}`
                    resolve(new ivm.ExternalCopy(await client.query(`SET search_path TO ${schema}; ${queryWithCTEs}`, args)).copyInto());
                } catch (error) {
                    reject(error);
                }
            });
        }));

        const code = `
            additionalContext.db.${db.name} = {}
            additionalContext.db.${db.name}.query = (query, args) => {
                const result = __executeQuery__test__query.applySyncPromise(
                    undefined,
                    [query, []],
                    { arguments: { copy: true } }
                );
                return result;
            };
            additionalContext.db.${db.name}.find = (query, args) => {
                const result = __executeQuery__test__query.applySyncPromise(
                    undefined,
                    [query, []],
                    { arguments: { copy: true } }
                );
                return result[0];
            };
            additionalContext.db.${db.name}.schema = "${schema}";
            additionalContext.db.${db.name}.tables = JSON.parse(\`${JSON.stringify({
                ...Object.fromEntries(Object.entries(tableMappings).map(([name, _tableMapping]) => [name, name])),
                ...Object.fromEntries(Object.entries(tableMappings).map(([name, _tableMapping]) => [name.toUpperCase(), name])),
            })}\`);
        `;

        await vm.context.evalClosure(code);
    }

    await vm.jail.set(`__destroyDBs`, new ivm.Callback(async function () {
        pgp.end();
    }, {async: true}));
}