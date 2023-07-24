import {SatsumaVM} from "../types";
import fs from "fs";
import path from "path";

export const addLodashToVM = (vm: SatsumaVM) => {
    const lodashCode = fs.readFileSync(path.resolve(path.join(path.dirname(__filename), '../../../../', 'node_modules/lodash/lodash.js')), 'utf-8');
    vm.context.evalSync(lodashCode);
    vm.context.evalSync(`additionalContext.utils._ = _;`);
}