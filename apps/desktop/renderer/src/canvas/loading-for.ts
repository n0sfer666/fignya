export const loadingFor = (visibility: "hidden" | "visible"): "eager" | "lazy" => (visibility === "hidden" ? "eager" : "lazy");
