const API_BASE_URL=`${import.meta.env.VITE_API_BASE_URL??"http://127.0.0.1:8000"}/api`;

interface ApiOptions extends RequestInit{
  token?:string;
  retry?:boolean;
}

let refreshPromise:Promise<string>|null=null;

// Fires after any successful refresh (reactive 401-triggered or proactive),
// so a session-lifetime scheduler can reschedule itself against the new
// token's expiry. Set via onTokenRefreshed() — kept as a plain callback
// (not an import) so this file never has to import the scheduler.
let onTokenRefreshed:(()=>void)|null=null;
export function setOnTokenRefreshed(cb:(()=>void)|null){
  onTokenRefreshed=cb;
}

async function refreshAccessToken():Promise<string>{
  const refresh=localStorage.getItem("refresh_token");
  if(!refresh)throw new Error("No refresh token available");

  const response=await fetch(`${API_BASE_URL}/users/refresh/`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({refresh})
  });

  const data=await response.json().catch(()=>null);

  if(!response.ok||!data?.access){
    throw new Error(data?.detail||"Token refresh failed");
  }

  localStorage.setItem("access_token",data.access);

  if(data.refresh){
    localStorage.setItem("refresh_token",data.refresh);
  }

  return data.access;
}

// Deduped: whether triggered by a 401 retry or the proactive scheduler,
// concurrent callers share the same in-flight refresh instead of firing
// multiple simultaneous requests to /users/refresh/.
export function getRefreshedAccessToken():Promise<string>{
  if(!refreshPromise){
    refreshPromise=refreshAccessToken()
      .then(token=>{
        onTokenRefreshed?.();
        return token;
      })
      .finally(()=>{
        refreshPromise=null;
      });
  }
  return refreshPromise;
}

export function clearAuth(){
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export async function apiRequest<T>(endpoint:string,options:ApiOptions={}):Promise<T>{
  const{token,headers,retry=false,...fetchOptions}=options;

  const response=await fetch(`${API_BASE_URL}${endpoint}`,{
    ...fetchOptions,
    headers:{
      "Content-Type":"application/json",
      ...(token?{Authorization:`Bearer ${token}`}:{ }),
      ...headers
    }
  });

  if(response.status===401&&token&&!retry){
    try{
      const newToken=await getRefreshedAccessToken();

      return apiRequest<T>(endpoint,{
        ...options,
        token:newToken,
        retry:true
      });
    }catch(error){
      clearAuth();
      window.location.href="/";
      throw error;
    }
  }

  const data=await response.json().catch(()=>null);

  if(!response.ok){
    throw new Error(data?.error||data?.detail||"Something went wrong.");
  }

  return data;
}