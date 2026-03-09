import React from 'react';
import { createRoot } from 'react-dom/client';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const App = () => (
    <div style={{ width: '500px', height: '500px', border: '1px solid black', position: 'relative' }}>
        <TransformWrapper
            minScale={0.1}
            initialScale={1}
            centerZoomedOut={true}
            limitToBounds={false}
        >
            {({ zoomIn, zoomOut, setTransform, state }) => (
                <React.Fragment>
                    <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 100 }}>
                        {state.positionX}, {state.positionY}, {state.scale}
                    </div>
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                        <div style={{ width: '250px', height: '400px', background: 'rgba(255,0,0,0.5)' }}>
                            Test
                        </div>
                    </TransformComponent>
                </React.Fragment>
            )}
        </TransformWrapper>
    </div>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);
