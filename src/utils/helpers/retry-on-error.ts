/**
 * Retries a given function multiple times if it throws an error.
 *
 * @param {Function} fn - The function to be executed. This function should return a Promise.
 * @param {number} [maxRetries=20] - The maximum number of retries before giving up. Defaults to 20.
 * @param {number} [retryDelay=250] - The delay in milliseconds between retries. Defaults to 250 ms.
 *
 * @throws {Error} Throws the last error encountered if the maximum number of retries is reached.
 *
 * @returns {Promise<void>} A Promise that resolves if the function succeeds within the maximum retries,
 *                          or rejects with the last error if all retries fail.
 */
export const retryOnError = async (
  fn: () => Promise<void>,
  // ~5 s default budget; the old 100×200ms (20 s) compounded across 7 parallel
  // workers into multi-minute stalls that looked like hangs (#645). Callers
  // that need a longer budget pass their own maxRetries/retryDelay.
  maxRetries: number = 20,
  retryDelay: number = 250,
): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Throw the last error if retries are exhausted
      }

      // Delay before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};
