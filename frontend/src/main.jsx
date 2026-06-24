import React from"react";import ReactDOM from"react-dom/client";
import{BrowserRouter}from"react-router-dom";import{QueryClient,QueryClientProvider}from"@tanstack/react-query";
import{Toaster}from"react-hot-toast";import App from"./App";import"./styles/global.css";
const qc=new QueryClient({defaultOptions:{queries:{retry:2,staleTime:30000,refetchOnWindowFocus:false}}});
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App/>
        <Toaster position="top-right" toastOptions={{duration:4000,style:{background:"#ffffff",color:"#111827",border:"1px solid #dbe3ef",borderRadius:"10px",fontFamily:"Inter, system-ui, sans-serif",boxShadow:"0 12px 30px rgba(15,23,42,.12)"},success:{style:{borderLeft:"4px solid #15803d"}},error:{style:{borderLeft:"4px solid #dc2626"}},loading:{style:{borderLeft:"4px solid #2563eb"}}}}/>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
