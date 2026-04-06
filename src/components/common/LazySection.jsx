import { useNearScreen } from "../../hooks/useNearScreen";

function LazySection({
  children,
  fallback,
  minHeight = 320,
  rootMargin = "320px",
  className = "",
}) {
  const { ref, isNearScreen } = useNearScreen({ rootMargin, triggerOnce: true });

  return (
    <div ref={ref} className={className} style={isNearScreen ? undefined : { minHeight }}>
      {isNearScreen ? children : fallback}
    </div>
  );
}

export default LazySection;
