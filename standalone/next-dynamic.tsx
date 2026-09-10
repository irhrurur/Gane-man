import { Suspense, lazy } from "react";

// Drop-in replacement for next/dynamic used only by the single-file
// offline build (scripts/build-standalone.mjs). esbuild inlines the
// dynamically imported module, so React.lazy + Suspense is enough.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>;

export default function dynamic(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<{ default: AnyComponent }>,
  opts?: { loading?: () => React.ReactNode; ssr?: boolean },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
  void opts?.ssr;
  const C = lazy(loader);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function StandaloneDynamic(props: any) {
    return (
      <Suspense fallback={opts?.loading ? opts.loading() : null}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <C {...(props as any)} />
      </Suspense>
    );
  };
}
