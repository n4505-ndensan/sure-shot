export const generateId = (): string => {
  return `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
