import {HelpersMap, ResolversMap, TypeDefs} from "../types";

const customerCode = async (file: string) => {
    return await import(`./${file}#${new Date().getTime()}`)
};

export const getHelpers = async (): Promise<HelpersMap> => {
    return customerCode('./helpers.ts');
}

export const getTypeDefs = async (): Promise<TypeDefs> => {
    return customerCode('./typeDefs.ts');
}

export const getResolvers = async (): Promise<ResolversMap> => {
    return customerCode('./resolvers.ts');
}