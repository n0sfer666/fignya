import { str, type Rec } from "../fig/guards";

export const withCharacters = (textData: Rec | undefined): Rec | undefined =>
  textData && str(textData, "characters") !== undefined ? textData : undefined;
