import React from 'react';
import { BookOpenCheck, CircleHelp, Database, Languages, ShieldCheck } from 'lucide-react';

export const SettingsHelpView: React.FC = () => <div>
  <div className="page-header-row"><div><h2 className="page-title">Settings & Help</h2><p className="page-subtitle">Application environment details, interface language, and current capability limits.</p></div></div>
  <div className="settings-grid">
    <div className="card-panel"><Languages size={22}/><h3>Interface language</h3><p>Formal English is the default. Additional content languages can be selected via the brief.</p><select className="form-select" defaultValue="en"><option value="en">English</option><option value="id">Bahasa Indonesia</option></select></div>
    <div className="card-panel"><Database size={22}/><h3>Current storage</h3><p>Data is stored through the Node.js API on PostgreSQL. No sample data is created automatically.</p></div>
    <div className="card-panel"><ShieldCheck size={22}/><h3>Grounding limits</h3><p>No web search. Sources pending approval and outdated sources are never used for generation.</p></div>
    <div className="card-panel"><CircleHelp size={22}/><h3>Help workflow</h3><p>Create a brief, check the RAG Radar, save a version, send it to review, then export without changing the status.</p></div>
  </div>
  <div className="card-panel help-boundary"><BookOpenCheck size={21}/><div><h3>Implementation boundaries</h3><p>Trusted authentication, AI provider, binary file uploads, monitoring, and deployment are not yet enabled.</p></div></div>
</div>;
