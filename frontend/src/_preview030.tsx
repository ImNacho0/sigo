import { createRoot } from 'react-dom/client';
import { M030Doc, EXAMPLE_FULL } from './components/Modelo030';

const el = document.getElementById('root')!;
createRoot(el).render(
    <div style={{ width: 720, background: '#888', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <M030Doc form={EXAMPLE_FULL} />
    </div>
);
