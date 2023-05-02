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
    tables?: TableMapping;
}

export type GraphQLServer = {
    uri: string;
}

export type TableReplacement = {
    actualName: string;
    whereClause?: string;
}

export type TableMapping = {
    [knexName: string]: TableReplacement;
};

export type CreateServerConfig = {
    databases: Database[];
    graphql: GraphQLServer[];
    resolverFile: string;
    typeDefsFile: string;
    helpersFile?: string;
}