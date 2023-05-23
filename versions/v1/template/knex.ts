import knex, { Knex } from "knex";
import pg from "pg";

import {Database, TableMapping, TableReplacement} from "./types";

const handleTable = (args: any[], tableMapping?: TableReplacement) => {
  if (tableMapping) {
    const { actualName } = tableMapping;
    args[0] = actualName;
  }
};

export const createSatsumaKnex = async (
  db: Database
): Promise<Knex<any, unknown[]>> => {
  pg.defaults.ssl = false;
  const k = knex({
    client: db.type,
    connection: db.uri,
  });
  await k.raw(`SET search_path TO ${db.search_path || "public"}`);

  // Get all table mappings and add them to the knex instance as CTEs.
  const tableMappings = db.tables || {};

  const handler = {
    get(target: Knex, propKey: (keyof Knex | "tables")) {
      if (propKey === "schema") {
        return db.search_path || "public";
      }

      // Special case to return all tables
      if (propKey === "tables") {
        return Object.entries(tableMappings).map(([name, _tableMapping]) => name);
      }

      for (const [table, mapping] of Object.entries(tableMappings)) {
        target.with(
            table,
            target.raw(
                `SELECT * FROM ${mapping.actualName} ${mapping.whereClause ? `WHERE ${mapping.whereClause}` : ""}`,
            )
        )
      }

      return target[propKey];
    },
    apply(target: Knex, thisArg: any, args?: any) {
      if (typeof args[0] === "string") {
        const tableMapping = tableMappings[args[0]];
        handleTable(args, tableMapping);
        const result = target.apply(target, args);
        if (tableMapping && tableMapping.whereClause) {
          return result.whereRaw(tableMapping.whereClause);
        }
        return result;
      }
      return k.apply(thisArg, args);
    },
  };

  return new Proxy(k, handler) as Knex;
};
