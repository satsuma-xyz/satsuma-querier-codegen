import { NodeVM } from "vm2";

import { HelpersMap, ResolversMap } from "./types";

export const createVM = (resolverContext: Record<string, any>): NodeVM =>
  new NodeVM({
    sandbox: {
      ...resolverContext,
    },
    console: "redirect",
    require: {
      external: false,
    },
    timeout: 1000,
    allowAsync: true,
    nesting: false,
  });

// eslint-disable-next-line @typescript-eslint/ban-types
const getArgs = (func: Function) => {
  // First match everything inside the function argument parens.
  const funcString = func
    .toString()
    .replace("async (", "async function (")
    .replace("function(", "function (");
  const matches = funcString.match(/function\s.*?\(([^)]*)\)/);
  const args = matches?.[1] || ("" as string);

  // Split the arguments string into an array comma delimited.
  return args
    .split(",")
    .map((arg) => {
      // Ensure no inline comments are parsed and trim the whitespace.
      return arg.replace(/\/\*.*\*\//, "").trim();
    })
    .filter((arg) => !!arg);
};

export const deepCloneVMFunction = (
  obj: ResolversMap | HelpersMap,
  vm: NodeVM,
  map = new WeakMap()
) => {
  if (obj instanceof Function) {
    // This is where we wrap the function in the VM and run it only in the allowed context
    const resolverFn = obj.toString();
    const scriptText = resolverFn;
    console.log('wrapped script ', `module.exports = ${scriptText}`);
    return vm.run(scriptText);
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
          deepCloneVMFunction(value, vm, map)
        : value;
  }
  return cloneObj;
};
