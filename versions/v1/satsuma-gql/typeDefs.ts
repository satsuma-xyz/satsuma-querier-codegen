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
        customQueryHelpers: CustomQueryHelpers
    }
`;
