/** Static builds deliberately use the existing local-storage fallback, without API requests. */
export function cloudFetch(url:string,options?:RequestInit):Promise<Response>{
 if(process.env.NEXT_PUBLIC_STATIC==='true')return Promise.reject(new Error('Local edition: cloud storage unavailable'));
 return fetch(url,options);
}
