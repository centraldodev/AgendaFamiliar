// Mock for expo-task-manager
export const defineTask = jest.fn();
export const isTaskDefined = jest.fn().mockReturnValue(false);
export const isTaskRegisteredAsync = jest.fn().mockResolvedValue(false);
export const unregisterTaskAsync = jest.fn().mockResolvedValue(undefined);
