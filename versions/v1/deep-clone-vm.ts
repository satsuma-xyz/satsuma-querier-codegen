import { NodeVM } from "vm2";

import { HelpersMap, ResolversMap } from "./types";

export const createVM = (resolverContext: Record<string, any>): NodeVM =>
  new NodeVM({
    sandbox: {
      ...resolverContext,
    },
    console: "off",
    require: {
      external: false,
    },
    timeout: 60_000,
    allowAsync: true,
    nesting: false,
  });

export const deepCloneVMFunction = (
  obj: ResolversMap | HelpersMap,
  vm: NodeVM,
  map = new WeakMap()
) => {
  if (obj instanceof Function) {
    // This is where we wrap the function in the VM and run it only in the allowed context
    const resolverFn = obj.toString();
    const scriptText = `module.exports = ${resolverFn}`;
    return (...args: any[]) => vm.run(scriptText)(...args);
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
