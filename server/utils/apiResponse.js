export const ok = (data, meta) => ({ success: true, data, ...(meta && { meta }) });
export const fail = (message, details) => ({ success: false, error: { message, details } });
