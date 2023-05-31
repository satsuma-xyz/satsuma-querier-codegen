/*********************************************
 * WARNING: Do not manually edit this file.
 *
 * Modifying this file may cause unintended side effects and may be overwritten
 * during the build process or when updating the codebase.
 *
 * Make changes to this file by running `npx @satsuma/cli codegen ...`
 *********************************************/



export type Database = {
    schema: string;
    tables: Record<string, string>;
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

export type Maybe<T> = T | null;

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  BigDecimal: any;
  BigInt: any;
  Bytes: any;
};

export type AvailableEntityTable = {
  __typename?: 'AvailableEntityTable';
  columns?: Maybe<Array<Maybe<Scalars['String']>>>;
  description?: Maybe<Scalars['String']>;
  name: Scalars['String'];
};

export type CustomQueryHelpers = {
  __typename?: 'CustomQueryHelpers';
  available_entity_tables?: Maybe<Array<Maybe<AvailableEntityTable>>>;
  db_uri?: Maybe<Scalars['String']>;
  schema?: Maybe<Scalars['String']>;
  something_else?: Maybe<Scalars['String']>;
};