export function ok(data = {}, message = 'OK') {
  return {
    success: true,
    message,
    data
  };
}

export function fail(message = 'Error', details = undefined) {
  return {
    success: false,
    message,
    details
  };
}
