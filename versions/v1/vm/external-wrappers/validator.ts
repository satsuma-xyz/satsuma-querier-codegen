import {SatsumaVM} from "../types";
import * as validator from 'validator';

export const addValidatorToVM = async (vm: SatsumaVM) => {
    await vm.context.eval(`additionalContext.utils.validator = {};`);

    for (const operationName of Object.keys(validator)) {
        // @ts-ignore
        const operation = validator[operationName];

        if (typeof operation !== 'function') {
            continue;
        }

        await vm.jail.set(`validator__${operationName}`, operation);
        await vm.context.eval(`additionalContext.utils.validator.${operationName} = validator__${operationName};`);
    }
}