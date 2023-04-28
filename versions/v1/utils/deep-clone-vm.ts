import vm from "vm";
import {HelpersMap, ResolversMap} from "../types";

const getArgs = (func: Function) => {
    // First match everything inside the function argument parens.
    const funcString = func.toString().replace('async (', 'async function (').replace('function(', 'function (');
    var matches = funcString.match(/function\s.*?\(([^)]*)\)/);
    const args = matches?.[1] || '' as string;

    // Split the arguments string into an array comma delimited.
    return args.split(',').map((arg) => {
        // Ensure no inline comments are parsed and trim the whitespace.
        return arg.replace(/\/\*.*\*\//, '').trim();
    }).filter((arg) => !!arg);
}

export const deepCloneVMFunction = (obj: ResolversMap | HelpersMap, resolverContext: Record<string, any>, map = new WeakMap()) => {
    if (obj instanceof Function) {
        // This is where we wrap the function in the VM and run it only in the allowed context
        const resolverFn = obj.toString();
        const fnArgs = getArgs(obj);
        const scriptText = `
            const handler = ${resolverFn};
            handler(${fnArgs.join(', ')});`;
        const newScript = new vm.Script(scriptText);

        return (...args: string[]) => {
            const namedArgs = fnArgs.reduce((acc, arg, i) => {
                acc[arg] = args[i];
                return acc;
            }, {} as Record<string, any>);
            const sandbox = {
                ...resolverContext, // Provide the globals
                ...namedArgs
            };
            return newScript.runInNewContext(sandbox)
        }
    }

    if (map.has(obj)) {
        return map.get(obj);
    }

    const allDesc = Object.getOwnPropertyDescriptors(obj);
    const cloneObj = Object.create(Object.getPrototypeOf(obj), allDesc);

    map.set(obj, cloneObj);

    for (const key of Reflect.ownKeys(obj)) {
        const value = obj[key];

        cloneObj[key] =
            value instanceof Object
                ? deepCloneVMFunction(value, map)
                : value;
    }
    return cloneObj;
};