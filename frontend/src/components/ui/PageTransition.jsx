/**
 * Lightweight page-enter animation. Wrap each page's root content in this
 * so navigating between routes gets a subtle fade/slide instead of an
 * abrupt swap — no router-transition library needed.
 */
export default function PageTransition({ children, className = '' }) {
  return <div className={`page-transition ${className}`}>{children}</div>
}
