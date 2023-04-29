import knex, {Knex} from 'knex';
import { Database } from './types';
import pg from 'pg';

export class SatsumaKnex {
    private knex: Knex;

    constructor(db: Database) {
        pg.defaults.ssl = false;
        this.knex = knex({
            client: db.type,
            connection: db.uri
        });

        // Use the correct schema
        this.knex.raw('SET search_path TO %', db.search_path || 'public');

        return new Proxy<SatsumaKnex>(this, {
            get(target, propKey, receiver) {
                const targetValue = target[propKey as keyof SatsumaKnex];
                if (typeof targetValue === 'function') {
                    return (...args: any[]) => {
                        return targetValue.apply(target, args);
                    };
                } else {
                    return targetValue;
                }
            }
        });
    }
}