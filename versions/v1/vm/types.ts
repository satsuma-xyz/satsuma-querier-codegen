import ivm from "isolated-vm";

export type SatsumaVM = {
    jail: ivm.Reference,
    vm: ivm.Isolate,
    context: ivm.Context,
}