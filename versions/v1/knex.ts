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
    get(target: Knex, propKey: (keyof Knex | "tables" | "tablesRaw")) {
      if (propKey === "schema") {
        return db.search_path || "public";
      }

      // Special case to return tables info
      if (propKey === "tables") {
        return Object.fromEntries(Object.entries(tableMappings).map(([name, _tableMapping]) => [name, name]));
      }
      if (propKey === "tablesRaw") {
        return tableMappings;
      }

      // Handle raw queries by injecting CTEs.
      // Currently, this breaks if there's another WITH clause in the query.
      if (propKey === "raw") {
        return function (this: Knex, ...args: any[]) {
          const CTEs = Object.entries(tableMappings)
              .map(([table, mapping]) => `"${table}" AS (SELECT * FROM ${mapping.actualName} ${mapping.whereClause ? `WHERE ${mapping.whereClause}` : ""})`)
          return target.raw(`WITH ${CTEs.join(',\n')}\n${args[0]}`, ...args.slice(1));
        };
      }

      const targetValue = target[propKey];
      if (typeof targetValue === "function") {
        return function (this: Knex, ...args: any[]) {
          if (typeof args[0] === "string") {
            const tableMapping = tableMappings[args[0]];
            handleTable(args, tableMapping);
            const result = targetValue.apply(target, args);
            if (tableMapping && tableMapping.whereClause) {
              return result.whereRaw(tableMapping.whereClause);
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
