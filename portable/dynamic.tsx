import { lazy, Suspense, type ComponentType } from 'react';
// Browser-only replacement for Next's SSR wrapper, using the same game component.
export default function dynamic<P extends object>(loader:()=>Promise<{default:ComponentType<P>}>,options:{ssr?:boolean;loading?:ComponentType}){
 const Component=lazy(loader);const Loading=options.loading;
 return function BrowserComponent(props:P){return <Suspense fallback={Loading?<Loading/>:null}><Component {...props}/></Suspense>;};
}
