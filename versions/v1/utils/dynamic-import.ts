import {HelpersMap, ResolversMap, TypeDefs} from "../types";

export const getHelpers = async (): Promise<HelpersMap> => {
    try {
        const {helpers}  = await import('./helpers');
        return helpers
    } catch (e) {
        return {};
    }
}

export const getTypeDefs = async (): Promise<TypeDefs> => {
    const {typeDefs} = await import('./typeDefs');
    return typeDefs;
}

export const getResolvers = async (): Promise<ResolversMap> => {
    const {resolvers} = await import('./resolvers');
    return resolvers;
}