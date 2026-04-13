import { Code, Box, Layers, Terminal, Database } from 'lucide-react';

const icons = {
  language: Code,
  'frontend-framework': Layers,
  'backend-framework': Database,
  'build-tool': Terminal,
  default: Box
};

const TechDetection = ({ technologies, title }) => {
  if (!technologies || technologies.length === 0) {
    return (
      <div className="glass rounded-xl p-8 border border-white/5 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4">
          <Code className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Awaiting Analysis</h3>
        <p className="text-sm text-muted-foreground">Start the pipeline to detect technologies.</p>
      </div>
    );
  }

  // Group by category
  const grouped = technologies.reduce((acc, tech) => {
    if (!acc[tech.category]) acc[tech.category] = [];
    acc[tech.category].push(tech);
    return acc;
  }, {});

  return (
    <div className="glass rounded-xl border border-white/5 h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">Languages and frameworks identified</p>
      </div>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => {
             const Icon = icons[category] || icons.default;
             return (
               <div key={category}>
                 <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    {category.replace('-', ' ')}
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                   {items.map((item, idx) => (
                     <div key={idx} className="bg-secondary/40 rounded-lg p-3 border border-border/50 flex flex-col justify-between">
                       <span className="font-semibold text-foreground text-sm">{item.name}</span>
                       {item.current_version && (
                         <span className="text-xs text-muted-foreground mt-1 font-mono">v{item.current_version}</span>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
};

export default TechDetection;
