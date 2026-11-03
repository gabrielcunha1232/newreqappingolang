interface RequestErrorProps {
  message: string;
}

export function RequestError({ message }: RequestErrorProps) {
  if (!message) {
    return null;
  }

  return <p className="request-error" role="alert">{message}</p>;
}
