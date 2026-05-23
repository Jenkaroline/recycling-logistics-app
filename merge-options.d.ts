declare module "merge-options" {
  type MergeOptions = (...args: unknown[]) => unknown;

  const mergeOptions: MergeOptions;

  export default mergeOptions;
}