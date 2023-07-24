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

        vm.jail.setSync(`__executeQuery__${db.name}__query`, new ivm.Reference((query: any, args: any) => {
            return new Promise(async (resolve, reject) => {
                try {
                    resolve(new ivm.ExternalCopy(await client.query(query, args)).copyInto());
                } catch (error) {
                    reject(error);
                }
            });
        }));

        await vm.context.evalClosure(`
            additionalContext.db.${db.name} = {}
            additionalContext.db.${db.name}.query = (query, args) => {
                const result = __executeQuery__test__query.applySyncPromise(
                    undefined,
                    [query, []],
                    { arguments: { copy: true } }
                );
                return result;
            }
            additionalContext.db.${db.name}.find = (query, args) => {
                const result = __executeQuery__test__query.applySyncPromise(
                    undefined,
                    [query, []],
                    { arguments: { copy: true } }
                );
                return result[0];
            }
        `);
    }

    await vm.jail.set(`__destroyDBs`, new ivm.Callback(async function () {
        pgp.end();
    }, {async: true}));
}