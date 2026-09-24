import { compileSchema, type ByteBuffer, type Definition, type Field, type Schema } from "kiwi-schema";
import { isRec } from "./guards";

export type ReadValue = (bb: ByteBuffer) => unknown;

export type KiwiDecoder = {
  definition: (name: string) => Definition;
  value: (type: string | null) => ReadValue;
  field: (field: Field) => ReadValue;
};

const PRIMITIVES: Readonly<Record<string, ReadValue>> = {
  bool: (bb) => bb.readByte() !== 0,
  byte: (bb) => bb.readByte(),
  int: (bb) => bb.readVarInt(),
  uint: (bb) => bb.readVarUint(),
  float: (bb) => bb.readVarFloat(),
  string: (bb) => bb.readString(),
  int64: (bb) => bb.readVarInt64(),
  uint64: (bb) => bb.readVarUint64(),
};

const enumReader = (definition: Definition): ReadValue => {
  const names = new Map(definition.fields.map((f) => [f.value, f.name]));
  return (bb) => names.get(bb.readVarUint());
};

export const kiwiDecoder = (schema: Schema): KiwiDecoder => {
  const compiled: unknown = compileSchema(schema);
  if (!isRec(compiled)) throw new Error("kiwi: schema did not compile");
  const definitions = new Map(schema.definitions.map((d) => [d.name, d]));
  const definition = (name: string): Definition => {
    const found = definitions.get(name);
    if (!found) throw new Error(`kiwi: unknown type ${name}`);
    return found;
  };
  const compiledReader = (name: string): ReadValue => {
    const decode = compiled[`decode${name}`];
    if (typeof decode !== "function") throw new Error(`kiwi: decode${name} not compiled`);
    return (bb) => {
      const decoded: unknown = Reflect.apply(decode, compiled, [bb]);
      return decoded;
    };
  };
  const value = (type: string | null): ReadValue => {
    if (type === null) throw new Error("kiwi: field without type");
    const primitive = PRIMITIVES[type];
    if (primitive) return primitive;
    const found = definition(type);
    return found.kind === "ENUM" ? enumReader(found) : compiledReader(type);
  };
  const field = (f: Field): ReadValue => {
    if (!f.isArray) return value(f.type);
    if (f.type === "byte") return (bb) => bb.readByteArray();
    const one = value(f.type);
    return (bb) => Array.from({ length: bb.readVarUint() }, () => one(bb));
  };
  return { definition, value, field };
};
