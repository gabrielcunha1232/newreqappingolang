interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app">
      <div className="app-body">{children}</div>
    </div>
  );
}
