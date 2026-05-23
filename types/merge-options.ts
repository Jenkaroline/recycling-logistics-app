export default function mergeOptions(...options: unknown[]): unknown {
  return options.length > 0 ? options[0] : {};
}