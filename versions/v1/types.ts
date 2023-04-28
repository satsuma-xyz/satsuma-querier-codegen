export type ResolversMap = Record<string, Function>;
export type TypeDefs = string;
export type HelpersMap = {
    [p: string]: Function | HelpersMap
};


export type Database = {
    uri: string;
    name: string;
    type: 'pg';
    search_path?: string;
}

export type GraphQLServer = {
    uri: string;
}

export type TableMapping = {
    [knexName: string]: string;
};

export type CreateServerConfig = {
    databases: Database[];
    graphql: GraphQLServer[];
    tables: TableMapping;
    resolverFile: string;
    typeDefsFile: string;
    helpersFile: string;
}