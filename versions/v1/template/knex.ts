import knex, {Knex} from 'knex';
import {Database, TableMapping, TableReplacement} from './types';
import pg from 'pg';

const handleTable = (args: any[], tableMapping?: TableReplacement) => {
    if (tableMapping) {
        const { actualName } = tableMapping;
        args[0] = actualName;
    }
};

export const createSatsumaKnex = async (db: Database): Promise<Knex> => {
    pg.defaults.ssl = false;
    const k = knex({
        client: db.type,
        connection: db.uri
    });
    await k.raw(`SET search_path TO ${db.search_path || "public"}`);

    const tableMappings = db.tables || {};

    const handler = {
        get(target: Knex, propKey: keyof Knex) {
            const targetValue = target[propKey];
            if (typeof targetValue === 'function') {
                return function (this: Knex, ...args: any[]) {
                    if (typeof args[0] === 'string') {
                        const tableMapping = tableMappings[args[0]];
                        handleTable(args, tableMapping);
                        const result = targetValue.apply(target, args);
                        if (tableMapping && tableMapping.whereClause) {
                            return result.whereRaw(tableMapping.whereClause)
                        }
                        return result;
                    }
                    return k[propKey](...args);
                };
            } else {
                return targetValue;
            }
        },
        apply(target: Knex, thisArg: any, args?: any) {
            if (typeof args[0] === 'string') {
                const tableMapping = tableMappings[args[0]];
                handleTable(args, tableMapping);
                const result = target.apply(target, args);
                if (tableMapping && tableMapping.whereClause) {
                    return result.whereRaw(tableMapping.whereClause)
                }
                return result;
            }
            return k.apply(thisArg, args);
        }
    };

    return new Proxy(k, handler) as Knex;
}