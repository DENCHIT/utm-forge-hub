import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Join from "./pages/Join";

// Split by route. An audience phone on conference wifi only ever loads /join,
// so the deck builder and the chart library must not be in its download.
const Home = lazy(() => import("./pages/Home"));
const Admin = lazy(() => import("./pages/Admin"));
const Present = lazy(() => import("./pages/Present"));
const Control = lazy(() => import("./pages/Control"));

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
          <Routes>
            {/* Where the QR code lands. Eagerly bundled - it must be instant. */}
            <Route path="/join/:code" element={<Join />} />
            <Route path="/" element={<Home />} />
            <Route path="/events/:eventId" element={<Admin />} />
            {/* The stage screen. */}
            <Route path="/present/:sessionId" element={<Present />} />
            {/* The presenter's remote. */}
            <Route path="/control/:sessionId" element={<Control />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
