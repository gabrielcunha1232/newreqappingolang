interface RequestErrorProps {
  message: string;
}

export function RequestError({ message }: RequestErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="request-error" role="alert">
      <span aria-hidden="true">⚠</span>
      {message}
    </div>
  );
}
