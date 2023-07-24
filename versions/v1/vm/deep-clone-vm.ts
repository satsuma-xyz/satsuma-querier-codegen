import ivm from 'isolated-vm';
import {Database, HelpersMap, ResolversMap} from "../types";
import {SatsumaVM} from "./types";
import {addDateFnsToVM} from "./external-wrappers/dateFns";
import {addLodashToVM} from "./external-wrappers/lodash";
import {addUUIDToVM} from "./external-wrappers/uuid";
import {addValidatorToVM} from "./external-wrappers/validator";
import {addConsoleToVM} from "./external-wrappers/console";
import {addDBsToVM} from "./db";

const addExternalLibsToVM = async (vm: SatsumaVM) => {
    await addLodashToVM(vm);
    await addDateFnsToVM(vm);
    await addUUIDToVM(vm);
    await addValidatorToVM(vm);
}

const addHelpersToVM = (vm: SatsumaVM, helpers: HelpersMap) => {
    // Convert helpers into a string, calling `toString` on each function. Deal with recursion.
    // @ts-ignore
    const convertHelpers = (helpers: any) => Object.keys(helpers).reduce((acc, key) => {
        const fn = helpers[key];
        if (typeof fn === 'object') {
            return acc + `${key}: {${convertHelpers(fn)}},`;
        }
        return acc + `${key}: ${fn.toString()},`;
    }, '');

    vm.context.evalSync(`additionalContext.helpers = {\n${convertHelpers(helpers)}\n};`);
}

export const createVM = async (resolverContext: Record<string, any>, helpers: HelpersMap, dbs: Database[]): Promise<SatsumaVM> => {
    const isolate = new ivm.Isolate({memoryLimit: 2048}); // 2GB
    const context = isolate.createContextSync();
    const jail = context.global;
    jail.setSync('global', jail.derefInto());
    context.global.setSync('_ivm', new ivm.Reference(ivm));

    // for (const [key, value] of Object.entries(resolverContext)) {
    //     jail.setSync(key, new ivm.Reference(value));
    // }

    context.evalSync(`const additionalContext = {helpers: {}, utils: {}};`);
    const bundle = {
        jail,
        context,
        vm: isolate,
    };
    addHelpersToVM(bundle, helpers);
    addConsoleToVM(bundle);
    await addExternalLibsToVM(bundle);
    await addDBsToVM(bundle, dbs);

    return bundle;
}

// This is where the magic happens.
// We replace the resolver with a function that creates an isolated-vm, and then runs the resolver in that VM.
const wrapResolverInVM = (resolver: any, helpers: HelpersMap, dbs: Database[]) => async (root: any, args: any, contextArg: any, info: any) => {
    try {
        const {context, jail, vm} = await createVM({}, helpers, dbs);
        let finalResult: any;
        jail.setSync('_setResult', new ivm.Callback((res: any) => {
            finalResult = res;
        }));

        const asyncFnStr = `const untrustedResolver = ${resolver.toString()};`;
        await context.eval(asyncFnStr);

        await context.evalClosure(`
                    untrustedResolver($0, $1, {...$2, ...additionalContext}, $3).then(_setResult).then(__destroyDBs);
                `, [root, args, contextArg, info], {arguments: {copy: true}});

        return finalResult;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export const deepCloneVMResolvers = (
    obj: ResolversMap,
    helpers: HelpersMap,
    dbs: Database[],
    map = new WeakMap()
) => {
    if (obj instanceof Function) {
        // This is where we wrap the function in the VM and run it only in the allowed context
        return wrapResolverInVM(obj, helpers, dbs);
    }
    if (map.has(obj)) {
        return map.get(obj);
    }

    const allDesc = Object.getOwnPropertyDescriptors(obj);
    const cloneObj = Object.create(Object.getPrototypeOf(obj), allDesc);

    map.set(obj, cloneObj);

    for (const key of Reflect.ownKeys(obj)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const value = obj[key];

        cloneObj[key] =
            value instanceof Object
                ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                deepCloneVMResolvers(value, helpers, dbs, map)
                : value;
    }
    return cloneObj;
};
