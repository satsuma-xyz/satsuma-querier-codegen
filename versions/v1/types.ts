// eslint-disable-next-line @typescript-eslint/ban-types
export interface ResolversMap {
  [p: string]: Function | ResolversMap;
}

export type TypeDefs = string;
export interface HelpersMap {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [p: string]: Function | HelpersMap;
}

export interface Database {
  uri?: string;
  name: string;
  type: "pg";
  search_path?: string;
  tables?: TableMapping;
}

export interface GraphQLServer {
  uri: string;
}

export interface TableReplacement {
  actualName: string;
  whereClause?: string;
  description?: string;
}

export interface TableMapping {
  [knexName: string]: TableReplacement;
}

export interface CreateServerConfig {
  databases: Database[];
  graphql: GraphQLServer[];
  resolverFile: string;
  typeDefsFile: string;
  helpersFile?: string;
}
