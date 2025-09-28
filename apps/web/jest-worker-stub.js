// Jest Worker No-Op Stub
// This completely replaces jest-worker to prevent errors

class ChildProcessWorker {
  constructor() {
    this.stderr = { pipe: () => {} };
    this.stdout = { pipe: () => {} };
  }
  
  initialize() {
    return Promise.resolve();
  }
  
  send() {
    return Promise.resolve();
  }
  
  getStderr() {
    return Promise.resolve();
  }
  
  getStdout() {
    return Promise.resolve();
  }
  
  end() {
    return Promise.resolve();
  }
  
  kill() {
    return Promise.resolve();
  }
  
  _onExit() {
    // No-op
  }
}

class ThreadsWorker extends ChildProcessWorker {}

module.exports = {
  ChildProcessWorker,
  ThreadsWorker,
  Worker: ChildProcessWorker
};