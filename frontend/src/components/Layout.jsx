import { Outlet, Link, useLocation } from 'react-router-dom';
import { Cpu, History, UploadCloud, Github } from 'lucide-react';
import { cn } from '../utils/cn';

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Upload & Upgrade', path: '/', icon: UploadCloud },
    { name: 'Upgrade History', path: '/history', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <Link to="/" className="text-xl font-bold tracking-tight">
              EVUA <span className="text-sm font-medium text-muted-foreground ml-2">Code Assistant</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-secondary text-primary" 
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>EVUA - AI-Powered Legacy Code Upgrade Assistant</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
