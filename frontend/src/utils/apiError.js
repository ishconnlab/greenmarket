export function apiErrorMessage(error, fallback) {
  if (error.response?.data?.msg) {
    return error.response.data.msg;
  }
  if (error.code === "ERR_NETWORK" || (error.request && !error.response)) {
    return "The store service could not be reached. Check that the API is running, then try again.";
  }
  return error.message || fallback;
}
