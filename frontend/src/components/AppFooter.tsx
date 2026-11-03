interface AppFooterProps {
  time: string;
}

export function AppFooter({ time }: AppFooterProps) {
  return (
    <>
      <hr className="footer-divider"/>
      <footer className="footer">
        <span className="footer-version"><span>v3.0.0</span></span>
        <span className="footer-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>{time}</span>
        </span>
        <a className="footer-docs" data-wml-openURL="https://v3.wails.io" aria-label="Wails documentation">Docs
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        </a>
      </footer>
    </>
  );
}
