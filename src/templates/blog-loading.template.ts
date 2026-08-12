/**
 * Template for the blog loading fallback component: app/blog/loading.tsx
 * Displays a clean, lightweight loading spinner for instant user feedback during page navigation.
 */
export function getBlogLoadingTemplate(): string {
  return `export default function BlogLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", fontFamily: "sans-serif" }}>
      <div style={{
        width: "36px",
        height: "36px",
        border: "3px solid #e5e7eb",
        borderTopColor: "#f97316",
        borderRadius: "50%",
        animation: "contlify-spin 0.8s linear infinite"
      }} />
      <style>{\`
        @keyframes contlify-spin {
          to { transform: rotate(360deg); }
        }
      \`}</style>
      <p style={{ marginTop: "1rem", color: "#666", fontSize: "0.875rem" }}>Loading articles...</p>
    </div>
  );
}
`;
}
