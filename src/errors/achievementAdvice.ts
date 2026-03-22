export class RateLimitError extends Error {
  constructor(message = "Too many requests") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class InvalidOutputError extends Error {
  constructor(message = "AI output invalid") {
    super(message);
    this.name = "InvalidOutputError";
  }
}
