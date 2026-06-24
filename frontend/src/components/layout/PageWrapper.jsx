import { motion } from "framer-motion";
import { clsx } from "clsx";
import Navbar from "./Navbar";
import Footer from "./Footer";
export default function PageWrapper({
  children,
  showNav = true,
  showFooter = true,
  className = "",
  noPadding = false,
}) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {showNav && <Navbar />}
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={clsx(
          "flex-1 min-w-0",
          showNav && "pt-16",
          !noPadding && "px-4 sm:px-6 py-8",
          className,
        )}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </motion.main>
      {showFooter && <Footer />}
    </div>
  );
}
export function AdminLayout({ children, title, subtitle, actions }) {
  return (
    <PageWrapper showFooter={false} noPadding>
      <div className="flex">
        <div className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
          {(title || actions) && (
            <div className="flex items-start justify-between mb-6">
              <div>
                {title && (
                  <h1 className="text-3xl font-semibold text-slate-950">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {actions}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </PageWrapper>
  );
}
