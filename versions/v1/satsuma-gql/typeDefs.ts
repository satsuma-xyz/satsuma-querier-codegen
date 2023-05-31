export const typeDefs = `
    type AvailableEntityTable {
        name: String!
        description: String
        columns: [String]
    }
    
    type CustomQueryHelpers {
      available_entity_tables: [AvailableEntityTable]
      schema: String
    }
    
    type Query {
        # Your type definitions here
        testing(skip: Int = 0, limit: Int = 100): [CustomResponseItem]!
        customQueryHelpers: CustomQueryHelpers
        randomEntityCountTest: RandomEntityCountTest!
    }
`;
