let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

export function getIo() {
  return ioInstance;
}

export function emitSocket(event, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(event, payload);
}
