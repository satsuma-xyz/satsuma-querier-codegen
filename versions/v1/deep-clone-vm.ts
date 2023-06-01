import { NodeVM } from "vm2";

import { HelpersMap, ResolversMap } from "./types";

const REDIRECTED_CONSOLE = "\n\nFROM VM:\n";

export const createVM = (resolverContext: Record<string, any>): NodeVM => {
    const vm = new NodeVM({
        sandbox: {
            ...resolverContext,
        },
        console: "redirect",
        require: {
            external: false,
        },
        timeout: 60_000,
        allowAsync: true,
        nesting: false,
    });

    // Listen to the console events here
    vm.on('console.log', (...args) => {
        console.log(REDIRECTED_CONSOLE, ...args, "\n");
    });

    vm.on('console.error', (...args) => {
        console.error(REDIRECTED_CONSOLE, ...args, "\n");
    });

    vm.on('console.table', (...args) => {
        console.table(...args);
    });

    vm.on('console.info', (...args) => {
        console.info(REDIRECTED_CONSOLE, ...args, "\n");
    });

    vm.on('console.debug', (...args) => {
        console.debug(REDIRECTED_CONSOLE, ...args, "\n");
    });

    vm.on('console.trace', (...args) => {
        console.trace(...args);
    });

    vm.on('console.assert', (...args) => {
        console.assert(...args);
    });

    vm.on('console.clear', () => {
        console.clear();
    });

    return vm;
}

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
