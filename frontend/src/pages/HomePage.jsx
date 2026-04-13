import FileUpload from '../components/FileUpload';

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 max-w-5xl mx-auto space-y-16">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 animate-slide-up">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Modernize Legacy Code <br />
          <span className="text-gradient">Intelligently</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          EVUA is an AI-powered assistant that scans, analyzes, and safely upgrades your outdated codebases to modern standards while preserving functionality.
        </p>
      </div>

      {/* Upload Component */}
      <div className="w-full animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <FileUpload />
      </div>

      {/* Features grid */}
      <div className="grid md:grid-cols-3 gap-6 w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <FeatureCard 
          title="Intelligent Analysis" 
          desc="Detects legacy frameworks, outdated libraries, and anti-patterns instantly."
          icon="🔍"
        />
        <FeatureCard 
          title="Safe Transformations" 
          desc="Applies AI-powered and rule-based refactoring without breaking functionality."
          icon="🛡️"
        />
        <FeatureCard 
          title="Interactive Diffs" 
          desc="Review every single line of changed code before downloading your upgraded project."
          icon="👀"
        />
      </div>
    </div>
  );
};

function FeatureCard({ title, desc, icon }) {
  return (
    <div className="glass p-6 rounded-xl flex flex-col items-start space-y-3">
      <div className="text-3xl bg-secondary/50 p-3 rounded-lg">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

export default HomePage;
