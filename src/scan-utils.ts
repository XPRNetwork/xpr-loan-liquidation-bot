export const rotateValues = <T>(values: T[], offset: number): T[] => {
  if (values.length === 0) return [];
  const normalizedOffset = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalizedOffset), ...values.slice(0, normalizedOffset)];
};
