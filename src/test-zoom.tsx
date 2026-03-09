import React from 'react';
import { createRoot } from 'react-dom/client';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const App = () => (
    <div style={{ width: '500px', height: '500px', border: '1px solid black' }}>
        <TransformWrapper
            minScale={0.1}
            initialScale={1}
            centerZoomedOut={true}
        >
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div style={{ width: '500px', height: '800px', background: 'red' }}>
                    Test
                </div>
            </TransformComponent>
        </TransformWrapper>
    </div>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);
