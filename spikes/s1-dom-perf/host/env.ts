export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env is required`);
  return value;
};
